export function shuffleOptions(question) {
  const indices = [0, 1, 2, 3].filter(i => {
    if (i === 0) return question.option_a !== null;
    if (i === 1) return question.option_b !== null;
    if (i === 2) return question.option_c !== null;
    if (i === 3) return question.option_d !== null;
    return false;
  });

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let shuffledCorrectAnswer = null;
  if (question.correct_answer !== null) {
    shuffledCorrectAnswer = indices.indexOf(question.correct_answer);
  }

  return {
    shuffledOptions: indices,
    shuffledCorrectAnswer
  };
}

export function generateTest(db, userId, options) {
  const { questionCount = 10, subjects = [], topics = [], difficulties = [], mode = 'random' } = options;
  
  let query = 'SELECT * FROM questions WHERE 1=1';
  const params = {};
  
  if (subjects && subjects.length > 0) {
    const subjectPlaceholders = subjects.map((_, i) => `@subject${i}`).join(',');
    query += ` AND subject IN (${subjectPlaceholders})`;
    subjects.forEach((subj, i) => params[`subject${i}`] = subj);
  }
  
  if (topics && topics.length > 0) {
    const topicPlaceholders = topics.map((_, i) => `@topic${i}`).join(',');
    query += ` AND topic IN (${topicPlaceholders})`;
    topics.forEach((top, i) => params[`topic${i}`] = top);
  }
  
  if (difficulties && difficulties.length > 0) {
    const difficultyPlaceholders = difficulties.map((_, i) => `@diff${i}`).join(',');
    query += ` AND difficulty IN (${difficultyPlaceholders})`;
    difficulties.forEach((diff, i) => params[`diff${i}`] = diff);
  }
  
  if (mode === 'unattempted') {
    query += ` AND id NOT IN (SELECT question_id FROM user_answers WHERE user_id = @userId)`;
    params.userId = userId;
  } else if (mode === 'wrong') {
    query += ` AND id IN (SELECT question_id FROM user_answers WHERE user_id = @userId AND is_correct = 0)`;
    params.userId = userId;
  }
  
  // Note: For 'balanced_subject' and 'balanced_difficulty' and 'mock', 
  // complex UNION queries or CTEs might be needed, but for simplicity we rely on random 
  // and limit. We can adjust the ORDER BY based on mode.
  query += ' ORDER BY RANDOM() LIMIT @limit';
  params.limit = questionCount;
  
  const stmt = db.prepare(query);
  const questions = stmt.all(params);
  
  const testQuestions = questions.map(q => {
    const { shuffledOptions, shuffledCorrectAnswer } = shuffleOptions(q);
    return {
      ...q,
      shuffled_options: JSON.stringify(shuffledOptions),
      shuffled_correct_answer: shuffledCorrectAnswer
    };
  });
  
  return testQuestions;
}
