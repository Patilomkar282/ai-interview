import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Sparkles, ArrowRight, Check, Loader2, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const INTERESTS = [
  'Software Engineering', 'Data Science', 'Product Management',
  'UI/UX Design', 'Marketing', 'Sales', 'Finance', 'HR'
];

const Onboarding = () => {
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { token, login, user } = useAuth();

  // Redirect if already onboarded
  useEffect(() => {
    if (user?.isOnboarded) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length < 3) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please provide your full name before continuing.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/onboard`,
        { name: name.trim(), interests: selectedInterests },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding Error:', err);
      setError(err.response?.data?.error || 'Failed to save profile setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Animated background - Premium soft colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl -top-48 -left-20 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo / Brand Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-xl shadow-indigo-500/20 mb-6"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Welcome Aboard! 🎉</h1>
          <p className="text-slate-500 text-lg">Let's setup your profile so we can personalize your interview experience.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> What's your full name?
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-medium text-lg"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Step 2: Interests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" /> Professional Interests
                </label>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  Max 3
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4 font-medium">Select up to 3 fields you want to practice for.</p>
              
              <div className="flex flex-wrap gap-2.5">
                {INTERESTS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  const disabled = !isSelected && selectedInterests.length >= 3;
                  return (
                    <button
                      key={interest}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleInterest(interest)}
                      className={`
                        px-4 py-2.5 rounded-xl text-sm font-bold border transition-all duration-300 flex items-center gap-2
                        ${isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-105' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed hidden' : ''}
                      `}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-600/25 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>Complete Profile <ArrowRight className="w-6 h-6" /></>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
