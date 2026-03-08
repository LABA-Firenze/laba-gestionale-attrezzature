import React, { useState, useEffect } from 'react';
import {
  PlayIcon, PauseIcon, StopIcon, PlusIcon, ArrowLeftIcon,
  AcademicCapIcon, ClockIcon, FireIcon
} from '@heroicons/react/24/outline';
import PageHeader from './PageHeader';
import { useFocusStudio } from '../contexts/FocusStudioContext';

const STEP_LANDING = 'landing';
const STEP_SUBJECT = 'subject';
const STEP_DURATION = 'duration';
const STEP_COUNTDOWN = 'countdown';
const STEP_TIMER = 'timer';
const STEP_DONE = 'done';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getLastStudiedText(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Ultimo studio: oggi';
  if (diff === 1) return 'Ultimo studio: ieri';
  if (diff < 7) return `Ultimo studio: ${diff} giorni fa`;
  return `Ultimo studio: ${dateStr}`;
}

export default function FocusStudio() {
  const {
    activeSession,
    remainingSeconds,
    isPaused,
    stats,
    subjects,
    durationPresets,
    startSession,
    pauseSession,
    resumeSession,
    addMinutes,
    endSession,
    completeSession,
    refreshStats
  } = useFocusStudio();

  const [step, setStep] = useState(STEP_LANDING);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [completedSessionData, setCompletedSessionData] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // When returning to Focus Studio with active session, show timer directly
  useEffect(() => {
    if (activeSession && remainingSeconds != null && remainingSeconds > 0 && step === STEP_LANDING) {
      setStep(STEP_TIMER);
    }
  }, [activeSession, remainingSeconds, step]);

  // Auto-complete when timer hits 0
  useEffect(() => {
    if (remainingSeconds === 0 && activeSession && step === STEP_TIMER) {
      const data = {
        subject: activeSession.subject,
        subjectName: activeSession.subjectName,
        totalSeconds: activeSession.totalSeconds
      };
      setCompletedSessionData(data);
      completeSession(data);
      setStep(STEP_DONE);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [remainingSeconds, activeSession, step, completeSession]);

  const handleStartNew = () => {
    setSelectedSubject(null);
    setSelectedDuration(null);
    setStep(STEP_SUBJECT);
  };

  const handleSelectSubject = (s) => {
    setSelectedSubject(s);
    setStep(STEP_DURATION);
  };

  const handleSelectDuration = (d) => {
    setSelectedDuration(d);
    setStep(STEP_COUNTDOWN);
    setCountdown(3);
  };

  useEffect(() => {
    if (step !== STEP_COUNTDOWN || countdown == null) return;
    if (countdown <= 0) {
      startSession(selectedSubject, selectedDuration.minutes * 60);
      setStep(STEP_TIMER);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown, selectedSubject, selectedDuration, startSession]);

  const handleResume = () => {
    setStep(STEP_TIMER);
  };

  const handlePause = () => {
    if (isPaused) resumeSession();
    else pauseSession();
  };

  const handleEnd = () => {
    if (confirm('Terminare la sessione? Il tempo non verrà conteggiato.')) {
      endSession();
      setStep(STEP_LANDING);
    }
  };

  const handleDoneClose = () => {
    setStep(STEP_LANDING);
    setCompletedSessionData(null);
  };

  const todayStats = stats?.lastSessionDate === new Date().toISOString().slice(0, 10)
    ? { sessions: stats.sessionsToday || 0, minutes: stats.totalMinutesToday || 0 }
    : { sessions: 0, minutes: 0 };

  const streak = stats?.streak || 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Focus LABA"
        subtitle="Scegli una materia e concentrati. Timer intelligente e statistiche."
      />

      {/* STEP: Done / Celebration */}
      {step === STEP_DONE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            {showCelebration && (
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
            )}
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sessione completata!</h2>
            <p className="text-gray-600 mb-6">
              +{Math.round((completedSessionData?.totalSeconds || 0) / 60)} min {completedSessionData?.subjectName || ''}
            </p>
            <button
              onClick={handleDoneClose}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* STEP: Countdown 3-2-1 */}
      {step === STEP_COUNTDOWN && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <p className="text-gray-500 mb-4 text-lg">Preparati...</p>
          <div className="text-8xl font-bold text-blue-600 tabular-nums animate-pulse">
            {countdown > 0 ? countdown : 'Inizia!'}
          </div>
        </div>
      )}

      {/* STEP: Timer (immersive) */}
      {step === STEP_TIMER && activeSession && (
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
          <p className="text-center text-white/90 text-sm mb-2">{activeSession.subjectEmoji} {activeSession.subjectName}</p>
          <div className="text-center text-7xl font-bold tabular-nums tracking-tight mb-4">
            {formatTime(remainingSeconds ?? 0)}
          </div>
          <div className="h-2 bg-white/20 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000"
              style={{ width: `${activeSession.totalSeconds ? Math.max(0, ((remainingSeconds ?? 0) / activeSession.totalSeconds) * 100) : 0}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button onClick={() => addMinutes(1)} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-sm font-medium">
              +1 min
            </button>
            <button onClick={() => addMinutes(5)} className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-sm font-medium">
              +5 min
            </button>
            <button onClick={handlePause} className="px-6 py-2 rounded-full bg-white/20 hover:bg-white/30 text-sm font-medium flex items-center gap-2">
              {isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
              {isPaused ? 'Riprendi' : 'Pausa'}
            </button>
            <button onClick={handleEnd} className="px-6 py-2 rounded-full bg-red-500/80 hover:bg-red-500 text-sm font-medium flex items-center gap-2">
              <StopIcon className="w-4 h-4" />
              Fine
            </button>
          </div>
          {/* Gamification */}
          <div className="flex justify-center gap-8 text-sm text-white/90">
            <span className="flex items-center gap-1">
              <span>Sessioni oggi</span>
              <span className="font-bold">{todayStats.sessions}</span>
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{todayStats.minutes} min</span>
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1">
                <FireIcon className="w-4 h-4 text-amber-300" />
                <span>{streak} di fila</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* STEP: Subject selection */}
      {step === STEP_SUBJECT && (
        <div className="space-y-6">
          <button onClick={() => setStep(STEP_LANDING)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeftIcon className="w-4 h-4" /> Indietro
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Scegli materia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSubject(s)}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-left transition-all"
              >
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  {stats?.subjectHistory?.[s.name] && (
                    <p className="text-xs text-gray-500 mt-0.5">{getLastStudiedText(stats.subjectHistory[s.name])}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: Duration selection */}
      {step === STEP_DURATION && selectedSubject && (
        <div className="space-y-6">
          <button onClick={() => setStep(STEP_SUBJECT)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeftIcon className="w-4 h-4" /> Indietro
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Quanto vuoi studiare?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {durationPresets.map((d) => (
              <button
                key={d.id}
                onClick={() => handleSelectDuration(d)}
                className="p-5 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center"
              >
                <p className="font-semibold text-gray-900">{d.label}</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{d.minutes} min</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: Landing */}
      {step === STEP_LANDING && (
        <div className="space-y-6">
          {/* Main card */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <AcademicCapIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Modalità Studio</h2>
                <p className="text-white/90 text-sm">Scegli una materia e concentrati.</p>
              </div>
            </div>

            {/* Continue session */}
            {activeSession && remainingSeconds != null && remainingSeconds > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-white/15">
                <p className="text-sm font-medium mb-2">Continua dove eri rimasto</p>
                <p className="text-lg font-semibold">{activeSession.subjectEmoji} {activeSession.subjectName}</p>
                <p className="text-sm text-white/80 mt-1">{formatTime(remainingSeconds)} rimanenti</p>
                <button
                  onClick={handleResume}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-indigo-700 font-medium hover:bg-white/90 transition-colors"
                >
                  <PlayIcon className="w-4 h-4" />
                  Riprendi
                </button>
              </div>
            )}

            {/* New session */}
            <button
              onClick={handleStartNew}
              className="w-full py-4 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-white/95 transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Nuova sessione
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Sessioni oggi</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{todayStats.sessions}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Tempo totale oggi</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{todayStats.minutes} min</p>
            </div>
          </div>
          {streak > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <FireIcon className="w-8 h-8 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-900">{streak} sessioni di fila</p>
                <p className="text-sm text-amber-800">Continua così!</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
