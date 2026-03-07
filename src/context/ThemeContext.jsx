import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
    const [darkMode, setDarkMode] = useState(() =>
        localStorage.getItem('darkMode') === 'true'
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    return (
        <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode: () => setDarkMode(v => !v) }}>
            {children}
        </ThemeContext.Provider>
    );
}
