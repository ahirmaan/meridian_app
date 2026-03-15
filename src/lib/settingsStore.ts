import { useState, useEffect } from 'react';

export type StreamingSpeed = 'Normal' | 'Fast' | 'Instant';
export type AutoLockTimer = 'Off' | '1m' | '5m' | '15m';

export interface AppSettings {
    particleDensity: number;
    motionSensitivity: number;
    particleColor: string;
    particleSpeed: number;
    particleSize: number;
    glassmorphismEnabled: boolean;
    globalPersona: string;
    streamingSpeed: StreamingSpeed;
    autoLockTimer: AutoLockTimer;
    accentColor: string;
    fontSize: 'Small' | 'Medium' | 'Large';
}

const DEFAULT_SETTINGS: AppSettings = {
    particleDensity: 1.0,
    motionSensitivity: 20,
    particleColor: '#ffffff',
    particleSpeed: 1.0,
    particleSize: 1.0,
    glassmorphismEnabled: true,
    globalPersona: '',
    streamingSpeed: 'Normal',
    autoLockTimer: 'Off',
    accentColor: '#3b82f6', // Cyber Blue
    fontSize: 'Medium',
};

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(() => {
        if (typeof window === 'undefined') return DEFAULT_SETTINGS;
        const stored = localStorage.getItem('meridian_settings');
        if (!stored) return DEFAULT_SETTINGS;
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        localStorage.setItem('meridian_settings', JSON.stringify(settings));

        // Apply visual settings globally
        if (settings.glassmorphismEnabled) {
            document.body.classList.remove('no-glass');
        } else {
            document.body.classList.add('no-glass');
        }

        // Apply accent color as a CSS variable
        document.documentElement.style.setProperty('--accent', settings.accentColor);

        // Apply font size class to body
        document.body.classList.remove('text-small', 'text-medium', 'text-large');
        document.body.classList.add(`text-${settings.fontSize.toLowerCase()}`);
    }, [settings]);

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    return { settings, updateSettings };
}
