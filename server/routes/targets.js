import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to get today's date in YYYY-MM-DD
function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

// Calculate streak in days for a user
function calculateStreak(db, userId) {
  try {
    // Get distinct dates when user took a test or had study activity
    const testDates = db.prepare(`
      SELECT DISTINCT date(completed_at) as act_date 
      FROM tests 
      WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL
    `).all(userId).map(r => r.act_date);

    const actDates = db.prepare(`
      SELECT DISTINCT date(last_heartbeat) as act_date 
      FROM user_activity 
      WHERE user_id = ? AND last_heartbeat IS NOT NULL
    `).all(userId).map(r => r.act_date);

    const allDatesSet = new Set([...testDates, ...actDates].filter(Boolean));
    if (allDatesSet.size === 0) return 0;

    let streak = 0;
    const now = new Date();
    
    // Check consecutive days starting from today (or yesterday if no activity today yet)
    let checkDate = new Date();
    const todayStr = checkDate.toISOString().split('T')[0];
    
    // If no activity today, check if yesterday had activity
    if (!allDatesSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split('T')[0];
      if (!allDatesSet.has(yesterdayStr)) {
        return 0; // Streak broken
      }
    }

    // Count backwards
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (allDatesSet.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (err) {
    console.error('Streak calculation error:', err);
    return 1;
  }
}

// GET /api/targets - Fetch user target, schedules, and today's progress
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    // Get or create user target defaults
    let target = db.prepare('SELECT * FROM user_targets WHERE user_id = ?').get(userId);
    if (!target) {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO user_targets (id, user_id, daily_questions, daily_tests, daily_study_minutes)
        VALUES (?, ?, 20, 1, 60)
      `).run(id, userId);
      target = { id, user_id: userId, daily_questions: 20, daily_tests: 1, daily_study_minutes: 60 };
    }

    // Get schedules
    const schedules = db.prepare('SELECT * FROM user_schedules WHERE user_id = ? ORDER BY start_time ASC').all(userId);

    // Calculate today's progress
    const todayStr = getTodayDateStr();

    // 1. Questions answered today (from submitted tests or individual answers)
    const questionsToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM answers a
      JOIN tests t ON a.test_id = t.id
      WHERE t.user_id = ? AND date(t.started_at) = date('now') AND a.selected_answer IS NOT NULL
    `).get(userId)?.count || 0;

    // 2. Tests completed today
    const testsToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM tests 
      WHERE user_id = ? AND status = 'completed' AND date(completed_at) = date('now')
    `).get(userId)?.count || 0;

    // 3. Study minutes today (from user_activity)
    const secondsToday = db.prepare(`
      SELECT SUM(duration_seconds) as total 
      FROM user_activity 
      WHERE user_id = ? AND date(last_heartbeat) = date('now')
    `).get(userId)?.total || 0;
    const studyMinutesToday = Math.round(secondsToday / 60);

    // 4. Streak
    const streakDays = calculateStreak(db, userId);

    res.json({
      target: {
        daily_questions: target.daily_questions || 20,
        daily_tests: target.daily_tests || 1,
        daily_study_minutes: target.daily_study_minutes || 60,
      },
      progress: {
        questions_today: questionsToday,
        tests_today: testsToday,
        study_minutes_today: studyMinutesToday,
        streak_days: streakDays,
      },
      schedules: schedules || [],
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// PUT /api/targets - Update target settings
router.put('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { daily_questions = 20, daily_tests = 1, daily_study_minutes = 60 } = req.body;

    const existing = db.prepare('SELECT * FROM user_targets WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`
        UPDATE user_targets 
        SET daily_questions = ?, daily_tests = ?, daily_study_minutes = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(parseInt(daily_questions, 10), parseInt(daily_tests, 10), parseInt(daily_study_minutes, 10), userId);
    } else {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO user_targets (id, user_id, daily_questions, daily_tests, daily_study_minutes)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId, parseInt(daily_questions, 10), parseInt(daily_tests, 10), parseInt(daily_study_minutes, 10));
    }

    res.json({ message: 'Target updated successfully' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// POST /api/targets/schedules - Add a study slot
router.post('/schedules', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { title = 'Study Session', start_time = '09:00 AM', end_time = '10:00 AM' } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: true, message: 'Title, start time, and end time are required' });
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO user_schedules (id, user_id, title, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, title, start_time, end_time);

    const slot = db.prepare('SELECT * FROM user_schedules WHERE id = ?').get(id);
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// DELETE /api/targets/schedules/:id - Delete a study slot
router.delete('/schedules/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const scheduleId = req.params.id;

    db.prepare('DELETE FROM user_schedules WHERE id = ? AND user_id = ?').run(scheduleId, userId);
    res.json({ message: 'Schedule slot removed' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
