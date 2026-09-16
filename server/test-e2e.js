// StudyBuddy End-to-End Test Script
// Tests all API endpoints and user flows

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

function assert(condition, msg) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    return false;
  }
  console.log(`  ✅ ${msg}`);
  return true;
}

let passed = 0, failed = 0, bugs = [];
function check(condition, msg) {
  if (assert(condition, msg)) passed++;
  else { failed++; bugs.push(msg); }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  STUDYBUDDY E2E TEST SUITE');
  console.log('========================================\n');

  // ========== 1. REGISTRATION ==========
  console.log('--- 1. REGISTRATION ---');
  
  // Test missing fields
  let r = await request('POST', '/auth/register', {});
  check(r.status === 400, 'Register with missing fields returns 400');

  // Test short password
  r = await request('POST', '/auth/register', { name: 'Test', email: 'test@test.com', password: '123' });
  check(r.status === 400, 'Register with short password returns 400');

  // Test valid registration
  const testEmail = `test_${Date.now()}@test.com`;
  r = await request('POST', '/auth/register', { name: 'Test User', email: testEmail, password: 'test123456' });
  check(r.status === 201, 'Valid registration returns 201');
  check(r.data?.token, 'Registration returns token');
  check(r.data?.user?.name === 'Test User', 'Registration returns user name');
  const newUserToken = r.data?.token;

  // Test duplicate email
  r = await request('POST', '/auth/register', { name: 'Test2', email: testEmail, password: 'test123456' });
  check(r.status === 409, 'Duplicate email returns 409');

  // ========== 2. LOGIN ==========
  console.log('\n--- 2. LOGIN ---');
  
  r = await request('POST', '/auth/login', {});
  check(r.status === 400, 'Login with missing fields returns 400');

  r = await request('POST', '/auth/login', { email: 'wrong@email.com', password: 'wrong' });
  check(r.status === 401, 'Invalid credentials returns 401');

  r = await request('POST', '/auth/login', { email: 'demo@studybuddy.com', password: 'password123' });
  check(r.ok, 'Demo user login succeeds');
  check(r.data?.token, 'Login returns token');
  const token = r.data?.token;
  const userId = r.data?.user?.id;

  // ========== 3. AUTH MIDDLEWARE ==========
  console.log('\n--- 3. AUTH MIDDLEWARE ---');
  
  r = await request('GET', '/auth/me');
  check(r.status === 401, 'Unauthenticated /me returns 401');

  r = await request('GET', '/auth/me', null, 'invalid-token');
  check(r.status === 401, 'Invalid token returns 401');

  r = await request('GET', '/auth/me', null, token);
  check(r.ok, 'Valid token /me succeeds');
  check(r.data?.email === 'demo@studybuddy.com', '/me returns correct email');

  // ========== 4. DASHBOARD ==========
  console.log('\n--- 4. DASHBOARD ---');
  
  r = await request('GET', '/dashboard/stats', null, token);
  check(r.ok, 'Dashboard stats returns OK');
  check(typeof r.data?.totalQuestions === 'number', 'Stats has totalQuestions (number)');
  check(typeof r.data?.totalPdfs === 'number', 'Stats has totalPdfs (number)');
  check(typeof r.data?.testsAttempted === 'number', 'Stats has testsAttempted (number)');
  check(typeof r.data?.averageScore === 'number', 'Stats has averageScore (number)');
  check(Array.isArray(r.data?.subjectCounts), 'Stats has subjectCounts array');
  check(r.data?.totalQuestions >= 25, 'At least 25 demo questions exist');

  // ========== 5. QUESTIONS API ==========
  console.log('\n--- 5. QUESTIONS API ---');
  
  r = await request('GET', '/questions?page=1&limit=5', null, token);
  check(r.ok, 'List questions succeeds');
  check(Array.isArray(r.data?.questions), 'Returns questions array');
  check(r.data?.total >= 25, 'Total questions >= 25');
  check(r.data?.questions?.length === 5, 'Respects limit=5');
  check(r.data?.totalPages > 0, 'Returns totalPages');

  // Page 2
  r = await request('GET', '/questions?page=2&limit=5', null, token);
  check(r.ok, 'Page 2 succeeds');
  check(r.data?.page === 2, 'Returns correct page number');

  // Filter by subject
  r = await request('GET', '/questions?subject=English', null, token);
  check(r.ok, 'Filter by subject succeeds');
  check(r.data?.questions?.every(q => q.subject === 'English'), 'All filtered questions have correct subject');

  // Filter by difficulty
  r = await request('GET', '/questions?difficulty=Easy', null, token);
  check(r.ok, 'Filter by difficulty succeeds');

  // Search
  r = await request('GET', '/questions/search?q=capital', null, token);
  check(r.ok, 'Search succeeds');
  check(r.data?.length > 0, 'Search returns results for "capital"');

  // Subjects list
  r = await request('GET', '/questions/subjects', null, token);
  check(r.ok, 'Subjects list succeeds');
  check(r.data?.length >= 5, 'At least 5 subjects');

  // Topics list
  r = await request('GET', '/questions/topics', null, token);
  check(r.ok, 'Topics list succeeds');

  // Get single question
  const allQs = await request('GET', '/questions?limit=100', null, token);
  const testQuestion = allQs.data?.questions?.[0];
  if (testQuestion) {
    r = await request('GET', `/questions/${testQuestion.id}`, null, token);
    check(r.ok, 'Get single question succeeds');
    check(r.data?.question_text === testQuestion.question_text, 'Returns correct question');
  }

  // Update question
  if (testQuestion) {
    r = await request('PUT', `/questions/${testQuestion.id}`, { explanation: 'Updated explanation for testing' }, token);
    check(r.ok, 'Update question succeeds');
    
    // Verify update persisted
    r = await request('GET', `/questions/${testQuestion.id}`, null, token);
    check(r.data?.explanation === 'Updated explanation for testing', 'Update persisted correctly');
  }

  // ========== 6. TEST GENERATION ==========
  console.log('\n--- 6. TEST GENERATION ---');
  
  // Basic random test
  r = await request('POST', '/tests/generate', { questionCount: 5, mode: 'random' }, token);
  check(r.ok, 'Generate 5-question random test succeeds');
  check(r.data?.test?.total_questions === 5, 'Test has correct total_questions');
  check(r.data?.questions?.length === 5, 'Returns 5 questions');
  check(r.data?.test?.status === 'in_progress', 'Test status is in_progress');
  const testId1 = r.data?.test?.id;

  // Test with subject filter
  r = await request('POST', '/tests/generate', { questionCount: 3, subjects: ['English'], mode: 'random' }, token);
  check(r.ok, 'Generate subject-filtered test succeeds');
  check(r.data?.questions?.every(q => q.subject === 'English'), 'All questions match selected subject');

  // Test with difficulty filter
  r = await request('POST', '/tests/generate', { questionCount: 3, difficulties: ['Easy'], mode: 'random' }, token);
  check(r.ok, 'Generate difficulty-filtered test succeeds');

  // Test no duplicate questions
  r = await request('POST', '/tests/generate', { questionCount: 10, mode: 'random' }, token);
  if (r.ok) {
    const questionIds = r.data?.questions?.map(q => q.question_id);
    const unique = new Set(questionIds);
    check(unique.size === questionIds.length, 'No duplicate questions in generated test');
  }
  const testId2 = r.data?.test?.id;

  // Balanced by subject
  r = await request('POST', '/tests/generate', { questionCount: 10, mode: 'balanced_subject' }, token);
  check(r.ok, 'Balanced by subject test succeeds');

  // Request more questions than available 
  r = await request('POST', '/tests/generate', { questionCount: 999, mode: 'random' }, token);
  check(r.ok || r.status === 400, 'Requesting too many questions handles gracefully');

  // Invalid mode
  r = await request('POST', '/tests/generate', { questionCount: 5, subjects: ['NonExistentSubject'], mode: 'random' }, token);
  check(r.status === 400, 'Non-existent subject returns 400');

  // ========== 7. TEST TAKING FLOW ==========
  console.log('\n--- 7. TEST TAKING FLOW ---');

  // Generate a fresh test for full flow
  r = await request('POST', '/tests/generate', { questionCount: 5, mode: 'random', timeLimit: 600 }, token);
  check(r.ok, 'Generate test for full flow');
  const fullTest = r.data;
  const ftId = fullTest?.test?.id;
  const ftQuestions = fullTest?.questions;

  if (ftId && ftQuestions?.length > 0) {
    // Get test details
    r = await request('GET', `/tests/${ftId}`, null, token);
    check(r.ok, 'GET test details succeeds');
    check(r.data?.time_limit === 600, 'Timer value saved correctly');
    check(r.data?.questions?.length === 5, 'Test has all 5 questions');

    // Answer question 1 correctly (we know the correct answer from the question data)
    const q1 = ftQuestions[0];
    const shuffled1 = JSON.parse(q1.shuffled_options || '[0,1,2,3]');
    
    // Find which display index maps to the correct answer
    // We need to get the actual question to know correct_answer
    const q1Full = await request('GET', `/questions/${q1.question_id}`, null, token);
    const correctOriginal = q1Full.data?.correct_answer;
    const correctDisplayIndex = shuffled1.indexOf(correctOriginal);
    
    r = await request('POST', `/tests/${ftId}/answer`, { 
      questionId: q1.question_id, selectedAnswer: correctDisplayIndex, isMarked: false, timeSpent: 10 
    }, token);
    check(r.ok, 'Answer Q1 (correct) succeeds');
    check(r.data?.isCorrect === true, 'Q1 marked as correct');

    // Answer question 2 incorrectly
    const q2 = ftQuestions[1];
    const shuffled2 = JSON.parse(q2.shuffled_options || '[0,1,2,3]');
    const q2Full = await request('GET', `/questions/${q2.question_id}`, null, token);
    const wrongDisplayIndex = shuffled2.indexOf(correctOriginal) === 0 ? 1 : 0; // Just pick wrong
    
    r = await request('POST', `/tests/${ftId}/answer`, { 
      questionId: q2.question_id, selectedAnswer: wrongDisplayIndex, isMarked: false, timeSpent: 15 
    }, token);
    check(r.ok, 'Answer Q2 (wrong) succeeds');

    // Answer question 3 and mark for review
    const q3 = ftQuestions[2];
    r = await request('POST', `/tests/${ftId}/answer`, { 
      questionId: q3.question_id, selectedAnswer: 2, isMarked: true, timeSpent: 8 
    }, token);
    check(r.ok, 'Answer Q3 (marked for review) succeeds');

    // Skip questions 4 and 5 (don't answer)

    // Update an answer (change mind on Q3)
    r = await request('POST', `/tests/${ftId}/answer`, { 
      questionId: q3.question_id, selectedAnswer: 1, isMarked: false, timeSpent: 12 
    }, token);
    check(r.ok, 'Update answer succeeds (change mind)');

    // Verify answers saved - check test details
    r = await request('GET', `/tests/${ftId}`, null, token);
    const answeredQs = r.data?.questions?.filter(q => q.selected_answer !== null && q.selected_answer !== undefined);
    check(answeredQs?.length === 3, 'Three questions have saved answers');

    // Submit test
    r = await request('POST', `/tests/${ftId}/submit`, { timeTaken: 120 }, token);
    check(r.ok, 'Submit test succeeds');
    check(r.data?.status === 'completed', 'Test status is completed after submit');
    check(typeof r.data?.accuracy === 'number', 'Accuracy is calculated');
    check(r.data?.correct_count + r.data?.wrong_count + r.data?.skipped_count === r.data?.total_questions, 
      'correct + wrong + skipped = total');
    check(r.data?.skipped_count === 2, 'Skipped count is 2');

    // ========== 8. RESULTS ==========
    console.log('\n--- 8. RESULTS ---');
    
    r = await request('GET', `/tests/${ftId}/result`, null, token);
    check(r.ok, 'Get result succeeds');
    check(r.data?.test, 'Result contains test data');
    check(Array.isArray(r.data?.subjectWise), 'Result contains subject-wise breakdown');

    // ========== 9. TEST REVIEW ==========
    console.log('\n--- 9. TEST REVIEW ---');
    
    r = await request('GET', `/tests/${ftId}/review`, null, token);
    check(r.ok, 'Get review succeeds');
    check(r.data?.questions?.length === 5, 'Review has all 5 questions');
    
    // Check review contains answer data
    const reviewQ1 = r.data?.questions?.find(q => q.id === q1.question_id);
    if (reviewQ1) {
      check(reviewQ1.selected_answer !== null && reviewQ1.selected_answer !== undefined, 'Review Q1 has selected_answer');
      check('is_correct' in reviewQ1, 'Review Q1 has is_correct field');
      check('shuffled_options' in reviewQ1, 'Review Q1 has shuffled_options');
    }
  }

  // ========== 10. TEST HISTORY ==========
  console.log('\n--- 10. TEST HISTORY ---');
  
  r = await request('GET', '/tests?page=1&limit=10', null, token);
  check(r.ok, 'Test history succeeds');
  check(r.data?.tests?.length > 0, 'Has test records');
  check(r.data?.total > 0, 'Total tests > 0');

  // ========== 11. ANALYTICS ==========
  console.log('\n--- 11. ANALYTICS ---');
  
  r = await request('GET', '/analytics/overview', null, token);
  check(r.ok, 'Analytics overview succeeds');
  check(typeof r.data?.totalTests === 'number', 'Has totalTests');
  check(typeof r.data?.overallAccuracy === 'number', 'Has overallAccuracy');

  r = await request('GET', '/analytics/subjects', null, token);
  check(r.ok, 'Analytics subjects succeeds');
  check(Array.isArray(r.data), 'Returns array');

  r = await request('GET', '/analytics/weak-topics', null, token);
  check(r.ok, 'Analytics weak-topics succeeds');

  r = await request('GET', '/analytics/history', null, token);
  check(r.ok, 'Analytics history succeeds');

  r = await request('GET', '/analytics/progress', null, token);
  check(r.ok, 'Analytics progress succeeds');

  // ========== 12. WRONG QUESTIONS MODE ==========
  console.log('\n--- 12. WRONG QUESTIONS MODE ---');
  
  r = await request('POST', '/tests/generate', { questionCount: 5, mode: 'wrong' }, token);
  // May or may not have wrong questions depending on test results
  check(r.ok || r.status === 400, 'Wrong questions mode handles gracefully');

  // ========== 13. UNATTEMPTED MODE ==========
  console.log('\n--- 13. UNATTEMPTED MODE ---');
  
  r = await request('POST', '/tests/generate', { questionCount: 5, mode: 'unattempted' }, token);
  check(r.ok || r.status === 400, 'Unattempted mode handles gracefully');

  // ========== 14. DATA CONSISTENCY ==========
  console.log('\n--- 14. DATA CONSISTENCY ---');
  
  const dashStats = await request('GET', '/dashboard/stats', null, token);
  const analyticsOverview = await request('GET', '/analytics/overview', null, token);
  check(dashStats.data?.testsAttempted === analyticsOverview.data?.totalTests, 
    'Dashboard testsAttempted matches analytics totalTests');

  // ========== 15. SECURITY ==========
  console.log('\n--- 15. SECURITY ---');
  
  // Cross-user access (new user shouldn't see demo user's data)
  if (newUserToken) {
    r = await request('GET', '/dashboard/stats', null, newUserToken);
    check(r.ok, 'New user dashboard succeeds');
    check(r.data?.totalQuestions >= 25, 'New user sees demo questions (shared demo data)');
    check(r.data?.testsAttempted === 0, 'New user has 0 tests (isolated)');
  }

  // ========== 16. PDFs API ==========
  console.log('\n--- 16. PDFs API ---');
  
  r = await request('GET', '/pdfs', null, token);
  check(r.ok, 'List PDFs succeeds');
  check(Array.isArray(r.data), 'Returns array');

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

runTests().catch(console.error);
