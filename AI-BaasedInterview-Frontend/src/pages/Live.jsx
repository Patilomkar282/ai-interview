import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Mic, MicOff, Volume2, User, Bot, Phone, Activity, AlertCircle, ArrowRight, RefreshCw, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InstructionModal from '../Components/InstructionModel';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// sessionStorage key for persisting interview ID across accidental refreshes
const SESSION_KEY = 'live_interview_id';

const LiveInterview = () => {
  const { state } = useLocation();
  const { type: typeParam } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const audioRef = useRef();
  const recognitionRef = useRef(null);
  const objectUrlRef = useRef(null);
  const interviewIdRef = useRef(null);
  // Store the last answer so we can retry it if the request fails
  const lastAnswerRef = useRef(null);

  const ALLOWED_TYPES = ['hr', 'fullstack', 'backend', 'dbms', 'custom'];
  const resolvedType = state?.type || typeParam || 'custom';
  const safeType = ALLOWED_TYPES.includes(resolvedType?.toLowerCase())
    ? resolvedType.toLowerCase()
    : 'custom';

  const [voiceId] = useState(state?.voiceId || 'Brian');
  const [type] = useState(safeType);
  const [started, setStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryAnswer, setRetryAnswer] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Live speech display — updated on every recognition result
  const [interimText, setInterimText] = useState('');
  const [confirmedText, setConfirmedText] = useState(''); // mirrors accumulatedTranscriptRef for rendering

  // Refs that persist across recognition restarts
  const accumulatedTranscriptRef = useRef(''); // full transcript across restarts
  const silenceTimerRef = useRef(null);
  const listeningActiveRef = useRef(false); // true = we want mic open
  const hasSpeechRef = useRef(false); // true = at least one word captured

  const jobDescription = state?.jobDescription;

  // ---------------------------------------------------------------------------
  // Session recovery from sessionStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const savedId = sessionStorage.getItem(SESSION_KEY);
    if (savedId && !interviewIdRef.current) {
      interviewIdRef.current = savedId;
    }
  }, []);

  useEffect(() => {
    if (!jobDescription) navigate('/');
  }, [jobDescription, navigate]);

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // Prevent accidental page reloads mid-interview
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (started && !interviewEnded) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [started, interviewEnded]);

  // ---------------------------------------------------------------------------
  // Online / offline detection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      // If we were mid-interview and went offline, auto-retry the last failed answer
      if (retryAnswer) {
        setRetryAnswer(null);
        sendAnswer(retryAnswer);
      }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [retryAnswer]);

  // ---------------------------------------------------------------------------
  // Audio helpers — use addEventListener to avoid onended race conditions
  // ---------------------------------------------------------------------------
  const setAudioEndHandler = useCallback((handler) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Remove any existing listener before adding the new one
    audio.removeEventListener('ended', audio._endedHandler);
    audio._endedHandler = handler;
    audio.addEventListener('ended', handler);
  }, []);

  const revokeOldUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const playAudio = useCallback((blob, onEnded) => {
    revokeOldUrl();
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    audioRef.current.src = url;
    audioRef.current.play();
    setAiSpeaking(true);
    setAudioEndHandler(() => {
      setAiSpeaking(false);
      onEnded();
    });
  }, [setAudioEndHandler]);

  // ---------------------------------------------------------------------------
  // Permissions
  // ---------------------------------------------------------------------------
  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setPermissionsGranted(true);
      setErrorMsg('');
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      setErrorMsg('Camera and microphone access are required for the interview.');
      return false;
    }
  };

  const handleStartClick = async () => {
    const hasPermissions = await requestPermissions();
    if (hasPermissions) setShowInstructions(true);
  };

  const decodeBase64 = (str) => {
    try { return atob(str); } catch { return ''; }
  };

  // ---------------------------------------------------------------------------
  // Start interview
  // ---------------------------------------------------------------------------
  const startInterview = async () => {
    setShowInstructions(false);
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await axios.post(
        `${API_BASE}/api/interview/start`,
        { jobDescription, type, voiceId },
        {
          responseType: 'blob',
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const id = res.headers['x-interview-id'];
      const questionText = decodeBase64(res.headers['x-question-text'] || '');

      // Persist to sessionStorage so a refresh doesn't orphan the session
      interviewIdRef.current = id;
      sessionStorage.setItem(SESSION_KEY, id);

      setStarted(true);
      setConversation([{ role: 'ai', text: questionText || 'AI is speaking...' }]);

      playAudio(res.data, () => listenToAnswer());
    } catch (err) {
      console.error('Error starting interview:', err);
      if (err.response?.status === 429) {
        setErrorMsg('Monthly session limit reached. Check your dashboard for your reset date.');
      } else if (err.response?.data?.error) {
        setErrorMsg(err.response.data.error);
      } else {
        setErrorMsg('Failed to start interview. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Speech recognition — continuous, auto-restarts, feels like Gemini Live
  // ---------------------------------------------------------------------------

  const stopListening = useCallback(() => {
    listeningActiveRef.current = false;
    clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.abort(); } catch (_) {}
    recognitionRef.current = null;
    setIsListening(false);
    setUserSpeaking(false);
    setInterimText('');
    setConfirmedText('');
  }, []);

  const submitAccumulated = useCallback(() => {
    const answer = accumulatedTranscriptRef.current.trim();
    if (!answer) return;
    stopListening();
    accumulatedTranscriptRef.current = '';
    hasSpeechRef.current = false;
    sendAnswer(answer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening]);

  const listenToAnswer = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setAnswerError('Speech recognition is not supported. Please use Chrome or type below.');
      return;
    }

    // Reset accumulator for a fresh question
    accumulatedTranscriptRef.current = '';
    hasSpeechRef.current = false;
    listeningActiveRef.current = true;
    setIsListening(true);
    setUserSpeaking(false);
    setInterimText('');
    setConfirmedText('');
    setAnswerError('');

    const startRecognition = () => {
      if (!listeningActiveRef.current) return;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      // ── Silence detection ──────────────────────────────────────────────────
      // 3s of no new speech → auto-submit (resets on every interim/final result)
      const armSilenceTimer = () => {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (accumulatedTranscriptRef.current.trim() && listeningActiveRef.current) {
            submitAccumulated();
          }
        }, 3000);
      };

      // ── Results ────────────────────────────────────────────────────────────
      recognition.onresult = (event) => {
        // Hard gate: if it's not the user's turn, discard everything.
        // This stops stale browser events (event-loop delay after abort/stop)
        // and mic bleed-through from the AI's TTS audio being stored.
        if (!listeningActiveRef.current) return;

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedTranscriptRef.current += t + ' ';
            hasSpeechRef.current = true;
          } else {
            interim += t;
          }
        }

        // Mirror ref into state so React re-renders the live text
        setConfirmedText(accumulatedTranscriptRef.current);
        setInterimText(interim);
        setUserSpeaking(!!(accumulatedTranscriptRef.current || interim));

        // Reset silence clock on ANY speech activity — interim or final.
        // The 3s countdown only begins once the user truly stops talking.
        if (accumulatedTranscriptRef.current || interim) armSilenceTimer();
      };

      // ── Chrome kills recognition after ~60s or a long silence — restart ───
      recognition.onend = () => {
        // Not our turn — don't touch any state or restart
        if (!listeningActiveRef.current) return;
        setUserSpeaking(false);
        setInterimText('');

        // If there's accumulated text, arm the timer and wait
        if (accumulatedTranscriptRef.current.trim()) {
          armSilenceTimer();
        }
        // Restart immediately to keep mic open seamlessly
        setTimeout(() => {
          if (listeningActiveRef.current) startRecognition();
        }, 100);
      };

      // ── Errors ─────────────────────────────────────────────────────────────
      recognition.onerror = (err) => {
        if (!listeningActiveRef.current) return;
        // no-speech and aborted are benign — just restart
        if (err.error === 'no-speech' || err.error === 'aborted') {
          setTimeout(() => { if (listeningActiveRef.current) startRecognition(); }, 200);
          return;
        }
        // network errors — restart silently
        if (err.error === 'network') {
          setTimeout(() => { if (listeningActiveRef.current) startRecognition(); }, 500);
          return;
        }
        // Only show error for real unrecoverable failures
        console.error('Speech recognition error:', err.error);
        setAnswerError('Microphone error. You can type your answer below.');
        listeningActiveRef.current = false;
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (e) {
        // Already started — ignore
      }
    };

    startRecognition();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitAccumulated]);

  // Submit whatever has been captured so far (manual button)
  const handleManualSubmit = useCallback(() => {
    if (accumulatedTranscriptRef.current.trim()) {
      submitAccumulated();
    } else {
      // Fallback: grab last user-temp bubble
      setConversation(prev => {
        const last = [...prev].reverse().find(m => m.role === 'user-temp');
        if (last?.text && last.text !== '...') {
          accumulatedTranscriptRef.current = last.text;
          submitAccumulated();
        }
        return prev;
      });
    }
  }, [submitAccumulated]);

  const [typedAnswer, setTypedAnswer] = useState('');
  const handleTypedSubmit = (e) => {
    e.preventDefault();
    if (typedAnswer.trim()) {
      sendAnswer(typedAnswer.trim());
      setTypedAnswer('');
    }
  };

  // ---------------------------------------------------------------------------
  // Repeat Question — replays stored audio, no API call
  // ---------------------------------------------------------------------------
  const repeatQuestion = () => {
    if (!objectUrlRef.current || aiSpeaking || aiThinking) return;
    stopListening();
    audioRef.current.src = objectUrlRef.current;
    audioRef.current.play();
    setAiSpeaking(true);
    setAudioEndHandler(() => {
      setAiSpeaking(false);
      listenToAnswer();
    });
  };

  // ---------------------------------------------------------------------------
  // Send answer
  // ---------------------------------------------------------------------------
  const sendAnswer = async (userSpeech) => {
    // Kill the mic immediately and scrub all buffers — nothing the user OR the
    // AI's TTS speaker says from this point onwards should be stored until
    // listenToAnswer() explicitly opens the mic again for the next turn.
    stopListening();
    accumulatedTranscriptRef.current = '';
    hasSpeechRef.current = false;
    clearTimeout(silenceTimerRef.current);

    setConversation((prev) => [
      ...prev.filter((m) => m.role !== 'user-temp'),
      { role: 'user', text: userSpeech }
    ]);

    setInterimText('');
    setConfirmedText('');
    setAiThinking(true);
    setAnswerError('');
    setRetryAnswer(null);
    lastAnswerRef.current = userSpeech;

    // Don't attempt if we're already offline — queue for auto-retry
    if (!navigator.onLine) {
      setAiThinking(false);
      setRetryAnswer(userSpeech);
      return;
    }

    try {
      const currentInterviewId = interviewIdRef.current;
      if (!currentInterviewId) {
        setAnswerError('Interview session not found. Please refresh and try again.');
        setAiThinking(false);
        return;
      }

      const res = await axios.post(
        `${API_BASE}/api/interview/check`,
        { userAnswer: userSpeech, voiceId, interviewId: currentInterviewId },
        {
          responseType: 'blob',
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      );

      const isEnded = res.headers['x-interview-ended'] === 'true';
      const aiText = decodeBase64(res.headers['x-ai-text'] || '');

      setAiThinking(false);
      setConversation((prev) => [...prev, { role: 'ai', text: aiText || 'AI is responding...' }]);

      playAudio(res.data, () => {
        if (isEnded) {
          setInterviewEnded(true);
          sessionStorage.removeItem(SESSION_KEY);
          setTimeout(() => navigate(`/feedback?id=${currentInterviewId}`), 2000);
        } else {
          listenToAnswer();
        }
      });
    } catch (err) {
      setAiThinking(false);
      console.error('Error sending answer:', err);

      if (!navigator.onLine) {
        // Connection dropped during the request — store for auto-retry
        setRetryAnswer(userSpeech);
      } else {
        // Server error — let user manually retry
        setRetryAnswer(userSpeech);
        setAnswerError('Failed to send your answer.');
      }
    }
  };

  // Manual retry button handler
  const handleRetry = () => {
    if (!retryAnswer) return;
    const answer = retryAnswer;
    setRetryAnswer(null);
    setAnswerError('');
    sendAnswer(answer);
  };

  // ---------------------------------------------------------------------------
  // End interview
  // ---------------------------------------------------------------------------
  const disconnect = () => {
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setInterviewEnded(true);
    setAiSpeaking(false);
    setStarted(false);
    setConfirmEnd(false);
    sessionStorage.removeItem(SESSION_KEY);

    const targetId = interviewIdRef.current;
    setTimeout(() => {
      if (targetId) {
        navigate(`/feedback?id=${targetId}`);
      } else {
        navigate('/');
      }
    }, 1500);
  };

  function getLastMessage(role) {
    // For 'user', only look at confirmed (non-temp) messages
    const last = [...conversation].reverse().find((m) => m.role === role);
    return last?.text || '';
  }

  function getLastAiMessage() {
    const last = [...conversation].reverse().find((m) => m.role === 'ai');
    return last?.text || '';
  }


  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px] -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] -bottom-48 -right-48 animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">Live AI Interview</h1>
          <p className="text-slate-500 font-medium">Real-time voice interview with AI feedback</p>
        </motion.div>

        {/* Offline banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto mb-4"
            >
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-semibold text-sm">No internet connection</p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    {retryAnswer ? 'Your answer is saved — it will be sent automatically when you reconnect.' : 'Please check your connection.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unified error banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-semibold mb-1">Error</p>
                  <p className="text-red-700 text-sm">{errorMsg}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Button */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center mb-10">
          {!started ? (
            <button
              onClick={handleStartClick}
              disabled={loading}
              className="group relative bg-indigo-600 text-white font-bold px-12 py-4 rounded-2xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 text-lg"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Activity className="w-6 h-6 animate-pulse" />
              )}
              {loading ? 'Starting...' : 'Start Interview'}
            </button>
          ) : confirmEnd ? (
            // Inline confirmation — avoids blocking window.confirm()
            <div className="flex items-center gap-3 bg-white border border-red-200 rounded-2xl px-6 py-3 shadow-sm">
              <span className="text-slate-700 font-semibold text-sm">End the interview?</span>
              <button
                onClick={disconnect}
                className="bg-red-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-red-700 transition-all active:scale-[0.98]"
              >
                Yes, end it
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="bg-slate-100 text-slate-700 font-semibold px-5 py-2 rounded-xl text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="group relative bg-red-600 text-white font-bold px-12 py-4 rounded-2xl hover:bg-red-700 transition-all duration-300 shadow-sm hover:shadow-red-500/25 active:scale-[0.98] flex items-center gap-3 text-lg"
            >
              <Phone className="w-6 h-6" />
              End Interview
            </button>
          )}
        </motion.div>

        {/* Interview Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* AI Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`relative rounded-3xl p-8 border shadow-sm transition-all duration-300 flex flex-col ${aiSpeaking ? 'bg-indigo-50/30 border-indigo-300 shadow-indigo-500/10' : aiThinking ? 'bg-amber-50/30 border-amber-300 shadow-amber-500/10' : 'bg-white border-slate-200'}`}
          >
            {aiSpeaking && (
              <div className="absolute -top-2 -right-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-5 h-5 bg-indigo-500 rounded-full animate-ping absolute" />
                  <div className="w-5 h-5 bg-indigo-500 rounded-full relative shadow-sm border-2 border-white" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-5 mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ${aiSpeaking ? 'animate-pulse' : ''}`}>
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Interviewer</h2>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {aiThinking ? (
                    <><div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm font-medium text-amber-600">Thinking...</span></>
                  ) : aiSpeaking ? (
                    <><Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" /><span className="text-sm font-medium text-indigo-600">Speaking...</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Listening</span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[140px] flex-grow flex flex-col justify-center">
              {aiThinking ? (
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-indigo-600 text-sm font-medium">Processing your response...</span>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 text-lg leading-relaxed font-medium">{getLastAiMessage() || "I'll be asking you questions shortly. Get ready!"}</p>
                  {started && !aiSpeaking && !aiThinking && objectUrlRef.current && (
                    <button
                      onClick={repeatQuestion}
                      className="mt-4 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors w-fit"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Repeat Question
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* User Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`relative rounded-3xl p-8 border shadow-sm transition-all duration-300 flex flex-col ${userSpeaking ? 'bg-blue-50/30 border-blue-300 shadow-blue-500/10' : isListening ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}
          >
            {/* Pulsing mic indicator */}
            {isListening && (
              <div className="absolute -top-2 -right-2">
                <div className="relative">
                  <div className={`w-5 h-5 rounded-full absolute ${userSpeaking ? 'bg-blue-500 animate-ping' : 'bg-slate-400'}`} />
                  <div className={`w-5 h-5 rounded-full relative shadow-sm border-2 border-white ${userSpeaking ? 'bg-blue-500' : 'bg-slate-400'}`} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-5 mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ${userSpeaking ? 'animate-pulse' : ''}`}>
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">You</h2>
                <div className="flex items-center gap-2 mt-1">
                  {isListening ? (
                    userSpeaking ? (
                      <>
                        {/* Live sound bars */}
                        <div className="flex items-end gap-0.5 h-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-1 bg-blue-500 rounded-full animate-bounce"
                              style={{ height: `${40 + Math.random() * 60}%`, animationDelay: `${i * 80}ms` }} />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-blue-600">Speaking...</span>
                      </>
                    ) : (
                      <><Mic className="w-4 h-4 text-slate-400 animate-pulse" /><span className="text-sm font-medium text-slate-500">Listening, speak now...</span></>
                    )
                  ) : (
                    <><MicOff className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-400">Idle</span></>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-6 min-h-[140px] flex-grow flex flex-col justify-between">
              <div className="flex-1">
                {/* Live transcript — confirmed words in dark, interim in muted */}
                {isListening ? (
                  <p className="text-slate-800 text-lg leading-relaxed font-medium">
                    {confirmedText}
                    {interimText && (
                      <span className="text-slate-400 italic">{interimText}</span>
                    )}
                    {!confirmedText && !interimText && (
                      <span className="text-slate-400">Start speaking...</span>
                    )}
                  </p>
                ) : (
                  <p className="text-slate-700 text-lg leading-relaxed font-medium">
                    {getLastMessage('user') || 'Waiting...'}
                  </p>
                )}
              </div>

              {/* Submit button — only show once something is captured */}
              {isListening && confirmedText.trim() && (
                <div className="mt-4">
                  <button
                    onClick={handleManualSubmit}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Done, submit answer
                  </button>
                  <p className="text-xs text-slate-400 mt-1.5">Or stop speaking — auto-submits after 3.5s silence</p>
                </div>
              )}

              {/* Retry button */}
              {retryAnswer && !isOffline && (
                <div className="mt-3">
                  <p className="text-amber-700 text-sm font-medium mb-2">Failed to send. Try again?</p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              )}

              {/* Text fallback for mic errors */}
              {answerError && !retryAnswer && (
                <div className="mt-3">
                  <p className="text-red-600 text-sm font-medium mb-2">{answerError}</p>
                  {started && !aiSpeaking && !aiThinking && (
                    <form onSubmit={handleTypedSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button type="submit" disabled={!typedAnswer.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                        Send
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        </div>

        {/* Conversation History */}
        <AnimatePresence>
          {started && conversation.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" /> Conversation History
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {conversation.filter(m => m.role !== 'user-temp').slice(0, -2).reverse().map((msg, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm' : 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-tr-sm'}`}>
                    <span className="font-bold flex items-center gap-2 mb-2">
                      {msg.role === 'ai' ? <><Bot className="w-4 h-4 text-slate-500" /> AI Interviewer</> : <><User className="w-4 h-4 text-indigo-500" /> You</>}
                    </span>
                    {msg.text}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <audio ref={audioRef} hidden />

      {/* End Alert */}
      <AnimatePresence>
        {interviewEnded && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 font-bold"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              Interview ended. Generating your report...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InstructionModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} onStart={startInterview} />
    </div>
  );
};

export default LiveInterview;
