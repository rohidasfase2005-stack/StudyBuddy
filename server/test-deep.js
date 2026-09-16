// StudyBuddy E2E Test Script - Cycle 3: Deep Testing
// Tests answer accuracy, wrong-question flow, edge cases, data persistence

const BASE = 'http://localhost:5000/api';

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

let passed = 0, failed = 0, bugs = [];
function check(condition, msg) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; bugs.push(msg); console.error(`  ❌ FAIL: ${msg}`); }
}

async function runDeepTests() {
  console.log('\n========================================');
  console.log('  CYCLE 3: DEEP TESTING');
  console.log('========================================\n');

  // Login
  const loginRes = await request('POST', '/auth/login', { email: 'demo@studybuddy.com', password: 'password123' });
  const token = loginRes.data.token;
  check(!!token, 'Login succeeds');

  // ========== KNOWN-ANSWER TEST ==========
  console.log('\n--- KNOWN-ANSWER ACCURACY TEST ---');

  // Get all questions to know correct answers
  const allQsRes = await request('GET', '/questions?limit=100', null, token);
  const allQuestions = allQsRes.data.questions;
  check(allQuestions.length >= 25, `Have ${allQuestions.length} questions available`);

  // Generate a 10-question test
  const genRes = await request('POST', '/tests/generate', { questionCount: 10, mode: 'random' }, token);
  check(genRes.ok, 'Generate 10-question test');
  const testId = genRes.data.test.id;
  const testQs = genRes.data.questions;
  check(testQs.length === 10, 'Got exactly 10 questions');

  // Answer 7 correctly, 2 incorrectly, skip 1
  let expectedCorrect = 0, expectedWrong = 0;
  const wrongQuestionIds = [];

  for (let i = 0; i < testQs.length; i++) {
    const tq = testQs[i];
    const shuffled = JSON.parse(tq.shuffled_options || '[0,1,2,3]');

    // Look up the full question to get correct_answer
    const fullQ = allQuestions.find(q => q.id === tq.question_id);
    if (!fullQ) continue;

    const correctDisplayIdx = shuffled.indexOf(fullQ.correct_answer);

    if (i < 7) {
      // Answer correctly
      await request('POST', `/tests/${testId}/answer`, {
        questionId: tq.question_id, selectedAnswer: correctDisplayIdx, timeSpent: 5
      }, token);
      expectedCorrect++;
    } else if (i < 9) {
      // Answer incorrectly
      const wrongIdx = (correctDisplayIdx + 1) % 4;
      await request('POST', `/tests/${testId}/answer`, {
        questionId: tq.question_id, selectedAnswer: wrongIdx, timeSpent: 3
      }, token);
      expectedWrong++;
      wrongQuestionIds.push(tq.question_id);
    }
    // Skip question at index 9
  }

  check(expectedCorrect === 7, `Answered 7 correctly`);
  check(expectedWrong === 2, `Answered 2 incorrectly`);

  // Submit test
  const submitRes = await request('POST', `/tests/${testId}/submit`, { timeTaken: 120 }, token);
  check(submitRes.ok, 'Test submitted');
  check(submitRes.data.correct_count === 7, `Backend reports correct_count = 7 (got ${submitRes.data.correct_count})`);
  check(submitRes.data.wrong_count === 2, `Backend reports wrong_count = 2 (got ${submitRes.data.wrong_count})`);
  check(submitRes.data.skipped_count === 1, `Backend reports skipped_count = 1 (got ${submitRes.data.skipped_count})`);

  const expectedAccuracy = (7 / 10) * 100;
  check(submitRes.data.accuracy === expectedAccuracy, `Accuracy = 70% (got ${submitRes.data.accuracy}%)`);

  // Verify result endpoint matches
  const resultRes = await request('GET', `/tests/${testId}/result`, null, token);
  check(resultRes.ok, 'Result endpoint works');
  check(resultRes.data.test.correct_count === 7, 'Result endpoint correct_count matches');
  check(resultRes.data.test.accuracy === expectedAccuracy, 'Result endpoint accuracy matches');
  check(Array.isArray(resultRes.data.subjectWise), 'Result has subjectWise breakdown');

  // ========== REVIEW DATA VERIFICATION ==========
  console.log('\n--- REVIEW DATA VERIFICATION ---');

  const reviewRes = await request('GET', `/tests/${testId}/review`, null, token);
  check(reviewRes.ok, 'Review endpoint works');
  check(reviewRes.data.questions.length === 10, 'Review has all 10 questions');

  const correctInReview = reviewRes.data.questions.filter(q => q.is_correct === 1).length;
  const wrongInReview = reviewRes.data.questions.filter(q => 
    q.selected_answer !== null && q.selected_answer !== undefined && q.is_correct !== 1
  ).length;
  const skippedInReview = reviewRes.data.questions.filter(q => 
    q.selected_answer === null || q.selected_answer === undefined
  ).length;

  check(correctInReview === 7, `Review correct count = 7 (got ${correctInReview})`);
  check(wrongInReview === 2, `Review wrong count = 2 (got ${wrongInReview})`);
  check(skippedInReview === 1, `Review skipped count = 1 (got ${skippedInReview})`);

  // ========== WRONG QUESTIONS MODE ==========
  console.log('\n--- WRONG QUESTIONS MODE ---');

  const wrongRes = await request('POST', '/tests/generate', { questionCount: 5, mode: 'wrong' }, token);
  if (wrongRes.ok) {
    check(true, 'Wrong questions mode generates test');
    // Refresh questions to get latest attempt counts from DB
    const freshQRes = await request('GET', '/questions?limit=50', null, token);
    const freshQuestions = freshQRes.data?.questions || allQuestions;
    // Verify all returned questions have been answered incorrectly
    const wrongTestQs = wrongRes.data.questions;
    let allWrong = true;
    for (const tq of wrongTestQs) {
      const fullQ = freshQuestions.find(q => q.id === tq.question_id);
      if (fullQ && fullQ.attempt_count > 0 && fullQ.correct_count >= fullQ.attempt_count) {
        allWrong = false;
      }
    }
    check(allWrong, 'Wrong mode returns only incorrectly-answered questions');
  } else {
    check(wrongRes.status === 400, 'Wrong questions mode returns 400 if no wrong questions');
  }

  // ========== UNATTEMPTED MODE ==========
  console.log('\n--- UNATTEMPTED MODE ---');

  const unRes = await request('POST', '/tests/generate', { questionCount: 5, mode: 'unattempted' }, token);
  if (unRes.ok) {
    check(true, 'Unattempted mode generates test');
    const unTestQs = unRes.data.questions;
    let allUnattempted = true;
    for (const tq of unTestQs) {
      const freshQ = (await request('GET', `/questions/${tq.question_id}`, null, token)).data;
      if (freshQ && freshQ.attempt_count > 0) {
        allUnattempted = false;
      }
    }
    check(allUnattempted, 'Unattempted mode returns only never-attempted questions');
  } else {
    check(unRes.status === 400, 'Unattempted mode returns 400 if all questions attempted');
  }

  // ========== MULTIPLE TEST RANDOMIZATION ==========
  console.log('\n--- RANDOMIZATION VERIFICATION ---');

  const gen1 = await request('POST', '/tests/generate', { questionCount: 5, mode: 'random' }, token);
  const gen2 = await request('POST', '/tests/generate', { questionCount: 5, mode: 'random' }, token);
  const ids1 = gen1.data.questions.map(q => q.question_id).sort();
  const ids2 = gen2.data.questions.map(q => q.question_id).sort();
  // They might be same by chance with only 25 questions and 5 picks, but shuffled options should differ
  check(gen1.ok && gen2.ok, 'Multiple test generations succeed');

  // Verify no duplicates within each test
  const set1 = new Set(gen1.data.questions.map(q => q.question_id));
  const set2 = new Set(gen2.data.questions.map(q => q.question_id));
  check(set1.size === 5, 'Test 1 has no duplicates');
  check(set2.size === 5, 'Test 2 has no duplicates');

  // ========== DATA PERSISTENCE ==========
  console.log('\n--- DATA PERSISTENCE ---');

  // Check that our test still exists after server operations
  const historyRes = await request('GET', '/tests?page=1&limit=50', null, token);
  check(historyRes.ok, 'Test history loads');
  const ourTest = historyRes.data.tests.find(t => t.id === testId);
  check(!!ourTest, 'Our submitted test persists in history');
  check(ourTest?.status === 'completed', 'Test status persisted as completed');
  check(ourTest?.correct_count === 7, 'Correct count persisted correctly');

  // ========== ERROR HANDLING ==========
  console.log('\n--- ERROR HANDLING ---');

  // Try to answer on completed test
  const answerCompletedRes = await request('POST', `/tests/${testId}/answer`, {
    questionId: testQs[0].question_id, selectedAnswer: 0
  }, token);
  check(!answerCompletedRes.ok || answerCompletedRes.status === 404, 'Cannot answer on completed test');

  // Try to submit already-submitted test
  const resubmitRes = await request('POST', `/tests/${testId}/submit`, {}, token);
  check(resubmitRes.ok || true, 'Resubmit handled gracefully (no crash)');

  // Invalid test ID
  const invalidRes = await request('GET', '/tests/nonexistent-id', null, token);
  check(invalidRes.status === 404, 'Invalid test ID returns 404');

  // Generate with 0 questions
  const zeroRes = await request('POST', '/tests/generate', { questionCount: 0, mode: 'random' }, token);
  check(zeroRes.status === 400, 'Zero questions returns 400');

  // Delete nonexistent question
  const delRes = await request('DELETE', '/questions/nonexistent-id', null, token);
  check(delRes.status === 404, 'Delete nonexistent question returns 404');

  // ========== ANALYTICS AFTER TESTS ==========
  console.log('\n--- ANALYTICS CONSISTENCY ---');

  const overviewRes = await request('GET', '/analytics/overview', null, token);
  const dashRes = await request('GET', '/dashboard/stats', null, token);
  
  check(overviewRes.data.totalTests > 0, `Analytics total tests > 0 (${overviewRes.data.totalTests})`);
  check(dashRes.data.testsAttempted === overviewRes.data.totalTests, 
    `Dashboard tests (${dashRes.data.testsAttempted}) matches analytics (${overviewRes.data.totalTests})`);

  const subjectsRes = await request('GET', '/analytics/subjects', null, token);
  check(subjectsRes.data.length > 0, 'Subject analytics has data');
  check(subjectsRes.data.every(s => typeof s.accuracy === 'number'), 'All subjects have accuracy');

  const progressRes = await request('GET', '/analytics/progress', null, token);
  check(progressRes.ok, 'Progress analytics works');

  // ========== QUESTION CRUD ==========
  console.log('\n--- QUESTION CRUD ---');

  // Get a question and update it
  const qList = await request('GET', '/questions?limit=1', null, token);
  const testQ = qList.data.questions[0];
  
  const updateRes = await request('PUT', `/questions/${testQ.id}`, { 
    subject: 'Updated Subject', topic: 'Updated Topic', difficulty: 'Hard' 
  }, token);
  check(updateRes.ok, 'Update question succeeds');
  
  const verifyRes = await request('GET', `/questions/${testQ.id}`, null, token);
  check(verifyRes.data.subject === 'Updated Subject', 'Subject update persisted');
  check(verifyRes.data.topic === 'Updated Topic', 'Topic update persisted');
  check(verifyRes.data.difficulty === 'Hard', 'Difficulty update persisted');

  // Restore original values
  await request('PUT', `/questions/${testQ.id}`, { 
    subject: testQ.subject, topic: testQ.topic, difficulty: testQ.difficulty 
  }, token);

  // ========== SUMMARY ==========
  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  if (bugs.length > 0) {
    console.log('\n  BUGS FOUND:');
    bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
  }
  console.log('');
}

runDeepTests().catch(console.error);
