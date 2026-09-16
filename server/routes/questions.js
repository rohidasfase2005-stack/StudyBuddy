import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// List questions with pagination and filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, subject, topic, difficulty, pdf_id, search, needs_review, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClauses = ['(user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL)'];
    let params = [req.user.id];

    if (subject) { whereClauses.push('subject = ?'); params.push(subject); }
    if (topic) { whereClauses.push('topic = ?'); params.push(topic); }
    if (difficulty) { whereClauses.push('difficulty = ?'); params.push(difficulty); }
    if (pdf_id) { whereClauses.push('pdf_id = ?'); params.push(pdf_id); }
    if (needs_review !== undefined) { whereClauses.push('needs_review = ?'); params.push(parseInt(needs_review)); }
    if (search) {
      whereClauses.push('(question_text LIKE ? OR option_a LIKE ? OR option_b LIKE ? OR option_c LIKE ? OR option_d LIKE ? OR subject LIKE ? OR topic LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const allowedSorts = ['created_at', 'subject', 'difficulty', 'question_text'];
    const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM questions ${whereSql}`).get(...params);
    const questions = db.prepare(`SELECT * FROM questions ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

    res.json({
      questions,
      total: totalRow?.total || 0,
      page: parseInt(page),
      totalPages: Math.ceil((totalRow?.total || 0) / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Get distinct subjects
router.get('/subjects', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const subjects = db.prepare(`SELECT subject, COUNT(*) as count FROM questions WHERE (user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL) AND is_approved = 1 AND subject IS NOT NULL AND subject != '' GROUP BY subject ORDER BY count DESC`).all(req.user.id);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Get distinct topics
router.get('/topics', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { subject } = req.query;
    let query = `SELECT topic, COUNT(*) as count FROM questions WHERE (user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL) AND is_approved = 1 AND topic IS NOT NULL AND topic != ''`;
    const params = [req.user.id];
    if (subject) {
      query += ` AND subject = ?`;
      params.push(subject);
    }
    query += ` GROUP BY topic ORDER BY count DESC`;
    const topics = db.prepare(query).all(...params);
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Search questions
router.get('/search', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { q } = req.query;
    if (!q) return res.json([]);
    const s = `%${q}%`;
    const questions = db.prepare(`
      SELECT * FROM questions WHERE (user_id = ? OR is_demo = 1) AND
      (question_text LIKE ? OR option_a LIKE ? OR option_b LIKE ? OR option_c LIKE ? OR option_d LIKE ? OR subject LIKE ? OR topic LIKE ?)
      LIMIT 50
    `).all(req.user.id, s, s, s, s, s, s, s);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Get single question
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const question = db.prepare(`
      SELECT q.*, p.original_name as pdf_name
      FROM questions q LEFT JOIN pdfs p ON q.pdf_id = p.id
      WHERE q.id = ? AND (q.user_id = ? OR q.is_demo = 1 OR q.pdf_id IS NOT NULL)
    `).get(req.params.id, req.user.id);
    if (!question) return res.status(404).json({ error: true, message: 'Question not found' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Update question
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM questions WHERE id = ? AND (user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL)').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: true, message: 'Question not found' });

    const { question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, difficulty, is_approved, needs_review } = req.body;

    db.prepare(`
      UPDATE questions SET
        question_text = COALESCE(?, question_text),
        option_a = COALESCE(?, option_a),
        option_b = COALESCE(?, option_b),
        option_c = COALESCE(?, option_c),
        option_d = COALESCE(?, option_d),
        correct_answer = COALESCE(?, correct_answer),
        explanation = COALESCE(?, explanation),
        subject = COALESCE(?, subject),
        topic = COALESCE(?, topic),
        difficulty = COALESCE(?, difficulty),
        is_approved = COALESCE(?, is_approved),
        needs_review = COALESCE(?, needs_review)
      WHERE id = ?
    `).run(
      question_text ?? null, option_a ?? null, option_b ?? null, option_c ?? null, option_d ?? null,
      correct_answer ?? null, explanation ?? null, subject ?? null, topic ?? null, difficulty ?? null,
      is_approved ?? null, needs_review ?? null, req.params.id
    );

    const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Delete question
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const question = db.prepare('SELECT * FROM questions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!question) return res.status(404).json({ error: true, message: 'Question not found' });

    db.prepare('DELETE FROM questions WHERE id = ?').run(question.id);
    if (question.pdf_id) {
      db.prepare('UPDATE pdfs SET question_count = MAX(0, question_count - 1) WHERE id = ?').run(question.pdf_id);
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Approve all questions for a PDF
router.post('/approve-all/:pdfId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('UPDATE questions SET is_approved = 1, needs_review = 0 WHERE pdf_id = ? AND user_id = ?').run(req.params.pdfId, req.user.id);
    res.json({ message: `${result.changes} questions approved`, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Check for duplicates
router.post('/check-duplicates', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { question_text } = req.body;
    if (!question_text) return res.status(400).json({ error: true, message: 'question_text is required' });
    const snippet = question_text.substring(0, 50);
    const duplicates = db.prepare('SELECT * FROM questions WHERE (user_id = ? OR is_demo = 1) AND question_text LIKE ? LIMIT 10').all(req.user.id, `${snippet}%`);
    res.json(duplicates);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
