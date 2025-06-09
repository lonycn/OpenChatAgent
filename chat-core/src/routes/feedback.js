const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { validateBody, feedbackSchema } = require("../middleware/validation");
const { asyncHandler } = require("../middleware/error");

const router = express.Router();

// 模拟反馈存储服务
const mockFeedbackService = {
  async saveFeedback(feedback) {
    console.log("MockFeedbackService: Saving feedback:", feedback);
    // 模拟保存到数据库
    return {
      id: uuidv4(),
      ...feedback,
      createdAt: new Date().toISOString(),
    };
  },
};

// POST /api/feedback (Submit Feedback)
router.post(
  "/",
  validateBody(feedbackSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, rating, comment, messageId } = req.body;
    const userId = req.user?.id;

    // 创建反馈对象
    const feedback = {
      sessionId,
      rating,
      comment: comment || null,
      messageId: messageId || null,
      userId,
      timestamp: new Date().toISOString(),
    };

    // 保存反馈
    const savedFeedback = await mockFeedbackService.saveFeedback(feedback);

    // 记录反馈接收日志
    console.log("Feedback received and processed:", {
      id: savedFeedback.id,
      sessionId,
      rating,
      userId,
      hasComment: !!comment,
      receivedAt: savedFeedback.createdAt,
    });

    res.status(201).json({
      success: true,
      message: "Feedback received. Thank you!",
      data: {
        feedbackId: savedFeedback.id,
        sessionId,
      },
    });
  })
);

module.exports = router;
