const Interview = require('../models/Interview');
const User = require('../models/User');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user info
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.checkAndResetMonthlyLimit();
    await user.save();

    // Clean up abandoned interviews (older than 1 hour, <= 1 question answered)
    const cleanupDate = new Date(Date.now() - 60 * 60 * 1000);
    await Interview.deleteMany({
      userId,
      status: 'in-progress',
      questionCount: { $lte: 1 },
      startedAt: { $lt: cleanupDate }
    });

    // Get all completed interviews for this user
    const interviews = await Interview.find({
      userId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    const totalInterviews = interviews.length;

    if (totalInterviews === 0) {
      return res.json({
        totalInterviews: 0,
        averageScore: 0,
        sessionsRemaining: Math.max(0, 5 - user.sessionsThisMonth),
        sessionsUsed: user.sessionsThisMonth,
        bestCategory: 'N/A',
        categoryBreakdown: {},
        scoreTrend: [],
        skillRadar: {
          communication: 0,
          confidence: 0,
          technical: 0,
          presentation: 0
        },
        aggregatedStrengths: [],
        aggregatedWeaknesses: [],
        weakTopics: [],
        percentileRank: null,
        streak: {
          current: user.currentStreak || 0,
          longest: user.longestStreak || 0,
          lastInterviewDate: user.lastInterviewDate || null
        }
      });
    }

    // Calculate average score
    const totalScore = interviews.reduce((sum, i) => sum + (i.report?.score || 0), 0);
    const averageScore = Math.round(totalScore / totalInterviews);

    // Category breakdown
    const categoryBreakdown = {};
    interviews.forEach(interview => {
      const role = interview.role.toLowerCase();
      if (!categoryBreakdown[role]) {
        categoryBreakdown[role] = { count: 0, totalScore: 0, avgScore: 0 };
      }
      categoryBreakdown[role].count++;
      categoryBreakdown[role].totalScore += (interview.report?.score || 0);
    });

    // Calculate avg per category and find best
    let bestCategory = 'N/A';
    let bestAvg = 0;
    Object.keys(categoryBreakdown).forEach(role => {
      const cat = categoryBreakdown[role];
      cat.avgScore = Math.round(cat.totalScore / cat.count);
      delete cat.totalScore;
      if (cat.avgScore > bestAvg) {
        bestAvg = cat.avgScore;
        bestCategory = role.charAt(0).toUpperCase() + role.slice(1);
      }
    });

    // Score trend (last 20 interviews)
    const scoreTrend = interviews.slice(0, 20).reverse().map(i => ({
      date: i.completedAt?.toISOString().split('T')[0] || i.startedAt.toISOString().split('T')[0],
      score: i.report?.score || 0,
      role: i.role
    }));

    // Skill radar — parse soft skills text to numeric scores
    const skillTotals = { communication: 0, confidence: 0, technical: 0, presentation: 0 };
    let skillCount = 0;

    interviews.forEach(interview => {
      if (interview.report?.soft_skills) {
        skillCount++;
        const ss = interview.report.soft_skills;
        skillTotals.communication += parseSkillScore(ss.communication);
        skillTotals.confidence += parseSkillScore(ss.confidence);
        skillTotals.presentation += parseSkillScore(ss.presentation);
      }
      skillTotals.technical += (interview.report?.score || 0);
    });

    const skillRadar = {
      communication: skillCount > 0 ? Math.round(skillTotals.communication / skillCount) : 0,
      confidence: skillCount > 0 ? Math.round(skillTotals.confidence / skillCount) : 0,
      technical: totalInterviews > 0 ? Math.round(skillTotals.technical / totalInterviews) : 0,
      presentation: skillCount > 0 ? Math.round(skillTotals.presentation / skillCount) : 0
    };

    // Aggregate strengths and weaknesses
    const strengthsMap = {};
    const weaknessesMap = {};

    interviews.forEach(interview => {
      if (interview.report?.strengths) {
        interview.report.strengths.forEach(s => {
          strengthsMap[s] = (strengthsMap[s] || 0) + 1;
        });
      }
      if (interview.report?.weaknesses) {
        interview.report.weaknesses.forEach(w => {
          weaknessesMap[w] = (weaknessesMap[w] || 0) + 1;
        });
      }
    });

    const aggregatedStrengths = Object.entries(strengthsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text);

    const aggregatedWeaknesses = Object.entries(weaknessesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text);

    // ---------------------------------------------------------------------------
    // Weak Topic Detection — aggregate questionBreakdown entries with score < 50
    // ---------------------------------------------------------------------------
    const topicScores = {};
    interviews.forEach(interview => {
      if (!Array.isArray(interview.report?.questionBreakdown)) return;
      interview.report.questionBreakdown.forEach(q => {
        const topic = (q.topic || 'General').trim();
        if (!topicScores[topic]) {
          topicScores[topic] = { total: 0, count: 0 };
        }
        topicScores[topic].total += q.score;
        topicScores[topic].count += 1;
      });
    });

    const weakTopics = Object.entries(topicScores)
      .map(([topic, { total, count }]) => ({
        topic,
        avgScore: Math.round(total / count),
        occurrences: count
      }))
      .filter(t => t.avgScore < 50)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 6);

    // ---------------------------------------------------------------------------
    // Percentile Ranking — compare user avg score vs all users in same roles
    // ---------------------------------------------------------------------------
    let percentileRank = null;
    try {
      // Get the set of roles this user has interviewed for
      const userRoles = [...new Set(interviews.map(i => i.role))];

      // Get all completed interviews across all users for the same roles
      const allInterviewsInRoles = await Interview.find({
        role: { $in: userRoles },
        status: 'completed',
        'report.score': { $exists: true }
      }).select('userId report.score');

      if (allInterviewsInRoles.length > 0) {
        // Compute per-user average scores
        const userAvgMap = {};
        allInterviewsInRoles.forEach(i => {
          const uid = i.userId.toString();
          if (!userAvgMap[uid]) userAvgMap[uid] = { total: 0, count: 0 };
          userAvgMap[uid].total += i.report?.score || 0;
          userAvgMap[uid].count += 1;
        });

        const allAvgs = Object.values(userAvgMap).map(u => Math.round(u.total / u.count));
        const usersBelow = allAvgs.filter(avg => avg < averageScore).length;
        percentileRank = Math.round((usersBelow / allAvgs.length) * 100);
      }
    } catch (percentileErr) {
      console.error('[Dashboard] Percentile calc error:', percentileErr);
    }

    // ---------------------------------------------------------------------------
    // Streak data
    // ---------------------------------------------------------------------------
    const streak = {
      current: user.currentStreak || 0,
      longest: user.longestStreak || 0,
      lastInterviewDate: user.lastInterviewDate || null
    };

    res.json({
      totalInterviews,
      averageScore,
      sessionsRemaining: Math.max(0, 5 - user.sessionsThisMonth),
      sessionsUsed: user.sessionsThisMonth,
      bestCategory,
      categoryBreakdown,
      scoreTrend,
      skillRadar,
      aggregatedStrengths,
      aggregatedWeaknesses,
      weakTopics,
      percentileRank,
      streak
    });

  } catch (err) {
    console.error('[Dashboard] Error getting stats:', err);
    res.status(500).json({ error: 'Failed to load dashboard stats.' });
  }
};

