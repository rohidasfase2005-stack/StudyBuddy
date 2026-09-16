import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Generate a new test (supports multiple PDFs, modes, and question counts)
router.post('/generate', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const {
      questionCount = 10,
      subjects = [],
      topics = [],
      difficulties = [],
      mode = 'random',
      timeLimit = 0,
      pdfId = null,
      pdfIds = []
    } = req.body;
    const userId = req.user.id;

    // Normalize selected PDFs
    let pdfIdList = [];
    if (Array.isArray(pdfIds) && pdfIds.length > 0) {
      pdfIdList = pdfIds.filter(Boolean);
    } else if (pdfId) {
      pdfIdList = [pdfId];
    }

    // Build query to select questions
    let whereClauses = ['is_approved = 1'];
    let params = [];

    if (pdfIdList.length > 0) {
      whereClauses.push(`pdf_id IN (${pdfIdList.map(() => '?').join(',')})`);
      params.push(...pdfIdList);
    } else {
      whereClauses.push('(user_id = ? OR is_demo = 1 OR pdf_id IS NOT NULL)');
      params.push(userId);
    }

    if (subjects.length > 0) {
      whereClauses.push(`subject IN (${subjects.map(() => '?').join(',')})`);
      params.push(...subjects);
    }
    if (topics.length > 0) {
      whereClauses.push(`topic IN (${topics.map(() => '?').join(',')})`);
      params.push(...topics);
    }
    if (difficulties.length > 0) {
      whereClauses.push(`difficulty IN (${difficulties.map(() => '?').join(',')})`);
      params.push(...difficulties);
    }

    if (questionCount !== undefined && parseInt(questionCount, 10) <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Question count must be at least 1.'
      });
    }

    // Mode-specific filters
    if (mode === 'wrong') {
      whereClauses.push(`(attempt_count > 0 AND correct_count < attempt_count OR id IN (
        SELECT DISTINCT a.question_id 
        FROM answers a 
        JOIN tests t ON a.test_id = t.id 
        WHERE t.user_id = ? AND a.is_correct = 0
      ))`);
      params.push(userId);
    } else if (mode === 'unattempted') {
      whereClauses.push('attempt_count = 0');
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Available question count validation
    const totalAvail = db.prepare(`SELECT COUNT(*) as count FROM questions ${whereSql}`).get(...params)?.count || 0;
    if (totalAvail === 0) {
      return res.status(400).json({
        error: true,
        message: 'No questions match the selected criteria. Please select different PDFs or options.'
      });
    }

    const countToTake = parseInt(questionCount, 10) || 10;
    if (countToTake > totalAvail) {
      return res.status(400).json({
        error: true,
        message: `Only ${totalAvail} questions are available from the selected PDFs. Please select ${totalAvail} or fewer questions, or select additional PDFs.`
      });
    }

    let questions;

    if (mode === 'balanced_subject') {
      // Get available subjects
      const availSubjects = db.prepare(`SELECT DISTINCT subject FROM questions ${whereSql}`).all(...params);
      if (availSubjects.length === 0) {
        return res.status(400).json({ error: true, message: 'No questions match the selected criteria.' });
      }
      const perSubject = Math.ceil(countToTake / availSubjects.length);
      questions = [];
      for (const s of availSubjects) {
        const subjectQs = db.prepare(`SELECT * FROM questions ${whereSql} AND subject = ? ORDER BY RANDOM() LIMIT ?`)
          .all(...params, s.subject, perSubject);
        questions.push(...subjectQs);
      }
      // Shuffle and trim to exact count
      questions = questions.sort(() => Math.random() - 0.5).slice(0, countToTake);
    } else if (mode === 'balanced_difficulty') {
      const diffs = ['Easy', 'Medium', 'Hard'];
      const perDiff = Math.ceil(countToTake / diffs.length);
      questions = [];
      for (const d of diffs) {
        const diffQs = db.prepare(`SELECT * FROM questions ${whereSql} AND difficulty = ? ORDER BY RANDOM() LIMIT ?`)
          .all(...params, d, perDiff);
        questions.push(...diffQs);
      }
      questions = questions.sort(() => Math.random() - 0.5).slice(0, countToTake);
    } else {
      // Random or other modes
      questions = db.prepare(`SELECT * FROM questions ${whereSql} ORDER BY RANDOM() LIMIT ?`)
        .all(...params, countToTake);
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: true, message: 'No questions match the selected criteria.' });
    }

    // Create test
    const testId = crypto.randomUUID();
    const testName = mode === 'wrong' ? 'Wrong Questions Practice' :
                     mode === 'unattempted' ? 'Unattempted Questions' :
                     pdfIdList.length === 1 ? 'PDF Practice Test' :
                     pdfIdList.length > 1 ? `Combined Mock Test (${pdfIdList.length} PDFs)` :
                     subjects.length === 1 ? `${subjects[0]} Practice` :
                     `Practice Test`;

    db.prepare(`INSERT INTO tests (id, user_id, test_name, test_mode, total_questions, time_limit, status) VALUES (?, ?, ?, ?, ?, ?, 'in_progress')`)
      .run(testId, userId, testName, mode, questions.length, timeLimit || 0);

    // Create test_questions with shuffled options based on option count
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const optCount = [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o && o.trim() !== '').length;
      const validIndices = Array.from({ length: Math.max(optCount, 2) }, (_, idx) => idx);
      const indices = validIndices.sort(() => Math.random() - 0.5);
      const tqId = crypto.randomUUID();
      db.prepare(`INSERT INTO test_questions (id, test_id, question_id, question_order, shuffled_options) VALUES (?, ?, ?, ?, ?)`)
        .run(tqId, testId, q.id, i + 1, JSON.stringify(indices));
    }

    // Return test with questions
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId);
    const testQuestions = db.prepare(`
      SELECT tq.question_order, tq.shuffled_options, tq.question_id,
             q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.subject, q.topic, q.difficulty
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      WHERE tq.test_id = ?
      ORDER BY tq.question_order ASC
    `).all(testId);

    res.status(201).json({ test, questions: testQuestions });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/tests/wrong-summary - Get list and count of wrong questions for student
