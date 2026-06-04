import React from 'react';
import { CheckCircle2, Mic, Volume2, VideoIcon, MonitorSpeaker, X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstructionModal = ({ isOpen, onClose, onStart }) => {
  const instructions = [
    {
      icon: Mic,
      title: "Speak Clearly",
      description: "Answer in a clear and confident voice",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Volume2,
      title: "Speak Loudly",
      description: "Ensure your voice is audible and at good volume",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: MonitorSpeaker,
      title: "Quiet Environment",
      description: "Choose a noise-free location for the interview",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: VideoIcon,
      title: "Camera Position",
      description: "Sit in front of the camera with good lighting",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      icon: Camera,
      title: "Grant Permissions",
      description: "Allow camera and microphone access when prompted",
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden"
          >
            <div className="bg-white border-b border-slate-100 p-8 sm:p-10 relative">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Interview Guidelines</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Please read carefully before starting</p>
                </div>
              </div>
            </div>

            {/* Instructions Grid */}
            <div className="p-8 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {instructions.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                    className="flex gap-4 p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white transition-all duration-300"
                  >
                    <div className={`${item.bgColor} border border-black/5 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Additional Tips */}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl mb-8 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0 text-amber-600 mt-0.5">💡</div>
                <p className="text-sm font-medium text-amber-900 leading-normal">
                  <strong>Pro Tip:</strong> Take a deep breath and relax. Answer thoughtfully and take your time. Good luck! 🌟
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={onStart}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98]"
                >
                  I'm Ready - Start Interview
                </button>
                <button
                  onClick={onClose}
                  className="px-10 py-4 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all duration-300 shadow-sm active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstructionModal;