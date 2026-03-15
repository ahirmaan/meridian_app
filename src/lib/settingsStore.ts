import { useState, useEffect } from 'react';

export type StreamingSpeed = 'Normal' | 'Fast' | 'Instant';
export type AutoLockTimer = 'Off' | '1m' | '5m' | '15m';

export interface AppSettings {
    particleDensity: number;
    motionSensitivity: number;
    glassmorphismEnabled: boolean;
    globalPersona: string;
    streamingSpeed: StreamingSpeed;
    autoLockTimer: AutoLockTimer;
}

const DEFAULT_SETTINGS: AppSettings = {
    particleDensity: 1.0,
    motionSensitivity: 20,
    glassmorphismEnabled: true,
    globalPersona: '',
    streamingSpeed: 'Normal',
    autoLockTimer: 'Off',
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
    }, [settings]);

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    return { settings, updateSettings };
}