router.get('/wrong-summary', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    const wrongQuestions = db.prepare(`
      SELECT DISTINCT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
             q.correct_answer, q.explanation, q.subject, q.topic, q.difficulty
      FROM questions q
      JOIN answers a ON q.id = a.question_id
      JOIN tests t ON a.test_id = t.id
      WHERE t.user_id = ? AND a.is_correct = 0
      GROUP BY q.id
      ORDER BY q.subject ASC
    `).all(userId);

    res.json({
      totalWrong: wrongQuestions.length,
      questions: wrongQuestions
    });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// List tests
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = db.prepare('SELECT COUNT(*) as total FROM tests WHERE user_id = ?').get(req.user.id)?.total || 0;
    const tests = db.prepare('SELECT * FROM tests WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?').all(req.user.id, parseInt(limit), offset);
    res.json({ tests, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Get test with questions
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const test = db.prepare('SELECT * FROM tests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!test) return res.status(404).json({ error: true, message: 'Test not found' });

    const questions = db.prepare(`
      SELECT tq.question_order, tq.shuffled_options, tq.question_id,
             q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.subject, q.topic,
             a.selected_answer, a.is_marked, a.time_spent
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      LEFT JOIN answers a ON a.test_id = tq.test_id AND a.question_id = tq.question_id
      WHERE tq.test_id = ?
      ORDER BY tq.question_order ASC
    `).all(test.id);

    res.json({ ...test, questions });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Save answer
router.post('/:id/answer', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { questionId, selectedAnswer, isMarked = false, timeSpent = 0 } = req.body;
    const testId = req.params.id;

    // Verify test belongs to user and is in_progress
    const test = db.prepare('SELECT * FROM tests WHERE id = ? AND user_id = ?').get(testId, req.user.id);
    if (!test) return res.status(404).json({ error: true, message: 'Test not found' });
    if (test.status === 'completed') return res.status(400).json({ error: true, message: 'Test is already completed' });

    // Get question and test_question for shuffle mapping
    const tq = db.prepare('SELECT * FROM test_questions WHERE test_id = ? AND question_id = ?').get(testId, questionId);
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
    if (!tq || !q) return res.status(404).json({ error: true, message: 'Question not found in test' });

    // Determine correctness
    let isCorrect = 0;
    if (selectedAnswer !== null && selectedAnswer !== undefined) {
      const shuffled = JSON.parse(tq.shuffled_options || '[0,1,2,3]');
      const originalSelected = shuffled[selectedAnswer];
      isCorrect = (originalSelected === q.correct_answer) ? 1 : 0;
    }

    // Upsert answer
    const existing = db.prepare('SELECT id FROM answers WHERE test_id = ? AND question_id = ?').get(testId, questionId);
    if (existing) {
      db.prepare(`
        UPDATE answers SET selected_answer = ?, is_correct = ?, is_marked = ?, time_spent = ?
        WHERE test_id = ? AND question_id = ?
      `).run(selectedAnswer, isCorrect, isMarked ? 1 : 0, timeSpent, testId, questionId);
    } else {
      const ansId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO answers (id, test_id, question_id, selected_answer, is_correct, is_marked, time_spent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(ansId, testId, questionId, selectedAnswer, isCorrect, isMarked ? 1 : 0, timeSpent);
    }

    res.json({ success: true, isCorrect: isCorrect === 1 });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Submit test
router.post('/:id/submit', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const testId = req.params.id;
    const test = db.prepare('SELECT * FROM tests WHERE id = ? AND user_id = ?').get(testId, req.user.id);
    if (!test) return res.status(404).json({ error: true, message: 'Test not found' });

    const answers = db.prepare('SELECT * FROM answers WHERE test_id = ?').all(testId);
    let correctCount = 0, wrongCount = 0, timeTaken = 0;

    for (const a of answers) {
      if (a.selected_answer !== null && a.selected_answer !== undefined) {
        if (a.is_correct) correctCount++;
        else wrongCount++;
      }
      timeTaken += (a.time_spent || 0);
    }

    const skippedCount = test.total_questions - correctCount - wrongCount;
    const accuracy = test.total_questions > 0 ? (correctCount / test.total_questions) * 100 : 0;

    db.prepare(`
      UPDATE tests SET status = 'completed', score = ?, correct_count = ?, wrong_count = ?,
        skipped_count = ?, accuracy = ?, time_taken = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(correctCount, correctCount, wrongCount, skippedCount, accuracy, req.body.timeTaken || timeTaken, testId);

    // Update question stats
    for (const a of answers) {
      if (a.selected_answer !== null && a.selected_answer !== undefined) {
        db.prepare('UPDATE questions SET attempt_count = attempt_count + 1, correct_count = correct_count + ? WHERE id = ?')
          .run(a.is_correct ? 1 : 0, a.question_id);
      }
    }

    const result = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Test results
router.get('/:id/result', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const test = db.prepare('SELECT * FROM tests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!test) return res.status(404).json({ error: true, message: 'Test not found' });

    const subjectWise = db.prepare(`
      SELECT q.subject,
             COUNT(*) as total,
             SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct,
             SUM(CASE WHEN a.is_correct = 0 AND a.selected_answer IS NOT NULL THEN 1 ELSE 0 END) as wrong,
             SUM(CASE WHEN a.selected_answer IS NULL THEN 1 ELSE 0 END) as skipped
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      LEFT JOIN answers a ON a.test_id = tq.test_id AND a.question_id = tq.question_id
      WHERE tq.test_id = ?
      GROUP BY q.subject
    `).all(test.id);

    res.json({ test, subjectWise });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Test review
router.get('/:id/review', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const test = db.prepare('SELECT * FROM tests WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!test) return res.status(404).json({ error: true, message: 'Test not found' });

    const questions = db.prepare(`
      SELECT tq.question_order, tq.shuffled_options, tq.question_id,
             q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
             q.correct_answer, q.explanation, q.subject, q.topic,
             a.selected_answer, a.is_correct, a.time_spent
      FROM test_questions tq
      JOIN questions q ON tq.question_id = q.id
      LEFT JOIN answers a ON a.test_id = tq.test_id AND a.question_id = tq.question_id
      WHERE tq.test_id = ?
      ORDER BY tq.question_order ASC
    `).all(test.id);

    res.json({ test, questions });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
