// StudyBuddy Master End-to-End Regression Test Suite
// Executes all 7 testing cycles across all system workflows

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

async function runMasterSuite() {
  console.log('====================================================');
  console.log('       STUDYBUDDY MASTER E2E REGRESSION SUITE        ');
  console.log('====================================================\n');

  // ==========================================
  // CYCLE 1: AUTHENTICATION & ACCESS CONTROL
  // ==========================================
  console.log('>>> CYCLE 1: AUTHENTICATION & ACCESS CONTROL <<<');
  
  // Registration validation
  let r = await request('POST', '/auth/register', {});
  check(r.status === 400, 'Register requires name, email, password');
  
  // Student login
  const studentLog = await request('POST', '/auth/login', { email: 'demo@studybuddy.com', password: 'password123' });
  check(studentLog.ok && studentLog.data?.token, 'Student login succeeds');
  const studentToken = studentLog.data?.token;
  const studentId = studentLog.data?.user?.id;
  check(studentLog.data?.user?.role === 'student', 'Student has role="student"');

  // Admin login
  const adminLog = await request('POST', '/auth/login', { email: 'admin@studybuddy.com', password: 'admin123' });
  check(adminLog.ok && adminLog.data?.token, 'Admin login succeeds');
  const adminToken = adminLog.data?.token;
  check(adminLog.data?.user?.role === 'admin', 'Admin has role="admin"');

  // Profile endpoints
  const studentMe = await request('GET', '/auth/me', null, studentToken);
  check(studentMe.data?.email === 'demo@studybuddy.com', 'Student /me returns correct profile');
  const adminMe = await request('GET', '/auth/me', null, adminToken);
  check(adminMe.data?.role === 'admin', 'Admin /me returns role="admin"');

  // RBAC protection
  const forbidden = await request('GET', '/admin/dashboard', null, studentToken);
  check(forbidden.status === 403, 'Student is blocked from /admin/dashboard (403)');
  const adminAccess = await request('GET', '/admin/dashboard', null, adminToken);
  check(adminAccess.ok, 'Admin is granted access to /admin/dashboard (200)');

  // ==========================================
  // CYCLE 2: STUDENT DASHBOARD & QUESTIONS BANK
  // ==========================================
  console.log('\n>>> CYCLE 2: STUDENT DASHBOARD & QUESTIONS BANK <<<');

  const dash = await request('GET', '/dashboard/stats', null, studentToken);
  check(dash.ok, 'Student dashboard stats load');
  check(dash.data?.totalQuestions >= 25, `Total questions count >= 25 (${dash.data?.totalQuestions})`);

  // Questions listing & pagination
  const qs = await request('GET', '/questions?page=1&limit=5', null, studentToken);
  check(qs.ok && qs.data?.questions?.length === 5, 'Questions pagination respects limit');

  // Subject filtering
  const engQs = await request('GET', '/questions?subject=English', null, studentToken);
  check(engQs.ok && engQs.data?.questions?.every(q => q.subject === 'English'), 'Questions filter by subject');

  // Search
  const search = await request('GET', '/questions/search?q=Capital', null, studentToken);
  check(search.ok && search.data?.length > 0, 'Questions text search returns matches');

  // Duplicate detection
  const dupCheck = await request('POST', '/questions/check-duplicates', { question_text: 'Choose the correct synonym for "ABUNDANT"' }, studentToken);
  check(dupCheck.ok && dupCheck.data?.length > 0, 'Duplicate check identifies existing questions');

  // Question CRUD update
  const qToUpdate = qs.data.questions[0];
  const originalTopic = qToUpdate.topic;
  await request('PUT', `/questions/${qToUpdate.id}`, { topic: 'Verified Grammar' }, studentToken);
  const qUpdated = await request('GET', `/questions/${qToUpdate.id}`, null, studentToken);
  check(qUpdated.data?.topic === 'Verified Grammar', 'Question update persisted');
  await request('PUT', `/questions/${qToUpdate.id}`, { topic: originalTopic }, studentToken);

  // ==========================================
  // CYCLE 3: RANDOM TEST ENGINE & FULL TEST FLOW
  // ==========================================
  console.log('\n>>> CYCLE 3: RANDOM TEST ENGINE & FULL TEST FLOW <<<');

  // Generate 10-question test
  const gen = await request('POST', '/tests/generate', { questionCount: 10, mode: 'random', timeLimit: 600 }, studentToken);
  check(gen.ok && gen.data?.questions?.length === 10, 'Generate 10-question test');
  const testId = gen.data.test.id;
  const testQs = gen.data.questions;

  // Verify no duplicates
  const qIds = testQs.map(q => q.question_id);
  check(new Set(qIds).size === 10, 'Generated test has zero duplicate questions');

  // Fetch all questions to know the exact correct answers for deterministic scoring
  const allQs = (await request('GET', '/questions?limit=100', null, studentToken)).data.questions;

  // Answer 7 correct, 2 wrong, 1 skipped
  for (let i = 0; i < 10; i++) {
    const tq = testQs[i];
    const fullQ = allQs.find(q => q.id === tq.question_id);
    const shuffled = JSON.parse(tq.shuffled_options || '[0,1,2,3]');
    const correctDisplay = shuffled.indexOf(fullQ.correct_answer);

    if (i < 7) {
      // Correct
      await request('POST', `/tests/${testId}/answer`, {
        questionId: tq.question_id, selectedAnswer: correctDisplay, isMarked: false, timeSpent: 10
      }, studentToken);
    } else if (i < 9) {
      // Wrong
      const wrongDisplay = (correctDisplay + 1) % 4;
      await request('POST', `/tests/${testId}/answer`, {
        questionId: tq.question_id, selectedAnswer: wrongDisplay, isMarked: true, timeSpent: 15
      }, studentToken);
    }
    // i === 9 is skipped
  }

  // Submit test
  const submit = await request('POST', `/tests/${testId}/submit`, { timeTaken: 110 }, studentToken);
  check(submit.ok, 'Test submitted successfully');
  check(submit.data?.correct_count === 7, `Score calculation: 7 correct (got ${submit.data?.correct_count})`);
  check(submit.data?.wrong_count === 2, `Score calculation: 2 wrong (got ${submit.data?.wrong_count})`);
  check(submit.data?.skipped_count === 1, `Score calculation: 1 skipped (got ${submit.data?.skipped_count})`);
  check(submit.data?.accuracy === 70, `Accuracy calculation: exactly 70% (got ${submit.data?.accuracy}%)`);

  // Result verification
  const result = await request('GET', `/tests/${testId}/result`, null, studentToken);
  check(result.ok && result.data?.test?.correct_count === 7, 'Result API confirms 7 correct answers');
  check(Array.isArray(result.data?.subjectWise), 'Result includes subject performance breakdown');

  // Review verification
  const review = await request('GET', `/tests/${testId}/review`, null, studentToken);
  check(review.ok && review.data?.questions?.length === 10, 'Review API returns all 10 questions with answers');
  const reviewCorrect = review.data.questions.filter(q => q.is_correct === 1).length;
  check(reviewCorrect === 7, 'Review confirms exactly 7 correct answers');

  // Wrong questions practice mode
  const wrongGen = await request('POST', '/tests/generate', { questionCount: 2, mode: 'wrong' }, studentToken);
  check(wrongGen.ok || wrongGen.status === 400, 'Wrong questions practice mode handles correctly');

  // ==========================================
  // CYCLE 4: TIME TRACKING & HEARTBEAT ACTIVITY
  // ==========================================
  console.log('\n>>> CYCLE 4: TIME TRACKING & HEARTBEAT ACTIVITY <<<');

  const sessId = 'master-sess-' + Date.now();
  await request('POST', '/activity/heartbeat', { sessionId: sessId, activityType: 'test', durationSeconds: 150 }, studentToken);
  await request('POST', '/activity/heartbeat', { sessionId: sessId, activityType: 'practice', durationSeconds: 90 }, studentToken);

  const actStats = await request('GET', '/activity/stats', null, studentToken);
  check(actStats.ok && actStats.data?.totalSeconds >= 240, `Study time recorded: >= 240s (${actStats.data?.totalSeconds}s)`);

  // Admin sees student time
  const adminStudentInspect = await request('GET', `/admin/students/${studentId}`, null, adminToken);
  check(adminStudentInspect.ok && adminStudentInspect.data?.totalStudyTimeSeconds >= 240, 'Admin inspects student study time accurately');

  // ==========================================
  // CYCLE 5: AI CHATBOT & TUTOR
  // ==========================================
  console.log('\n>>> CYCLE 5: AI CHATBOT & TUTOR <<<');

  // Normal question
  const c1 = await request('POST', '/chat/message', { message: 'What is the capital of India?' }, studentToken);
  check(c1.ok && c1.data?.message?.includes('New Delhi'), 'Chatbot answers normal knowledge question');

  // Evaluation of student wrong answer
  const c2 = await request('POST', '/chat/message', { message: 'Question: 2 + 2 = ? Student Answer: 5' }, studentToken);
  check(c2.ok && c2.data?.isCorrect === false && c2.data?.message?.includes('Incorrect'), 'Chatbot correctly evaluates incorrect student answer');

  // Concept explanation
  const c3 = await request('POST', '/chat/message', { message: 'Explain Fundamental Rights.' }, studentToken);
  check(c3.ok && c3.data?.message?.includes('Fundamental Rights'), 'Chatbot generates detailed concept explanation');

  // Follow-up context
  const c4 = await request('POST', '/chat/message', { message: 'Give me an example.' }, studentToken);
  check(c4.ok && c4.data?.message?.length > 20, 'Chatbot handles follow-up contextual queries');

  // Question bank verification
  const c5 = await request('POST', '/chat/message', { message: 'Choose the correct synonym for "ABUNDANT"' }, studentToken);
  check(c5.ok && c5.data?.message?.includes('Plentiful'), 'Chatbot consults approved question bank answer');

  // Failure resilience
  const emptyC = await request('POST', '/chat/message', { message: '   ' }, studentToken);
  check(emptyC.status === 400, 'Empty chat message rejected with 400');
  const unknownC = await request('POST', '/chat/message', { message: 'xyzquantumrandomnonexistent' }, studentToken);
  check(unknownC.ok && unknownC.data?.message?.length > 10, 'Unknown question receives friendly fallback without crashing');

  // ==========================================
  // CYCLE 6: ADMIN MONITORING & ANALYTICS
  // ==========================================
  console.log('\n>>> CYCLE 6: ADMIN MONITORING & ANALYTICS <<<');

  const adminDashStats = await request('GET', '/admin/dashboard', null, adminToken);
  check(adminDashStats.data?.studentCount >= 1, `Admin monitors registered students (${adminDashStats.data?.studentCount})`);
  check(adminDashStats.data?.totalStudyTimeMinutes >= 4, `Admin monitors platform study time (${adminDashStats.data?.totalStudyTimeMinutes} min)`);
  check(adminDashStats.data?.totalTests >= 1, `Admin monitors total test attempts (${adminDashStats.data?.totalTests})`);

  const studentList = await request('GET', '/admin/students', null, adminToken);
  check(studentList.data?.some(s => s.email === 'demo@studybuddy.com'), 'Admin student table lists demo student');

  const testModes = await request('GET', '/admin/analytics/tests', null, adminToken);
  check(testModes.ok && Array.isArray(testModes.data?.modeBreakdown), 'Admin test modes analytics available');

  const chatAnalytics = await request('GET', '/admin/analytics/chatbot', null, adminToken);
  check(chatAnalytics.ok && chatAnalytics.data?.totalMessages > 0, 'Admin chatbot interactions tracked');

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n====================================================');
  console.log(`  MASTER REGRESSION RESULT: ${passed} PASSED, ${failed} FAILED `);
  console.log('====================================================\n');

  if (bugs.length > 0) {
    console.log('Bugs encountered:');
    bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL APPLICATION WORKFLOWS & CRITERIA VERIFIED AND PASSING!\n');
  }
}

runMasterSuite().catch(console.error);
