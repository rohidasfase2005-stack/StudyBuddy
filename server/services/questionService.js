export function findDuplicates(db, questionText, userId) {
  const prefix = questionText.substring(0, 50);
  const stmt = db.prepare(`SELECT * FROM questions WHERE question_text LIKE ? AND user_id = ?`);
  return stmt.all(`${prefix}%`, userId);
}

export function getSubjectStats(db, userId) {
  const stmt = db.prepare(`
    SELECT subject, COUNT(*) as count 
    FROM questions 
    WHERE user_id = ? AND subject IS NOT NULL 
    GROUP BY subject
  `);
  return stmt.all(userId);
}

export function bulkInsertQuestions(db, questions, pdfId, userId) {
  let inserted = 0;
  let skipped = 0;
  let duplicates = 0;
  
  const checkStmt = db.prepare(`SELECT id FROM questions WHERE question_text = ? AND user_id = ?`);
  const insertStmt = db.prepare(`
    INSERT INTO questions (
      user_id, pdf_id, question_text, option_a, option_b, option_c, option_d, 
      correct_answer, explanation, subject, topic, page_number, needs_review
    ) VALUES (
      @userId, @pdfId, @question_text, @option_a, @option_b, @option_c, @option_d, 
      @correct_answer, @explanation, @subject, @topic, @page_number, @needs_review
    )
  `);
  
  const transaction = db.transaction((qs) => {
    for (const q of qs) {
      const existing = checkStmt.get(q.question_text, userId);
      if (existing) {
        duplicates++;
        skipped++;
        continue;
      }
      
      insertStmt.run({
        userId,
        pdfId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        subject: q.subject || 'General',
        topic: q.topic || 'Uncategorized',
        page_number: q.page_number || null,
        needs_review: q.needs_review ? 1 : 0
      });
      inserted++;
    }
  });
  
  transaction(questions);
  
  return { inserted, skipped, duplicates };
}
