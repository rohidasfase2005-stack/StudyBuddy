export function getSubjectPerformance(db, userId) {
  const stmt = db.prepare(`
    SELECT 
      q.subject, 
      COUNT(ua.id) as total_attempted, 
      SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct,
      ROUND(CAST(SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(ua.id) * 100, 2) as accuracy
    FROM user_answers ua
    JOIN questions q ON ua.question_id = q.id
    WHERE ua.user_id = ? AND q.subject IS NOT NULL
    GROUP BY q.subject
  `);
  return stmt.all(userId);
}

export function getWeakTopics(db, userId) {
  const stmt = db.prepare(`
    SELECT 
      q.topic, 
      q.subject,
      COUNT(ua.id) as total_attempted,
      ROUND(CAST(SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(ua.id) * 100, 2) as accuracy
    FROM user_answers ua
    JOIN questions q ON ua.question_id = q.id
    WHERE ua.user_id = ? AND q.topic IS NOT NULL
    GROUP BY q.topic, q.subject
    HAVING total_attempted >= 3 AND accuracy < 70
    ORDER BY accuracy ASC
  `);
  return stmt.all(userId);
}

export function getProgressOverTime(db, userId) {
  const stmt = db.prepare(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(id) as total_attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
      ROUND(CAST(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(id) * 100, 2) as accuracy
    FROM user_answers
    WHERE user_id = ?
    GROUP BY month
    ORDER BY month ASC
  `);
  return stmt.all(userId);
}
