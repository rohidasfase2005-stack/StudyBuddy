import express from 'express';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../db/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: true, message: 'Please provide name, email, and password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: true, message: 'Password must be at least 6 characters.' });
    }

    const db = getDb();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: true, message: 'Email already in use.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = crypto.randomUUID();
    const userRole = (role === 'admin') ? 'admin' : 'student';

    db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(userId, name, email, hashedPassword, userRole);
    const token = await generateToken(userId, userRole);

    res.status(201).json({
      token,
      user: { id: userId, name, email, role: userRole }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Please provide email and password.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: true, message: 'Invalid credentials.' });
    }

    const isMatch = await bcryptjs.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: true, message: 'Invalid credentials.' });
    }

    const role = user.role || 'student';
    const token = await generateToken(user.id, role);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
