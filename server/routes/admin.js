import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Enforce admin access on all admin routes
router.use(authenticateToken, requireAdmin);

// GET /api/admin/dashboard - Overview stats
router.get('/dashboard', (req, res) => {
  try {
    const db = getDb();

    // Student count (role = 'student' or all non-admin)
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get()?.count || 0;

    // Active students (activity in last 7 days or any user_activity)
    const activeStudents = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM user_activity 
      WHERE last_heartbeat >= datetime('now', '-7 days')
    `).get()?.count || 0;

    // Total study time across all students (in seconds)
    const totalStudyTimeRow = db.prepare('SELECT COALESCE(SUM(duration_seconds), 0) as totalSeconds FROM user_activity').get();
    const totalStudyTimeSeconds = totalStudyTimeRow?.totalSeconds || 0;

    // Total tests taken
    const testStats = db.prepare(`
      SELECT 
        COUNT(*) as totalTests,
        COALESCE(AVG(accuracy), 0) as avgAccuracy,
        COALESCE(SUM(total_questions), 0) as totalQuestionsAttempted
      FROM tests WHERE status = 'completed'
    `).get();

    // Total questions in bank
    const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get()?.count || 0;
    const totalPdfs = db.prepare('SELECT COUNT(*) as count FROM pdfs').get()?.count || 0;

    // Chatbot interactions count
    const chatStats = db.prepare("SELECT COUNT(*) as totalMessages FROM chat_messages").get()?.totalMessages || 0;

    res.json({
      studentCount,
      totalStudents: studentCount,
      activeStudents,
      activeToday: activeStudents,
      totalStudyTimeMinutes: Math.round(totalStudyTimeSeconds / 60),
      totalStudyTimeSeconds,
      totalTests: testStats?.totalTests || 0,
      avgAccuracy: testStats?.avgAccuracy ? parseFloat(Number(testStats.avgAccuracy).toFixed(1)) : 0,
      totalQuestionsAttempted: testStats?.totalQuestionsAttempted || 0,
      totalQuestions,
      totalPdfs,
      chatMessagesCount: chatStats
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/admin/students - List all students with performance overview
router.get('/students', (req, res) => {
  try {
    const db = getDb();

    const students = db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.created_at,
        COALESCE(SUM(a.duration_seconds), 0) as study_time_seconds,
        (SELECT COUNT(*) FROM tests t WHERE t.user_id = u.id AND t.status = 'completed') as tests_count,
        (SELECT COALESCE(AVG(accuracy), 0) FROM tests t WHERE t.user_id = u.id AND t.status = 'completed') as avg_accuracy
      FROM users u
      LEFT JOIN user_activity a ON u.id = a.user_id
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    const formatted = students.map(s => ({
      ...s,
      study_time_minutes: Math.round(s.study_time_seconds / 60),
      avg_accuracy: parseFloat(Number(s.avg_accuracy).toFixed(1))
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/admin/students/:id - Individual student details and activity
router.get('/students/:id', (req, res) => {
  try {
    const db = getDb();
    const studentId = req.params.id;

    const student = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({ error: true, message: 'Student not found.' });
    }

    // Student tests
    const tests = db.prepare(`
      SELECT id, test_name, total_questions, score, correct_count, wrong_count, skipped_count, accuracy, time_taken, status, completed_at
      FROM tests 
      WHERE user_id = ? 
      ORDER BY started_at DESC
    `).all(studentId);

    // Student activity logs
    const activities = db.prepare(`
      SELECT id, session_id, activity_type, duration_seconds, last_heartbeat, created_at
      FROM user_activity
      WHERE user_id = ?
      ORDER BY last_heartbeat DESC
    `).all(studentId);

    // Total study time
    const totalStudyTimeRow = db.prepare('SELECT COALESCE(SUM(duration_seconds), 0) as totalSeconds FROM user_activity WHERE user_id = ?').get(studentId);

    res.json({
      student,
      tests,
      activities,
      totalStudyTimeMinutes: Math.round((totalStudyTimeRow?.totalSeconds || 0) / 60),
      totalStudyTimeSeconds: totalStudyTimeRow?.totalSeconds || 0
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/admin/analytics/tests - Test analytics
router.get('/analytics/tests', (req, res) => {
  try {
    const db = getDb();

    const modeBreakdown = db.prepare(`
      SELECT test_mode, COUNT(*) as count, AVG(accuracy) as avg_accuracy
      FROM tests WHERE status = 'completed'
      GROUP BY test_mode
    `).all();

    const scoreDistribution = db.prepare(`
      SELECT 
        CASE 
          WHEN accuracy >= 80 THEN '80-100%'
          WHEN accuracy >= 60 THEN '60-79%'
          WHEN accuracy >= 40 THEN '40-59%'
          ELSE '0-39%'
        END as range,
        COUNT(*) as count
      FROM tests WHERE status = 'completed'
      GROUP BY range
    `).all();

    res.json({
      modeBreakdown,
      scoreDistribution
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/admin/analytics/chatbot - Chatbot analytics
router.get('/analytics/chatbot', (req, res) => {
  try {
    const db = getDb();

    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get()?.count || 0;
    const userQueries = db.prepare("SELECT COUNT(*) as count FROM chat_messages WHERE role = 'user'").get()?.count || 0;

    const recentQueries = db.prepare(`
      SELECT cm.id, cm.message, cm.created_at, u.name as user_name
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.role = 'user'
      ORDER BY cm.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      totalMessages,
      userQueries,
      recentQueries
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
