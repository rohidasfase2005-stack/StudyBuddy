import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const totals = db.prepare(`
      SELECT
        COUNT(*) as totalTests,
        COALESCE(SUM(total_questions), 0) as totalQuestionsAttempted,
        COALESCE(AVG(accuracy), 0) as overallAccuracy,
        COALESCE(AVG(score), 0) as averageScore,
        COALESCE(MAX(accuracy), 0) as bestScore,
        COALESCE(SUM(time_taken), 0) as totalStudyTime
      FROM tests WHERE user_id = ? AND status = 'completed'
    `).get(userId);

    res.json({
      totalTests: totals?.totalTests || 0,
      totalQuestionsAttempted: totals?.totalQuestionsAttempted || 0,
      overallAccuracy: totals?.overallAccuracy ? parseFloat(Number(totals.overallAccuracy).toFixed(1)) : 0,
      averageScore: totals?.averageScore ? parseFloat(Number(totals.averageScore).toFixed(1)) : 0,
      bestScore: totals?.bestScore ? parseFloat(Number(totals.bestScore).toFixed(1)) : 0,
      totalStudyTime: totals?.totalStudyTime || 0
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/subjects', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const subjects = db.prepare(`
      SELECT q.subject, COUNT(*) as total_attempted,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN tests t ON a.test_id = t.id
      WHERE t.user_id = ? AND a.selected_answer IS NOT NULL AND t.status = 'completed'
      GROUP BY q.subject
    `).all(req.user.id);

    res.json(subjects.map(s => ({
      ...s,
      accuracy: s.total_attempted > 0 ? parseFloat(((s.correct_count / s.total_attempted) * 100).toFixed(1)) : 0
    })));
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/weak-topics', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const topics = db.prepare(`
      SELECT q.topic, q.subject, COUNT(*) as total_attempted,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN tests t ON a.test_id = t.id
      WHERE t.user_id = ? AND a.selected_answer IS NOT NULL AND t.status = 'completed'
        AND q.topic IS NOT NULL AND q.topic != ''
      GROUP BY q.topic, q.subject
      HAVING COUNT(*) >= 2
    `).all(req.user.id);

    const weak = topics
      .map(t => ({ ...t, accuracy: t.total_attempted > 0 ? parseFloat(((t.correct_count / t.total_attempted) * 100).toFixed(1)) : 0 }))
      .filter(t => t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    res.json(weak);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/history', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT id, test_name, score, accuracy, total_questions, completed_at as date
      FROM tests WHERE user_id = ? AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 20
    `).all(req.user.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/progress', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const progress = db.prepare(`
      SELECT strftime('%Y-%m', completed_at) as month, COUNT(*) as tests_count, AVG(accuracy) as avg_accuracy
      FROM tests WHERE user_id = ? AND status = 'completed'
      GROUP BY strftime('%Y-%m', completed_at)
      ORDER BY month ASC
    `).all(req.user.id);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
