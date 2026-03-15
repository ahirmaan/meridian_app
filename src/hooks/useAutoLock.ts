import { useEffect, useRef } from 'react';
import { AutoLockTimer } from '../lib/settingsStore';

export function useAutoLock(timer: AutoLockTimer, onLock: () => void) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const getTimerMs = (val: AutoLockTimer) => {
        switch (val) {
            case '1m': return 60 * 1000;
            case '5m': return 5 * 60 * 1000;
            case '15m': return 15 * 60 * 1000;
            default: return null;
        }
    };

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const ms = getTimerMs(timer);
        if (!ms) return;

        timeoutRef.current = setTimeout(() => {
            onLock();
        }, ms);
    };

    useEffect(() => {
        if (timer === 'Off') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [timer]);
}
