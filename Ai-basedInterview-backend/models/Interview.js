const mongoose = require('mongoose');

const conversationEntrySchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  feedback: { type: String, default: '' },
  emotion: { type: String, default: 'neutral' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const questionBreakdownSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  topic: { type: String, default: 'General' },
  score: { type: Number, min: 0, max: 100, default: 0 },
  observation: { type: String, default: '' }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  strengths: [String],
  weaknesses: [String],
  soft_skills: {
    communication: { type: String, default: '' },
    presentation: { type: String, default: '' },
    confidence: { type: String, default: '' }
  },
  overall_feedback: { type: String, default: '' },
  suggestions: [String],
  score: { type: Number, min: 0, max: 100, default: 0 },
  questionBreakdown: { type: [questionBreakdownSchema], default: [] }
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  jobDescription: {
    type: String,
    default: ''
  },
  voiceId: {
    type: String,
    default: 'Matthew'
  },
  conversationHistory: [conversationEntrySchema],
  questionCount: {
    type: Number,
    default: 0
  },
  maxQuestions: {
    type: Number,
    default: 15
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  recentQualities: {
    type: [String],
    default: []
  },
  report: {
    type: reportSchema,
    default: null
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Get max questions based on interview type
interviewSchema.statics.getMaxQuestions = function (type) {
  const limits = {
    hr: 10,
    fullstack: 15,
    backend: 15,
    dbms: 12,
    custom: 12
  };
  return limits[type?.toLowerCase()] || 12;
};

module.exports = mongoose.model('Interview', interviewSchema);
