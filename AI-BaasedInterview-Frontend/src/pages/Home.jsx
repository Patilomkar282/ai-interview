import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, Database, Users, Sparkles, ChevronRight, BarChart3, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const interviewOptions = [
  {
    role: "Fullstack Developer",
    interviewer: "Matthew (US)",
    type: "fullstack",
    voiceId: "Matthew",
    icon: Code2,
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30",
    hoverBorder: "hover:border-blue-300 hover:shadow-blue-500/10",
    buttonHover: "group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white group-hover:shadow-blue-500/25",
    description: "Full-stack web applications"
  },
  {
    role: "Backend Developer",
    interviewer: "Brian (US)",
    type: "backend",
    voiceId: "Brian",
    icon: Database,
    iconBg: "bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-purple-500/30",
    hoverBorder: "hover:border-purple-300 hover:shadow-purple-500/10",
    buttonHover: "group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white group-hover:shadow-purple-500/25",
    description: "Scalable backend systems"
  },
  {
    role: "Database Systems",
    interviewer: "Amy (UK)",
    type: "dbms",
    voiceId: "Amy",
    icon: Database,
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30",
    hoverBorder: "hover:border-emerald-300 hover:shadow-emerald-500/10",
    buttonHover: "group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white group-hover:shadow-emerald-500/25",
    description: "Database optimization & design"
  },
  {
    role: "HR Interview",
    interviewer: "Raveena (India)",
    type: "hr",
    voiceId: "Raveena",
    icon: Users,
    iconBg: "bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-500/30",
    hoverBorder: "hover:border-orange-300 hover:shadow-orange-500/10",
    buttonHover: "group-hover:bg-orange-500 group-hover:border-orange-500 group-hover:text-white group-hover:shadow-orange-500/25",
    description: "Behavioral & cultural fit"
  },
  {
    role: "Custom Scenario",
    interviewer: "Your choice",
    type: "custom",
    voiceId: null, // user picks in the custom modal
    icon: Sparkles,
    iconBg: "bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-500/30",
    hoverBorder: "hover:border-slate-400 hover:shadow-slate-500/10",
    buttonHover: "group-hover:bg-slate-800 group-hover:border-slate-800 group-hover:text-white group-hover:shadow-slate-800/25",
    description: "Personalized mock interview"
  }
];

const Home = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [tech, setTech] = useState("");
  const [voiceId, setVoiceId] = useState("Brian");
  const [jobDescription, setJobDescription] = useState("");
  const [sessionsRemaining, setSessionsRemaining] = useState(5);

  useEffect(() => {
    // Fetch sessions remaining
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessionsRemaining(res.data.sessionsRemaining ?? 5);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, [token]);

  const handleInterview = (item) => {
    if (sessionsRemaining <= 0) {
      alert("You've used all 5 interview sessions for this month. Check back next month!");
      return;
    }

    if (item.type === "custom") {
      setShowCustomForm(true);
    } else {
      navigate(`/live/${item.type}`, {
        state: {
          jobDescription: `General ${item.type} interview`,
          type: item.type,
          voiceId: item.voiceId
        }
      });
    }
  };

  const startCustomInterview = () => {
    if (!tech && !jobDescription) {
      alert("Please enter at least Technology/Job Description");
      return;
    }

    // Always send type: 'custom' to satisfy backend allowlist.
    // Prepend the technology to the job description so the AI has full context.
    const fullDescription = tech
      ? `Technology/Domain: ${tech}\n\n${jobDescription}`.trim()
      : jobDescription;

    navigate(`/live/custom`, {
      state: { jobDescription: fullDescription, type: "custom", voiceId }
    });
    setShowCustomForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">AI Interview</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{sessionsRemaining} sessions remaining</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => { logout(); window.location.href = 'https://www.smartprep.live/login'; }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200/50">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[100px] -top-32 -left-32 animate-pulse" />
          <div className="absolute w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-[100px] -bottom-32 -right-32 animate-pulse" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8 mt-4 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-600 tracking-wide uppercase">AI-Powered Interviews</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Dream Interview</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
              Choose your domain, select an AI interviewer, and practice in a frictionless environment.
              Get highly accurate, detailed feedback instantly.
            </p>
            {sessionsRemaining <= 2 && (
              <div className="mt-8 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-5 py-2.5 rounded-xl font-bold shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                Only {sessionsRemaining} session{sessionsRemaining !== 1 ? 's' : ''} remaining this month
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Interview Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20 -mt-10 relative z-10">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {interviewOptions.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className={`group bg-white rounded-3xl border border-slate-200 p-8 shadow-sm transition-all duration-300 transform hover:-translate-y-1 flex flex-col ${item.hoverBorder}`}
            >
              <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center mb-6 shadow-lg shadow-black/5`}>
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{item.role}</h2>
              <p className="text-sm font-medium text-slate-500 mb-8 flex-grow leading-relaxed">{item.description}</p>
              
              <div className="flex items-center gap-3 text-sm text-slate-600 mb-8 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl w-max shadow-sm">
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  {item.interviewer.charAt(0)}
                </div>
                <span className="font-semibold">{item.interviewer}</span>
              </div>

              <button
                onClick={() => handleInterview(item)}
                disabled={sessionsRemaining <= 0}
                className={`w-full bg-white border border-slate-200 text-slate-900 font-semibold rounded-xl px-6 py-4 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm ${item.buttonHover}`}
              >
                <span>Start Interview</span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom Interview Modal */}
      <AnimatePresence>
        {showCustomForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-white border-b border-slate-100 p-8 relative">
                <button onClick={() => setShowCustomForm(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Custom Interview</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Tailor your interview experience</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Technology / Domain</label>
                  <input
                    type="text"
                    value={tech}
                    onChange={(e) => setTech(e.target.value)}
                    placeholder="e.g. Machine Learning, ReactJS, Python..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder-slate-400"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Interviewer Voice</label>
                  <select
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                  >
                    <option value="Brian">Brian (US) - Professional Male</option>
                    <option value="Olivia">Olivia (UK) - Professional Female</option>
                    <option value="Matthew">Matthew (US) - Tech Expert Male</option>
                  </select>
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Job Description / Topics</label>
                  <textarea
                    rows="4"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description or describe the topics..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm placeholder-slate-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={startCustomInterview}
                    className="flex-1 bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98]"
                  >
                    Continue to Interview
                  </button>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-300 shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;