// GET /api/dashboard/history
const getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Clean up abandoned interviews
    const cleanupDate = new Date(Date.now() - 60 * 60 * 1000);
    await Interview.deleteMany({
      userId,
      status: 'in-progress',
      questionCount: { $lte: 1 },
      startedAt: { $lt: cleanupDate }
    });

    const total = await Interview.countDocuments({ userId });
    const interviews = await Interview.find({ userId })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('role status startedAt completedAt questionCount report.score');

    const history = interviews.map(i => ({
      id: i._id,
      date: i.startedAt?.toISOString().split('T')[0],
      role: i.role,
      score: i.report?.score || 0,
      status: i.status,
      questionsAnswered: i.questionCount
    }));

    res.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('[Dashboard] Error getting history:', err);
    res.status(500).json({ error: 'Failed to load interview history.' });
  }
};

// Helper: parse text like "Good - reason" into a numeric score
function parseSkillScore(text) {
  if (!text) return 50;
  const lower = text.toLowerCase();
  if (lower.includes('excellent') || lower.includes('outstanding')) return 90;
  if (lower.includes('good') || lower.includes('strong')) return 75;
  if (lower.includes('moderate') || lower.includes('average')) return 55;
  if (lower.includes('poor') || lower.includes('weak') || lower.includes('below')) return 30;
  return 50;
}

module.exports = { getStats, getHistory };
