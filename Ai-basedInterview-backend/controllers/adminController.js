const Interview = require('../models/Interview');

// @desc    Get overall stats for the dashboard
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getOverallStats = async (req, res) => {
  try {
    const totalInterviews = await Interview.countDocuments();
    
    // Aggregation for average score
    const scoreAgg = await Interview.aggregate([
      { $match: { "report.score": { $exists: true, $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: "$report.score" } } }
    ]);
    const averageScore = scoreAgg.length > 0 ? Math.round(scoreAgg[0].avgScore) : 0;

    // Interviews by category
    const categoryAgg = await Interview.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalInterviews,
        averageScore,
        interviewsByCategory: categoryAgg
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching stats' });
  }
};

// @desc    Get paginated recent interviews
// @route   GET /api/admin/interviews
// @access  Private/Admin
exports.getRecentInterviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const interviews = await Interview.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await Interview.countDocuments();

    // Map interviews to format frontend expects
    const formattedInterviews = interviews.map(inv => ({
      ...inv.toObject(),
      jobRole: inv.role,
      score: inv.report ? inv.report.score : null
    }));

    res.status(200).json({
      success: true,
      data: formattedInterviews,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recent interviews:', error);
    res.status(500).json({ success: false, message: 'Server error fetching interviews' });
  }
};

// @desc    Get detailed feedback for a specific interview
// @route   GET /api/admin/interviews/:id/feedback
// @access  Private/Admin
exports.getInterviewDetails = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview || !interview.report) {
      return res.status(404).json({ success: false, message: 'Feedback not found for this interview' });
    }

    res.status(200).json({
      success: true,
      data: {
        feedback: interview.report,
        interview
      }
    });
  } catch (error) {
    console.error('Error fetching interview details:', error);
    res.status(500).json({ success: false, message: 'Server error fetching details' });
  }
};
