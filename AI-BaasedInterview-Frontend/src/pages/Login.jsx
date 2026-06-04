import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, KeyRound, Loader2, ArrowRight, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const OTP_VALIDITY_SECONDS = 5 * 60; // 5 minutes

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otpSentAt, setOtpSentAt] = useState(null); // timestamp for countdown
  const [countdown, setCountdown] = useState(0);

  // OTP expiry countdown timer
  useEffect(() => {
    if (!otpSentAt) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - otpSentAt) / 1000);
      const remaining = OTP_VALIDITY_SECONDS - elapsed;
      if (remaining <= 0) {
        setCountdown(0);
        setError('OTP has expired. Please request a new one.');
      } else {
        setCountdown(remaining);
      }
    };

    tick(); // run immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [otpSentAt]);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.endsWith('@mmcoe.edu.in')) {
      setError('Only @mmcoe.edu.in email addresses are allowed.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/send-otp`, {
        email: email.toLowerCase().trim()
      });
      setMessage(res.data.message);
      setOtpSentAt(Date.now());
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    if (countdown === 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/verify-otp`, {
        email: email.toLowerCase().trim(),
        otp
      });
      login(res.data.token, res.data.user);

      if (res.data.user.isOnboarded) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/send-otp`, {
        email: email.toLowerCase().trim()
      });
      setMessage('OTP resent to your email.');
      setOtp('');
      setOtpSentAt(Date.now()); // restart countdown
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />
        <div className="absolute w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100 mb-4"
          >
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Interview Platform</h1>
          <p className="text-slate-500 text-sm">Practice interviews with AI-powered feedback</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50/80 backdrop-blur border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {step === 'email' ? 'Sign In' : 'Verify OTP'}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {step === 'email' ? 'Use your MMCOE email to continue' : `OTP sent to ${email}`}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === 'email' ? (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSendOtp}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">College Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@mmcoe.edu.in"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">Only @mmcoe.edu.in emails are accepted</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Send OTP <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-700">Enter 6-Digit OTP</label>
                      {/* Countdown timer */}
                      {countdown > 0 ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countdown <= 60 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                          Expires in {formatCountdown(countdown)}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="• • • • • •"
                        maxLength={6}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6 || countdown === 0}
                    className="w-full bg-indigo-600 text-white font-medium py-3.5 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Verify & Login <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { setStep('email'); setOtp(''); setError(''); setOtpSentAt(null); }}
                      className="text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={loading}
                      className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Error / Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}
              {message && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm font-medium"
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6 font-medium tracking-wide">
          MMCOE AI Interview Practice Platform
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
