import express from 'express';
import { getDb } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadMultipleMiddleware } from '../middleware/upload.js';
import crypto from 'crypto';
import fs from 'fs';
import { extractTextFromPdf } from '../parsers/pdfExtractor.js';
import { parseQuestions } from '../parsers/questionParser.js';

const router = express.Router();

async function processPdf(pdfId) {
  const db = getDb();
  try {
    db.prepare(`UPDATE pdfs SET processing_status = 'processing' WHERE id = ?`).run(pdfId);
    const pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ?`).get(pdfId);
    if (!pdf) return;

    const { text, numPages } = await extractTextFromPdf(pdf.file_path);
    const parsedQuestions = parseQuestions(text, pdf.original_name);

    for (const q of parsedQuestions) {
      db.prepare(`
        INSERT INTO questions (id, pdf_id, user_id, question_text, option_a, option_b, option_c, option_d,
          correct_answer, explanation, subject, topic, difficulty, page_number, needs_review, is_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        crypto.randomUUID(), pdfId, pdf.user_id, q.question_text,
        q.option_a, q.option_b, q.option_c || '', q.option_d || '',
        q.correct_answer ?? 0, q.explanation || '', q.subject || 'General', q.topic || '',
        q.difficulty || 'Medium', q.page_number || null, q.needs_review ? 1 : 0
      );
    }

    db.prepare(`UPDATE pdfs SET question_count = ?, page_count = ?, processing_status = 'completed' WHERE id = ?`)
      .run(parsedQuestions.length, numPages || 0, pdfId);

    console.log(`PDF ${pdf.original_name}: ${parsedQuestions.length} questions extracted`);
  } catch (err) {
    console.error(`PDF processing failed for ${pdfId}:`, err.message);
    db.prepare(`UPDATE pdfs SET processing_status = 'failed', error_message = ? WHERE id = ?`)
      .run(err.message || 'Unknown error', pdfId);
  }
}

// Upload single or multiple PDFs
router.post('/upload', authenticateToken, (req, res, next) => {
  uploadMultipleMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: true, message: 'File too large. Maximum size is 50MB per file.' });
      }
      return res.status(400).json({ error: true, message: err.message || 'Upload failed.' });
    }

    try {
      const files = [];
      if (req.file) files.push(req.file);
      if (req.files) {
        if (Array.isArray(req.files.files)) files.push(...req.files.files);
        if (Array.isArray(req.files.file)) files.push(...req.files.file);
      }

      if (files.length === 0) {
        return res.status(400).json({ error: true, message: 'No PDF file uploaded.' });
      }

      const db = getDb();
      const createdPdfs = [];

      for (const file of files) {
        const id = crypto.randomUUID();
        db.prepare(`INSERT INTO pdfs (id, user_id, filename, original_name, file_path, processing_status) VALUES (?, ?, ?, ?, ?, 'pending')`)
          .run(id, req.user.id, file.filename, file.originalname, file.path);

        const pdfRecord = db.prepare(`SELECT * FROM pdfs WHERE id = ?`).get(id);
        createdPdfs.push(pdfRecord);

        // Process asynchronously
        setTimeout(() => processPdf(id), 100);
      }

      // If single file uploaded, return the object directly for backward compatibility
      if (createdPdfs.length === 1) {
        return res.status(201).json(createdPdfs[0]);
      }

      res.status(201).json({ count: createdPdfs.length, pdfs: createdPdfs });
    } catch (error) {
      next(error);
    }
  });
});

// List PDFs (Admins see all; Students see all completed / seeded / user PDFs)
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let pdfs;
    if (req.user.role === 'admin') {
      pdfs = db.prepare(`SELECT * FROM pdfs ORDER BY uploaded_at DESC`).all();
    } else {
      // Students see all completed PDFs with question count > 0, plus any pending/processing PDFs they uploaded themselves
      pdfs = db.prepare(`
        SELECT * FROM pdfs 
        WHERE (processing_status = 'completed' AND question_count > 0) OR user_id = ?
        ORDER BY uploaded_at DESC
      `).all(req.user.id);
    }
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Get single PDF
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let pdf;
    if (req.user.role === 'admin') {
      pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ?`).get(req.params.id);
    } else {
      pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ? AND (user_id = ? OR processing_status = 'completed')`).get(req.params.id, req.user.id);
    }
    if (!pdf) return res.status(404).json({ error: true, message: 'PDF not found' });
    res.json(pdf);
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Delete PDF (Admin or Owner)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let pdf;
    if (req.user.role === 'admin') {
      pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ?`).get(req.params.id);
    } else {
      pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
    }
    if (!pdf) return res.status(404).json({ error: true, message: 'PDF not found or unauthorized' });

    db.prepare(`DELETE FROM questions WHERE pdf_id = ?`).run(pdf.id);
    db.prepare(`DELETE FROM pdfs WHERE id = ?`).run(pdf.id);

    try {
      if (fs.existsSync(pdf.file_path)) fs.unlinkSync(pdf.file_path);
    } catch (e) {
      console.error('Failed to delete file:', e.message);
    }

    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

// Reprocess PDF
router.post('/:id/reprocess', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let pdf;
    if (req.user.role === 'admin') {
      pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ?`).get(req.params.id);
    } else {
      pdf = db.prepare(`SELECT * FROM pdfs WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
    }
    if (!pdf) return res.status(404).json({ error: true, message: 'PDF not found or unauthorized' });

    db.prepare(`DELETE FROM questions WHERE pdf_id = ?`).run(pdf.id);
    db.prepare(`UPDATE pdfs SET processing_status = 'pending', question_count = 0, error_message = NULL WHERE id = ?`).run(pdf.id);

    setTimeout(() => processPdf(pdf.id), 100);
    res.json({ message: 'Reprocessing triggered' });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

export default router;
