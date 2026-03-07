const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const db = getFirestore();
const messaging = getMessaging();

// ── Configurable via: firebase functions:config:set email.user=... email.pass=...
// Or via Secret Manager parameters (recommended for production)
const EMAIL_USER = defineString("EMAIL_USER", { default: "" });
const EMAIL_PASS = defineString("EMAIL_PASS", { default: "" });

/**
 * Creates a nodemailer transport using Gmail.
 * The Gmail account must have 2FA enabled and use an App Password.
 */
function getTransport() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL_USER.value(),
            pass: EMAIL_PASS.value(),
        },
    });
}

/**
 * Resolve FCM tokens and email addresses for a given audiencia string.
 */
async function resolveRecipients(audiencia) {
    const tokens = [];
    const emails = [];

    const addFromSnap = (snap) => {
        snap.forEach((d) => {
            const data = d.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
            if (data.email) emails.push(data.email);
        });
    };

    if (audiencia === "familias") {
        const snap = await db.collection("docentes").where("roles", "array-contains", "familia").get();
        addFromSnap(snap);
    } else if (audiencia === "docentes") {
        const snap = await db.collection("docentes")
            .where("roles", "array-contains-any", ["docente", "docente_area", "equipo_conduccion", "administrador"])
            .get();
        addFromSnap(snap);
    } else if (audiencia === "todos") {
        const snap = await db.collection("docentes").get();
        addFromSnap(snap);
    } else if (audiencia.startsWith("curso:")) {
        const cursoId = audiencia.split("curso:")[1];
        const estudiantesSnap = await db.collection("estudiantes").where("cursoId", "==", cursoId).get();
        const famUids = new Set();
        estudiantesSnap.forEach((d) => {
            const fam = d.data().famUid || d.data().famFiliacion?.uid;
            if (fam) famUids.add(fam);
        });
        for (const uid of famUids) {
            const famDoc = await db.collection("docentes").doc(uid).get();
            if (famDoc.exists) {
                const data = famDoc.data();
                if (data.fcmToken) tokens.push(data.fcmToken);
                if (data.email) emails.push(data.email);
            }
        }
    } else if (audiencia.startsWith("usuario:")) {
        const uid = audiencia.split("usuario:")[1];
        const userDoc = await db.collection("docentes").doc(uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
            if (data.email) emails.push(data.email);
        }
    }

    return { tokens, emails };
}

/**
 * Send FCM push notifications to a list of tokens.
 */
async function sendPush(tokens, titulo, cuerpo, mensajeId, enviadoPorNombre) {
    if (!tokens.length) return;
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const response = await messaging.sendEachForMulticast({
            tokens: batch,
            notification: { title: titulo || "Nueva notificación", body: cuerpo ? cuerpo.substring(0, 120) : "" },
            data: { mensajeId: mensajeId || "", enviador: enviadoPorNombre || "" },
            webpush: {
                notification: { icon: "https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg", requireInteraction: false },
                fcmOptions: { link: "/mensajeria" },
            },
            android: { notification: { channelId: "ep6-notifications", priority: "high" } },
            apns: { payload: { aps: { sound: "default", badge: 1 } } },
        });
        logger.info(`Push: ${response.successCount} ok, ${response.failureCount} err`);

        // Clean invalid tokens
        const invalid = [];
        response.responses.forEach((r, idx) => {
            if (!r.success) {
                const code = r.error?.code || "";
                if (code.includes("invalid") || code.includes("not-registered")) invalid.push(batch[idx]);
            }
        });
        if (invalid.length) {
            const toClean = await db.collection("docentes").where("fcmToken", "in", invalid.slice(0, 10)).get();
            await Promise.all(toClean.docs.map((d) => d.ref.update({ fcmToken: null })));
        }
    }
}

/**
 * Send emails to a list of addresses.
 */
async function sendEmails(emails, titulo, cuerpo, enviadoPorNombre) {
    if (!emails.length || !EMAIL_USER.value()) {
        logger.info("Email skip: no addresses or no EMAIL_USER configured.");
        return;
    }
    const transport = getTransport();
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f7f9fc;">
      <div style="background: #044b7f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">EP N°6 – Rafael Obligado</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Notificación institucional</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <h3 style="color: #1d2b36; margin: 0 0 12px;">${titulo}</h3>
        <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">${cuerpo.replace(/\n/g, "<br>")}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Enviado por <strong>${enviadoPorNombre}</strong> vía el Sistema de Comunicación Escolar.
        </p>
      </div>
    </div>`;

    // Send in batches of 50 BCC to protect privacy
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        try {
            await transport.sendMail({
                from: `"EP N°6 – Rafael Obligado" <${EMAIL_USER.value()}>`,
                bcc: batch.join(","),
                subject: `[EP N°6] ${titulo}`,
                html: htmlBody,
            });
            logger.info(`Emails sent: ${batch.length} recipients`);
        } catch (err) {
            logger.error("Email send error:", err.message);
        }
    }
}

// ───────────────────────────────────────────────────────────────
//  Trigger 1: Fires when a new message is created (estado = enviado)
// ───────────────────────────────────────────────────────────────
exports.enviarNotificacionMensaje = onDocumentCreated(
    "mensajes/{mensajeId}",
    async (event) => {
        const msg = event.data.data();
        if (!msg || msg.estado !== "enviado") {
            logger.info("Mensaje programado o inválido, skipping push trigger.");
            return;
        }
        const { titulo, cuerpo, audiencia, enviadoPorNombre, enviarEmail } = msg;
        const { tokens, emails } = await resolveRecipients(audiencia);
        await sendPush(tokens, titulo, cuerpo, event.params.mensajeId, enviadoPorNombre);
        if (enviarEmail) await sendEmails(emails, titulo, cuerpo, enviadoPorNombre);
    }
);

// ───────────────────────────────────────────────────────────────
//  Trigger 2: Scheduled — runs every minute, processes due messages
// ───────────────────────────────────────────────────────────────
exports.procesarMensajesProgramados = onSchedule("every 1 minutes", async () => {
    const now = Timestamp.now();
    const snap = await db.collection("mensajes")
        .where("estado", "==", "programado")
        .where("fechaProgramada", "<=", now)
        .get();

    if (snap.empty) return;
    logger.info(`Procesando ${snap.size} mensajes programados...`);

    const batch = db.batch();
    const tasks = [];

    for (const docSnap of snap.docs) {
        const msg = docSnap.data();
        // Mark as sent first
        batch.update(docSnap.ref, {
            estado: "enviado",
            fechaEnvio: Timestamp.now(),
        });
        // Then deliver
        tasks.push(async () => {
            const { tokens, emails } = await resolveRecipients(msg.audiencia);
            await sendPush(tokens, msg.titulo, msg.cuerpo, docSnap.id, msg.enviadoPorNombre);
            if (msg.enviarEmail) await sendEmails(emails, msg.titulo, msg.cuerpo, msg.enviadoPorNombre);
        });
    }

    await batch.commit();
    await Promise.all(tasks.map((t) => t()));
    logger.info(`✓ ${snap.size} mensajes programados entregados.`);
});
