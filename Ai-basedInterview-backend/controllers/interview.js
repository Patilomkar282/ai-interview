const mongoose = require('mongoose');
const { generateResponse, evaluateAnswer, generateFinalFeedback } = require('../utils/aiModel');
const Interview = require('../models/Interview');
const User = require('../models/User');
const polly = require('../config/polly');
const { Readable } = require('stream');

// Input limits
const MAX_JOB_DESC_LENGTH = 5000;
const MAX_ANSWER_LENGTH = 10000;

// Allowed values (prevents prompt injection and invalid Polly calls)
const ALLOWED_VOICES = [
  'Matthew', 'Brian', 'Olivia', 'Amy', 'Joanna', 'Salli',
  'Kimberly', 'Kendra', 'Joey', 'Justin', 'Kevin', 'Ivy',
  'Ruth', 'Stephen', 'Lupe', 'Aria', 'Ayanda', 'Emma', 'Raveena'
];
const ALLOWED_TYPES = ['hr', 'fullstack', 'backend', 'dbms', 'custom'];

// ---------------------------------------------------------------------------
// Adaptive difficulty helpers
// ---------------------------------------------------------------------------

/**
 * Infer answer quality from the AI feedback text.
 * Returns 'good', 'average', or 'poor'.
 */
const inferAnswerQuality = (feedbackText = '', userAnswer = '') => {
  const f = feedbackText.toLowerCase();
  const a = userAnswer.toLowerCase();

  // Clear poor signals — candidate couldn't answer or got it wrong
  if (
    /i don'?t know|no idea|not sure|couldn'?t answer/i.test(a) ||
    /incorrect|completely wrong|missed the point|no understanding|couldn'?t explain/i.test(f)
  ) {
    return 'poor';
  }

  // Weak signals — answer was too shallow or had notable gaps
  if (
    /lacks depth|very vague|needs improvement|not quite right|could be better|partial(ly)?|incomplete/i.test(f)
  ) {
    return 'average';
  }

  // Good signals — covers the concept correctly (broad net for freshers)
  // "Good", "correct", "right", "nice", "well", "yes", "exactly", "spot on",
  // "that's right", "makes sense", "good understanding", "right direction"
  if (
    /\bgood\b|\bcorrect\b|\bright\b|\bnice\b|\bwell\b|\bexactly\b|\bspot.?on\b|\bthat'?s right\b|makes sense|right direction|good understanding|well (said|explained|done|articulated)|great|excellent|impressive|strong/i.test(f)
  ) {
    return 'good';
  }

  // Default: if no strong negative signal, treat as average (not poor)
  return 'average';
};

/**
 * Compute the next difficulty level for a FRESHER interview.
 *
 * Climb:  3 consecutive 'good' answers → move one level up
 * Drop:   2 consecutive 'poor' answers → move one level down
 * Ceiling is 'hard' (junior-level) — never exceeds that.
 * Floor   is 'easy'               — never goes below that.
 */
const computeNextDifficulty = (currentDifficulty, recentQualities) => {
  // Need at least 3 entries to consider climbing
  if (recentQualities.length >= 3) {
    const last3 = recentQualities.slice(-3);
    if (last3.every(q => q === 'good')) {
      if (currentDifficulty === 'easy')   return 'medium';
      if (currentDifficulty === 'medium') return 'hard';
    }
  }

  // Need at least 2 entries to consider dropping
  if (recentQualities.length >= 2) {
    const last2 = recentQualities.slice(-2);
    if (last2.every(q => q === 'poor')) {
      if (currentDifficulty === 'hard')   return 'medium';
      if (currentDifficulty === 'medium') return 'easy';
    }
  }

  return currentDifficulty;
};

/**
 * Update streak fields on the User document after a completed interview.
 * Streak increments if the last interview was yesterday (or today).
 * Resets to 1 if the gap is 2+ days.
 */
const updateStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    let newStreak = 1;

    if (user.lastInterviewDate) {
      const lastStr = user.lastInterviewDate.toISOString().slice(0, 10);
      if (lastStr === todayStr) {
        // Already interviewed today — keep streak as is
        newStreak = user.currentStreak || 1;
      } else {
        const diffMs = now - user.lastInterviewDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        newStreak = diffDays <= 1 ? (user.currentStreak || 0) + 1 : 1;
      }
    }

    user.lastInterviewDate = now;
    user.currentStreak = newStreak;
    user.longestStreak = Math.max(user.longestStreak || 0, newStreak);
    await user.save();
  } catch (err) {
    console.error('[Interview] Error updating streak:', err);
  }
};

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------

const synthesizeSpeechStream = async (text, voiceId = 'Matthew', format = 'mp3') => {
  const params = {
    OutputFormat: format,
    Text: text,
    TextType: 'text',
    VoiceId: voiceId,
    Engine: 'standard'
  };

  try {
    const result = await polly.synthesizeSpeech(params).promise();
    return result;
  } catch (err) {
    if (err.code === 'InvalidParameterValue') {
      console.log(`[Polly] Standard engine not available for ${voiceId}, falling back to neural`);
      params.Engine = 'neural';
      const result = await polly.synthesizeSpeech(params).promise();
      return result;
    }
    console.error('[Polly] Error during speech synthesis:', err);
    throw err;
  }
};

const streamAudio = (res, audioBuffer, format = 'mp3', filename = 'speech') => {
  const stream = Readable.from(audioBuffer);
  res.set({
    'Content-Type': `audio/${format}`,
    'Content-Disposition': `inline; filename="${filename}.${format}"`,
    'Cache-Control': 'no-cache'
  });
  stream.pipe(res);
};

// ---------------------------------------------------------------------------
// POST /api/interview/start
// ---------------------------------------------------------------------------
const startInterview = async (req, res) => {
  try {
    const { jobDescription, type, voiceId } = req.body;
    const userId = req.user.userId;
    const candidateName = req.user.name || 'Candidate';

    if (!jobDescription || !type || !voiceId) {
      return res.status(400).json({ error: 'Missing required fields: jobDescription, type, voiceId' });
    }

    if (!ALLOWED_TYPES.includes(type.toLowerCase())) {
      return res.status(400).json({ error: `Invalid interview type. Allowed: ${ALLOWED_TYPES.join(', ')}` });
    }
    if (!ALLOWED_VOICES.includes(voiceId)) {
      return res.status(400).json({ error: 'Invalid voice ID.' });
    }

    if (jobDescription.length > MAX_JOB_DESC_LENGTH) {
      return res.status(400).json({ error: `Job description must be ${MAX_JOB_DESC_LENGTH} characters or fewer.` });
    }

    const question = await generateResponse(voiceId, jobDescription, type.toLowerCase(), candidateName);

    const maxQuestions = Interview.getMaxQuestions(type.toLowerCase());
    const interview = new Interview({
      userId,
      candidateName,
      role: type.toLowerCase(),
      jobDescription,
      voiceId,
      maxQuestions,
      questionCount: 1,
      difficulty: 'easy',
      recentQualities: [],
      conversationHistory: [{
        question: question,
        answer: '',
        feedback: '',
        emotion: 'neutral',
        timestamp: new Date()
      }]
    });
    await interview.save();

    const pollyResponse = await synthesizeSpeechStream(question, voiceId);

    if (pollyResponse.AudioStream) {
      const updated = await User.findOneAndUpdate(
        { _id: userId, sessionsThisMonth: { $lt: 5 } },
        { $inc: { sessionsThisMonth: 1 } },
        { new: true }
      );

      if (!updated) {
        await Interview.findByIdAndDelete(interview._id);
        return res.status(429).json({
          error: 'Monthly session limit reached.',
          message: 'You have used all 5 interview sessions for this month.'
        });
      }

      res.setHeader('x-interview-id', interview._id.toString());
      res.setHeader('x-question-text', Buffer.from(question).toString('base64'));
      res.setHeader('x-difficulty', interview.difficulty);
      streamAudio(res, pollyResponse.AudioStream, 'mp3', 'question');
    } else {
      await Interview.findByIdAndDelete(interview._id);
      res.status(500).json({ error: 'Failed to synthesize speech.' });
    }
  } catch (err) {
    console.error('[Interview] Error in startInterview:', err);
    res.status(500).json({ error: 'Something went wrong starting the interview.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/interview/check
// ---------------------------------------------------------------------------
const checkAnswer = async (req, res) => {
  try {
    const { userAnswer, voiceId, interviewId, emotion } = req.body;

    if (!interviewId || !userAnswer) {
      return res.status(400).json({ error: 'interviewId and userAnswer are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ error: 'Invalid interview ID.' });
    }

    if (typeof userAnswer !== 'string' || userAnswer.length > MAX_ANSWER_LENGTH) {
      return res.status(400).json({ error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    if (interview.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (interview.status !== 'in-progress') {
      return res.status(400).json({ error: 'This interview has already ended.' });
    }

    const currentEntry = interview.conversationHistory[interview.conversationHistory.length - 1];
    const questionToEvaluate = currentEntry?.question || '';

    if (!questionToEvaluate) {
      return res.status(400).json({ error: 'No question available to evaluate.' });
    }

    const safeVoiceId = ALLOWED_VOICES.includes(voiceId) ? voiceId : 'Matthew';

    // Stop phrases
    const isStopping = /\b(stop|end|finish|quit|exit)\b.*\b(interview|session|here|now)\b/i.test(userAnswer);
    if (isStopping) {
      currentEntry.answer = userAnswer;
      currentEntry.emotion = emotion || 'neutral';
      interview.status = 'completed';
      interview.completedAt = new Date();
      await interview.save();
      await updateStreak(interview.userId);

      const endText = 'Thank you for your time. Let me prepare your evaluation report. Goodbye!';
      const pollyResponse = await synthesizeSpeechStream(endText, safeVoiceId);

      if (pollyResponse.AudioStream) {
        res.setHeader('x-interview-ended', 'true');
        res.setHeader('x-difficulty', interview.difficulty);
        return streamAudio(res, pollyResponse.AudioStream, 'mp3', 'end_interview');
      } else {
        return res.status(500).json({ error: 'Failed to synthesize speech.' });
      }
    }

    const recentHistory = interview.conversationHistory
      .filter(h => h.answer)
      .slice(-3);

    const isLastQuestion = interview.questionCount >= interview.maxQuestions;

    const {
      feedback = 'Thank you for your response.',
      nextQuestion = null,
      followUp = null,
      isRepeat = false,
      isEnding = false
    } = await evaluateAnswer(
      userAnswer,
      interview.role,
      questionToEvaluate,
      interview.candidateName,
      recentHistory,
      isLastQuestion,
      safeVoiceId,
      interview.difficulty
    );

    currentEntry.answer = userAnswer;
    currentEntry.feedback = feedback;
    currentEntry.emotion = emotion || 'neutral';

    // Update adaptive difficulty (skip for repeat requests)
    if (!isRepeat) {
      const quality = inferAnswerQuality(feedback, userAnswer);
      const updatedQualities = [...(interview.recentQualities || []), quality].slice(-5);
      interview.recentQualities = updatedQualities;
      interview.difficulty = computeNextDifficulty(interview.difficulty, updatedQualities);
    }

    let combinedText = feedback;

    if (isRepeat) {
      // Repeat the question — no changes to history or difficulty
    } else if (isEnding || isLastQuestion) {
      interview.status = 'completed';
      interview.completedAt = new Date();
      res.setHeader('x-interview-ended', 'true');
      await updateStreak(interview.userId);
    } else {
      const newQuestion = nextQuestion || followUp || null;
      if (newQuestion) {
        combinedText += `\n\n${newQuestion}`;
        interview.questionCount += 1;
        interview.conversationHistory.push({
          question: newQuestion,
          answer: '',
          feedback: '',
          emotion: 'neutral',
          timestamp: new Date()
        });
      } else {
        const fallbackQuestion = `Can you elaborate more on your experience related to ${interview.role}?`;
        combinedText += `\n\n${fallbackQuestion}`;
        interview.questionCount += 1;
        interview.conversationHistory.push({
          question: fallbackQuestion,
          answer: '',
          feedback: '',
          emotion: 'neutral',
          timestamp: new Date()
        });
      }
    }

    await interview.save();

    if (!combinedText.trim()) {
      return res.status(204).end();
    }

    const pollyResponse = await synthesizeSpeechStream(combinedText, safeVoiceId);
    if (pollyResponse.AudioStream) {
      res.setHeader('x-ai-text', Buffer.from(combinedText).toString('base64'));
      res.setHeader('x-difficulty', interview.difficulty);
      streamAudio(res, pollyResponse.AudioStream, 'mp3', 'feedback');
    } else {
      res.status(500).json({ error: 'Failed to synthesize speech.' });
    }
  } catch (err) {
    console.error('[Interview] Error in checkAnswer:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/interview/final-feedback
// ---------------------------------------------------------------------------
const getFinalFeedback = async (req, res) => {
  try {
    const interviewId = req.query.interviewId;
    if (!interviewId) {
      return res.status(400).json({ error: 'interviewId query parameter is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({ error: 'Invalid interview ID.' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    if (interview.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // If a valid report already exists, return it (fixes score=0 re-generation bug)
    if (interview.report && typeof interview.report.score === 'number') {
      return res.json(interview.report);
    }

    const history = interview.conversationHistory
      .filter(h => h.answer)
      .map(h => ({
        question: h.question,
        answer: h.answer,
        emotion: h.emotion
      }));

    if (history.length === 0) {
      return res.status(400).json({ error: 'No conversation history available.' });
    }

    const report = await generateFinalFeedback(
      interview.role,
      interview.candidateName,
      history
    );

    interview.report = report;
    if (interview.status !== 'completed') {
      interview.status = 'completed';
      interview.completedAt = new Date();
    }
    await interview.save();

    res.json(report);
  } catch (err) {
    console.error('[Interview] Error in getFinalFeedback:', err);
    res.status(500).json({ error: 'Failed to generate feedback.' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/interview/report/:id
// ---------------------------------------------------------------------------
const getReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid interview ID.' });
    }

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    if (interview.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({
      id: interview._id,
      candidateName: interview.candidateName,
      role: interview.role,
      status: interview.status,
      questionsAnswered: interview.conversationHistory.filter(h => h.answer).length,
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      report: interview.report,
      conversationHistory: interview.conversationHistory
    });
  } catch (err) {
    console.error('[Interview] Error getting report:', err);
    res.status(500).json({ error: 'Failed to load report.' });
  }
};

module.exports = { startInterview, checkAnswer, getFinalFeedback, getReport };
