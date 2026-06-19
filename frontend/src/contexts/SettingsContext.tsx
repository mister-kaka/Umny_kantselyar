import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getInterfaceSettings } from '../services/api';
import { InterfaceSettings } from '../types';

interface SettingsContextValue {
    compactView: boolean;
    showConfidence: boolean;
    defaultPageLimit: number;
    theme: 'light' | 'dark';
    setCompactView: (value: boolean) => void;
    setShowConfidence: (value: boolean) => void;
    setDefaultPageLimit: (value: number) => void;
    setTheme: (value: 'light' | 'dark') => void;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
};

const savedTheme = (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';

if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [compactView, setCompactView] = useState(false);
    const [showConfidence, setShowConfidence] = useState(true);
    const [defaultPageLimit, setDefaultPageLimit] = useState(10);
    const [theme, setTheme] = useState<'light' | 'dark'>(savedTheme);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await getInterfaceSettings();
                setCompactView(settings.compactView);
                setShowConfidence(settings.showConfidence);
                setDefaultPageLimit(settings.defaultPageLimit);
                setTheme(settings.theme);
                localStorage.setItem('app_theme', settings.theme);
                document.documentElement.setAttribute('data-theme', settings.theme);
                if (settings.compactView) {
                    document.documentElement.classList.add('compact-view');
                } else {
                    document.documentElement.classList.remove('compact-view');
                }
            } catch {
                // use defaults
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSetCompactView = useCallback((value: boolean) => {
        setCompactView(value);
        if (value) {
            document.documentElement.classList.add('compact-view');
        } else {
            document.documentElement.classList.remove('compact-view');
        }
    }, []);

    const handleSetTheme = useCallback((value: 'light' | 'dark') => {
        setTheme(value);
        localStorage.setItem('app_theme', value);
        document.documentElement.setAttribute('data-theme', value);
    }, []);

    return (
        <SettingsContext.Provider
            value={{
                compactView,
                showConfidence,
                defaultPageLimit,
                theme,
                setCompactView: handleSetCompactView,
                setShowConfidence,
                setDefaultPageLimit,
                setTheme: handleSetTheme,
                loading,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export default SettingsContext;