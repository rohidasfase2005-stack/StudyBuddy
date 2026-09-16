import express from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Record heartbeat and active time
router.post('/heartbeat', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { sessionId, activityType = 'general', durationSeconds = 30 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: true, message: 'sessionId is required' });
    }

    const existing = db.prepare('SELECT id, duration_seconds FROM user_activity WHERE user_id = ? AND session_id = ? AND activity_type = ?')
      .get(userId, sessionId, activityType);

    if (existing) {
      db.prepare('UPDATE user_activity SET duration_seconds = duration_seconds + ?, last_heartbeat = datetime(\'now\') WHERE id = ?')
        .run(durationSeconds, existing.id);
    } else {
      db.prepare('INSERT INTO user_activity (id, user_id, session_id, activity_type, duration_seconds) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), userId, sessionId, activityType, durationSeconds);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Get user activity stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const totalRow = db.prepare('SELECT COALESCE(SUM(duration_seconds), 0) as totalSeconds FROM user_activity WHERE user_id = ?').get(userId);
    const byType = db.prepare(`
      SELECT activity_type, COALESCE(SUM(duration_seconds), 0) as seconds
      FROM user_activity
      WHERE user_id = ?
      GROUP BY activity_type
    `).all(userId);

    res.json({
      totalSeconds: totalRow?.totalSeconds || 0,
      totalMinutes: Math.round((totalRow?.totalSeconds || 0) / 60),
      byType
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
