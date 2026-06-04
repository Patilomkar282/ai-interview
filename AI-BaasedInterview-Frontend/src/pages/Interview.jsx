import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import InstructionModal from '../Components/InstructionModel';

const Interview = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowInstructions(true);
  };

  // Default voices per interview type — must match ALLOWED_VOICES on the backend
  const TYPE_VOICE_MAP = {
    fullstack: 'Matthew',
    backend: 'Brian',
    dbms: 'Amy',
    hr: 'Raveena',
    custom: 'Brian'
  };

  const handleStartInterview = () => {
    const safeType = TYPE_VOICE_MAP[type?.toLowerCase()] ? type.toLowerCase() : 'custom';
    navigate(`/live/${safeType}`, {
      state: {
        jobDescription,
        type: safeType,
        voiceId: TYPE_VOICE_MAP[safeType] || 'Brian'
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl"
      >
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </motion.button>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 p-8 sm:p-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                <Sparkles className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Interview Setup</h1>
                <p className="text-slate-500 font-medium mt-1">Let's prepare for your <span className="text-slate-900 font-semibold capitalize">{type}</span> interview</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 sm:p-10 bg-slate-50/50">
            <div className="mb-8">
              <label htmlFor="job-description" className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4 tracking-tight">
                <FileText className="w-5 h-5 text-indigo-600" />
                Paste Your Job Description
              </label>
              <textarea
                id="job-description"
                rows={8}
                placeholder="Example: We're hiring a MERN stack developer with 3+ years of experience in building scalable web applications..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
                className="w-full border border-slate-200 bg-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition-all resize-none text-slate-700 font-medium shadow-sm"
              />
              <p className="text-sm font-medium text-slate-500 mt-4 flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl">
                <span className="text-indigo-500">💡</span> Include key skills, responsibilities, and requirements for a more tailored interview experience
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-3 group"
            >
              <span className="text-lg">Start My Interview</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
            <span className="text-indigo-500">🎯</span> This interview is powered by AI to give you realistic practice
          </p>
        </motion.div>
      </motion.div>

      {/* Instruction Modal */}
      <InstructionModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        onStart={handleStartInterview}
      />
    </div>
  );
};

export default Interview;