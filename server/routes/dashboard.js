import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateToken, (req, res, next) => {
  try {
    const userId = req.user.id;
    const db = getDb();

    const totalPdfs = db.prepare('SELECT COUNT(*) as count FROM pdfs WHERE user_id = ? OR (processing_status = "completed" AND question_count > 0)').get(userId)?.count || 0;
    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions WHERE (user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL) AND is_approved = 1').get(userId)?.count || 0;
    const testsAttempted = db.prepare('SELECT COUNT(*) as count FROM tests WHERE user_id = ? AND status = ?').get(userId, 'completed')?.count || 0;

    const scoreStats = db.prepare(`
      SELECT AVG(accuracy) as averageScore, MAX(accuracy) as bestScore
      FROM tests WHERE user_id = ? AND status = 'completed'
    `).get(userId);

    const recentTests = db.prepare(`
      SELECT id, test_name, score, accuracy, total_questions, completed_at
      FROM tests WHERE user_id = ? AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 5
    `).all(userId);

    const subjectCounts = db.prepare(`
      SELECT subject, COUNT(*) as count
      FROM questions WHERE (user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL) AND is_approved = 1 AND subject IS NOT NULL AND subject != ''
      GROUP BY subject ORDER BY count DESC
    `).all(userId);

    res.json({
      totalPdfs,
      totalQuestions,
      testsAttempted,
      averageScore: scoreStats?.averageScore ? parseFloat(Number(scoreStats.averageScore).toFixed(1)) : 0,
      bestScore: scoreStats?.bestScore ? parseFloat(Number(scoreStats.bestScore).toFixed(1)) : 0,
      recentTests,
      subjectCounts
    });
  } catch (err) {
    next(err);
  }
});

export default router;
