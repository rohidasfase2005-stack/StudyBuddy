import * as jose from 'jose';
import { getDb } from '../db/database.js';

const getSecret = () => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only-min-32-chars';
  return new TextEncoder().encode(secret);
};

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: true, message: 'Access denied. No token provided.' });
    }

    const { payload } = await jose.jwtVerify(token, getSecret());
    
    // Attach user information including role
    req.user = {
      id: payload.id,
      role: payload.role || 'student'
    };

    // If role not present in payload, fetch from DB
    if (!payload.role) {
      try {
        const db = getDb();
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(payload.id);
        if (user) req.user.role = user.role || 'student';
      } catch (err) {
        // ignore
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: true, message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: true, message: 'Access denied. Admin privileges required.' });
  }
  next();
};

export const generateToken = async (userId, role = 'student') => {
  const jwt = await new jose.SignJWT({ id: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
  
  return jwt;
};

export default { authenticateToken, requireAdmin, generateToken };
