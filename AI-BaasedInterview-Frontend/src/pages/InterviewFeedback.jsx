import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, MessageSquare, Award, Target,
  Lightbulb, ArrowLeft, Home, Download, BarChart3, List
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function InterviewFeedback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const interviewId = searchParams.get("id");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!interviewId) {
      setError("No interview ID provided.");
      setLoading(false);
      return;
    }
    generateReport();
  }, [interviewId]);

  const generateReport = async () => {
    try {
      // Call the final feedback endpoint to generate/fetch report
      const res = await axios.get(
        `${API_BASE}/api/interview/final-feedback?interviewId=${interviewId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReport(res.data);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError(err.response?.data?.error || "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Animated loading steps — cycle through to show progress
  const loadingSteps = [
    'Reading your conversation transcript...',
    'Evaluating answer quality per question...',
    'Scoring your technical knowledge...',
    'Assessing communication and confidence...',
    'Identifying strengths and weak spots...',
    'Writing your personalised feedback...',
    'Almost ready...'
  ];

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, loadingSteps.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full"
        >
          {/* Animated icon */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 absolute inset-0" />
            <div className="w-20 h-20 rounded-full border-4 border-t-indigo-600 border-r-indigo-400 border-b-transparent border-l-transparent animate-spin absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Award className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Generating your report
          </h2>
          <p className="text-slate-500 font-medium mb-8">This takes about 10–15 seconds</p>

          {/* Step progress bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              <span>Progress</span>
              <span>{Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-5">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: '5%' }}
                animate={{ width: `${Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </div>
            <motion.p
              key={loadingStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-semibold text-slate-700 text-left"
            >
              {loadingSteps[loadingStep]}
            </motion.p>
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Powered by GPT-4o · Do not close this tab
          </p>
        </motion.div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
            <Target className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Report Unavailable</h2>
          <p className="text-slate-500 font-medium mb-8">{error || "Could not load the report."}</p>
          <div className="flex gap-4 justify-center">
            {interviewId && (
              <button
                onClick={() => { setLoading(true); setError(""); generateReport(); }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98]"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const scoreBadgeParams = report.score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : report.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-300 font-semibold shadow-sm active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-300 font-semibold shadow-sm active:scale-[0.98]"
            >
              <BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
        >
          {/* Header with Score */}
          <div className="bg-white border-b border-slate-100 p-8 sm:p-10">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <Award className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Interview Evaluation</h1>
                  <p className="text-slate-500 font-medium mt-1">
                    AI-generated report for <span className="text-slate-900 font-semibold">{user?.name || 'Candidate'}</span>
                  </p>
                </div>
              </div>
              {/* Score Badge */}
              <div className={`border ${scoreBadgeParams} rounded-2xl px-8 py-5 text-center min-w-[140px] shadow-sm`}>
                <p className="text-xs uppercase tracking-widest font-bold opacity-80 mb-1">Score</p>
                <div className="flex items-baseline justify-center gap-1">
                  <p className="text-5xl font-extrabold">{report.score}</p>
                  <p className="text-lg font-bold opacity-70">/ 100</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 sm:p-10 space-y-8 bg-slate-50/50">
            {/* Strengths */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-green-50 rounded-2xl p-6 border-2 border-green-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Strengths</h3>
              </div>
              <ul className="space-y-3">
                {report.strengths?.map((s, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-700 font-medium bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-emerald-500 font-bold mt-0.5 text-lg leading-none">✓</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* Weaknesses */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Areas for Improvement</h3>
              </div>
              <ul className="space-y-3">
                {report.weaknesses?.map((w, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-700 font-medium bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-orange-500 font-bold mt-0.5 text-lg leading-none">!</span>
                    <span className="leading-relaxed">{w}</span>
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* Soft Skills */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Soft Skills Assessment</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">Communication</p>
                  <p className="font-semibold text-slate-900 text-lg">{report.soft_skills?.communication}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">Presentation</p>
                  <p className="font-semibold text-slate-900 text-lg">{report.soft_skills?.presentation}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2">Confidence</p>
                  <p className="font-semibold text-slate-900 text-lg">{report.soft_skills?.confidence}</p>
                </div>
              </div>
            </motion.section>

            {/* Per-Question Breakdown */}
            {Array.isArray(report.questionBreakdown) && report.questionBreakdown.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center shadow-sm">
                    <List className="w-6 h-6 text-violet-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Question-by-Question Analysis</h3>
                </div>
                <div className="space-y-4">
                  {report.questionBreakdown.map((q, i) => {
                    const barColor = q.score >= 70 ? 'bg-emerald-500' : q.score >= 40 ? 'bg-amber-500' : 'bg-red-500';
                    const scoreColor = q.score >= 70 ? 'text-emerald-700' : q.score >= 40 ? 'text-amber-700' : 'text-red-700';
                    return (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Q{q.questionNumber}</span>
                            <p className="font-semibold text-slate-900 mt-0.5">{q.topic}</p>
                          </div>
                          <span className={`text-2xl font-extrabold ${scoreColor} flex-shrink-0`}>{q.score}<span className="text-sm font-semibold text-slate-400">/100</span></span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                          <div
                            className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${q.score}%` }}
                          />
                        </div>
                        {q.observation && (
                          <p className="text-sm text-slate-600 font-medium">{q.observation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Overall Feedback */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center shadow-sm">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Overall Feedback</h3>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-slate-700 leading-relaxed font-medium">{report.overall_feedback}</p>
              </div>
            </motion.section>

            {/* Suggestions */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100/50 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-100 border border-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Lightbulb className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">How to Improve</h3>
              </div>
              <ul className="space-y-3">
                {report.suggestions?.map((s, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-700 font-medium bg-white p-4 rounded-xl border border-indigo-50 shadow-sm">
                    <span className="text-indigo-500 font-bold mt-0.5 text-lg leading-none">💡</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </motion.section>
          </div>
        </motion.div>

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 font-semibold flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <BarChart3 className="w-5 h-5" /> View Dashboard
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl hover:bg-slate-50 transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <Home className="w-5 h-5" /> Start Another Interview
          </button>
        </motion.div>
      </div>
    </div>
  );
}
