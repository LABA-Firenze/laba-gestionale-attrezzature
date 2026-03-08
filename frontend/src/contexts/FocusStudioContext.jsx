import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'focus_studio';
const STATS_KEY = 'focus_studio_stats';

const defaultSubjects = [
  { id: 'computer_graphic', name: 'Computer Graphic', emoji: '💻' },
  { id: 'storia_arte', name: 'Storia dell\'arte', emoji: '🎨' },
  { id: 'graphic_design', name: 'Graphic Design', emoji: '✏️' },
  { id: 'fotografia', name: 'Fotografia Digitale', emoji: '📸' },
  { id: 'video', name: 'Video / Audiovisivi', emoji: '🎬' },
  { id: 'altro', name: 'Altro', emoji: '📚' }
];

const DURATION_PRESETS = [
  { id: 'veloce', label: 'Sessione veloce', minutes: 15 },
  { id: 'focus', label: 'Sessione focus', minutes: 25 },
  { id: 'profonda', label: 'Sessione profonda', minutes: 45 },
  { id: 'lunga', label: 'Sessione lunga', minutes: 60 }
];

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const loadStats = () => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { sessionsToday: 0, totalMinutesToday: 0, streak: 0, lastSessionDate: null, subjectHistory: {} };
    return JSON.parse(raw);
  } catch {
    return { sessionsToday: 0, totalMinutesToday: 0, streak: 0, lastSessionDate: null, subjectHistory: {} };
  }
};

const saveStats = (stats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('FocusStudio: cannot save stats', e);
  }
};

const FocusStudioContext = createContext(null);

export function FocusStudioProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState(loadStats);
  const [tick, setTick] = useState(0);

  // Load persisted session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.endAt) return;
      const end = new Date(data.endAt).getTime();
      if (end <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setActiveSession({
        subject: data.subject,
        subjectName: data.subjectName,
        subjectEmoji: data.subjectEmoji,
        totalSeconds: data.totalSeconds
      });
      setIsPaused(!!data.isPaused);
      setRemainingSeconds(data.isPaused ? data.pausedRemainingSeconds : Math.floor((end - Date.now()) / 1000));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Timer tick - runs every second, keeps running when user navigates away
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [!!activeSession]);

  // Compute remaining from persisted endAt (so it stays correct when navigating)
  useEffect(() => {
    if (!activeSession) {
      setRemainingSeconds(null);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.isPaused) {
        setRemainingSeconds(data.pausedRemainingSeconds);
        return;
      }
      const end = new Date(data.endAt).getTime();
      const rem = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemainingSeconds(rem);
    } catch {
      setActiveSession(null);
      setRemainingSeconds(null);
      setIsPaused(false);
    }
  }, [tick, activeSession]);

  const completeSession = useCallback((data) => {
    const stats = loadStats();
    const today = getTodayKey();
    if (stats.lastSessionDate !== today) {
      stats.sessionsToday = 0;
      stats.totalMinutesToday = 0;
      if (stats.lastSessionDate) {
        const last = new Date(stats.lastSessionDate);
        const yester = new Date(today);
        yester.setDate(yester.getDate() - 1);
        stats.streak = last.toISOString().slice(0, 10) === yester.toISOString().slice(0, 10)
          ? (stats.streak || 0) + 1 : 1;
      } else {
        stats.streak = 1;
      }
    }
    stats.sessionsToday = (stats.sessionsToday || 0) + 1;
    const mins = Math.round((data.totalSeconds || 0) / 60);
    stats.totalMinutesToday = (stats.totalMinutesToday || 0) + mins;
    stats.lastSessionDate = today;
    if (!stats.subjectHistory) stats.subjectHistory = {};
    const sub = data.subjectName || data.subject || 'Altro';
    stats.subjectHistory[sub] = today;
    saveStats(stats);
    setStats(stats);
    setActiveSession(null);
    setRemainingSeconds(null);
    setIsPaused(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const startSession = useCallback((subject, totalSeconds) => {
    const endAt = new Date(Date.now() + totalSeconds * 1000);
    const session = {
      subject,
      subjectName: subject?.name || subject,
      subjectEmoji: subject?.emoji || '📚',
      totalSeconds
    };
    setActiveSession(session);
    setRemainingSeconds(totalSeconds);
    setIsPaused(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...session,
        endAt: endAt.toISOString(),
        isPaused: false,
        pausedRemainingSeconds: null
      }));
    } catch (e) {
      console.error('FocusStudio: cannot persist session', e);
    }
  }, []);

  const pauseSession = useCallback(() => {
    if (!activeSession || remainingSeconds == null) return;
    setIsPaused(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        isPaused: true,
        pausedRemainingSeconds: remainingSeconds
      }));
    } catch (e) {
      console.error('FocusStudio: cannot pause', e);
    }
  }, [activeSession, remainingSeconds]);

  const resumeSession = useCallback(() => {
    if (!activeSession || remainingSeconds == null) return;
    const endAt = new Date(Date.now() + remainingSeconds * 1000);
    setIsPaused(false);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        isPaused: false,
        pausedRemainingSeconds: null,
        endAt: endAt.toISOString()
      }));
    } catch (e) {
      console.error('FocusStudio: cannot resume', e);
    }
  }, [activeSession, remainingSeconds]);

  const addMinutes = useCallback((mins) => {
    if (!activeSession) return;
    const newRem = Math.min(99 * 60, (remainingSeconds || 0) + mins * 60);
    const endAt = new Date(Date.now() + newRem * 1000);
    setRemainingSeconds(newRem);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        isPaused: false,
        pausedRemainingSeconds: null,
        endAt: endAt.toISOString(),
        totalSeconds: data.totalSeconds + mins * 60
      }));
    } catch (e) {
      console.error('FocusStudio: cannot add minutes', e);
    }
  }, [activeSession, remainingSeconds]);

  const endSession = useCallback(() => {
    setActiveSession(null);
    setRemainingSeconds(null);
    setIsPaused(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshStats = useCallback(() => {
    const today = getTodayKey();
    const s = loadStats();
    if (s.lastSessionDate !== today) {
      s.sessionsToday = 0;
      s.totalMinutesToday = 0;
    }
    setStats(s);
  }, []);

  const value = {
    activeSession,
    remainingSeconds,
    isPaused,
    stats,
    subjects: defaultSubjects,
    durationPresets: DURATION_PRESETS,
    startSession,
    pauseSession,
    resumeSession,
    addMinutes,
    endSession,
    completeSession,
    refreshStats
  };

  return (
    <FocusStudioContext.Provider value={value}>
      {children}
    </FocusStudioContext.Provider>
  );
}

export function useFocusStudio() {
  const ctx = useContext(FocusStudioContext);
  if (!ctx) throw new Error('useFocusStudio must be used within FocusStudioProvider');
  return ctx;
}
