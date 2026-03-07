export const VALID_COURSES = [];

for (let grado = 1; grado <= 6; grado++) {
    ['A', 'B'].forEach((sec) => {
        VALID_COURSES.push({
            id: `${grado}${sec}-TM`,
            grado,
            seccion: sec,
            turno: 'Mañana',
            label: `${grado}° "${sec}" - Turno Mañana`,
            tipo: grado <= 3 ? 'Conceptual' : 'Numérica'
        });
    });
    ['C', 'D'].forEach((sec) => {
        VALID_COURSES.push({
            id: `${grado}${sec}-TT`,
            grado,
            seccion: sec,
            turno: 'Tarde',
            label: `${grado}° "${sec}" - Turno Tarde`,
            tipo: grado <= 3 ? 'Conceptual' : 'Numérica'
        });
    });
}

export const getCourseLabel = (courseId) => {
    const course = VALID_COURSES.find(c => c.id === courseId);
    return course ? course.label : courseId;
};

export const getCourseDetails = (courseId) => {
    return VALID_COURSES.find(c => c.id === courseId);
};
