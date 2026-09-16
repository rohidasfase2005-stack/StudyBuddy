// StudyBuddy E2E Test Suite - Cycle 4: Admin, Chatbot, Time Tracking, Security

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

async function runCycle4() {
  console.log('\n========================================');
  console.log('  CYCLE 4: ADMIN, CHATBOT & TIME TRACKING');
  console.log('========================================\n');

  // ========== 1. AUTHENTICATION & ROLES ==========
  console.log('--- 1. AUTHENTICATION & ROLES ---');
  
  // Student login
  const studentLogin = await request('POST', '/auth/login', { email: 'demo@studybuddy.com', password: 'password123' });
  check(studentLogin.ok, 'Student login succeeds');
  check(studentLogin.data?.user?.role === 'student', 'Student user has role "student"');
  const studentToken = studentLogin.data?.token;
  const studentId = studentLogin.data?.user?.id;

  // Admin login
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@studybuddy.com', password: 'admin123' });
  check(adminLogin.ok, 'Admin login succeeds');
  check(adminLogin.data?.user?.role === 'admin', 'Admin user has role "admin"');
  const adminToken = adminLogin.data?.token;

  // Student /me returns role
  const studentMe = await request('GET', '/auth/me', null, studentToken);
  check(studentMe.data?.role === 'student', 'Student /me returns role = "student"');

  // Admin /me returns role
  const adminMe = await request('GET', '/auth/me', null, adminToken);
  check(adminMe.data?.role === 'admin', 'Admin /me returns role = "admin"');

  // ========== 2. ROLE-BASED ACCESS CONTROL ==========
  console.log('\n--- 2. ROLE-BASED ACCESS CONTROL (RBAC) ---');

  // Student trying to access Admin Dashboard -> 403 Forbidden
  const studentForbidden = await request('GET', '/admin/dashboard', null, studentToken);
  check(studentForbidden.status === 403, 'Student accessing /admin/dashboard receives 403 Forbidden');

  // Unauthenticated accessing Admin Dashboard -> 401 Unauthorized
  const unauthForbidden = await request('GET', '/admin/dashboard', null, null);
  check(unauthForbidden.status === 401, 'Unauthenticated accessing /admin/dashboard receives 401');

  // Admin accessing Admin Dashboard -> 200 OK
  const adminDash = await request('GET', '/admin/dashboard', null, adminToken);
  check(adminDash.ok, 'Admin accessing /admin/dashboard succeeds');
  check(typeof adminDash.data?.studentCount === 'number', 'Admin dashboard reports studentCount');
  check(typeof adminDash.data?.totalStudyTimeMinutes === 'number', 'Admin dashboard reports totalStudyTimeMinutes');
  check(typeof adminDash.data?.totalTests === 'number', 'Admin dashboard reports totalTests');

  // Admin students list
  const studentsList = await request('GET', '/admin/students', null, adminToken);
  check(studentsList.ok, 'Admin /admin/students succeeds');
  check(Array.isArray(studentsList.data), 'Students list is an array');
  const foundStudent = studentsList.data?.find(s => s.id === studentId);
  check(!!foundStudent, 'Demo student is present in students list');

  // Admin view individual student
  const studentDetail = await request('GET', `/admin/students/${studentId}`, null, adminToken);
  check(studentDetail.ok, 'Admin /admin/students/:id succeeds');
  check(studentDetail.data?.student?.email === 'demo@studybuddy.com', 'Student detail returns correct email');
  check(Array.isArray(studentDetail.data?.tests), 'Student detail returns tests list');
  check(Array.isArray(studentDetail.data?.activities), 'Student detail returns activity list');

  // Admin test & chatbot analytics
  const testAnalytics = await request('GET', '/admin/analytics/tests', null, adminToken);
  check(testAnalytics.ok, 'Admin /admin/analytics/tests succeeds');
  const chatAnalytics = await request('GET', '/admin/analytics/chatbot', null, adminToken);
  check(chatAnalytics.ok, 'Admin /admin/analytics/chatbot succeeds');

  // ========== 3. STUDENT TIME TRACKING & ACTIVITY ==========
  console.log('\n--- 3. STUDENT TIME TRACKING & HEARTBEAT ---');

  const sessionId = 'test-session-' + Date.now();

  // Send heartbeat for test taking
  const hb1 = await request('POST', '/activity/heartbeat', {
    sessionId,
    activityType: 'test',
    durationSeconds: 120
  }, studentToken);
  check(hb1.ok, 'Send 120s test heartbeat succeeds');

  // Send heartbeat for chatbot interaction
  const hb2 = await request('POST', '/activity/heartbeat', {
    sessionId,
    activityType: 'chat',
    durationSeconds: 60
  }, studentToken);
  check(hb2.ok, 'Send 60s chat heartbeat succeeds');

  // Fetch student activity stats
  const actStats = await request('GET', '/activity/stats', null, studentToken);
  check(actStats.ok, 'Student activity stats succeeds');
  check(actStats.data?.totalSeconds >= 180, `Total seconds tracked >= 180 (got ${actStats.data?.totalSeconds})`);
  check(actStats.data?.byType?.some(t => t.activity_type === 'test'), 'Activity breakdown includes "test"');
  check(actStats.data?.byType?.some(t => t.activity_type === 'chat'), 'Activity breakdown includes "chat"');

  // Verify Admin sees the updated study time
  const updatedStudentDetail = await request('GET', `/admin/students/${studentId}`, null, adminToken);
  check(updatedStudentDetail.data?.totalStudyTimeSeconds >= 180, 'Admin sees student total study time reflected');

  // ========== 4. AI CHATBOT TESTING ==========
  console.log('\n--- 4. AI CHATBOT FUNCTIONAL TESTS ---');

  // Clear previous chat for clean slate
  await request('DELETE', '/chat/history', null, studentToken);

  // Test 1: Normal question: "What is the capital of India?"
  const chat1 = await request('POST', '/chat/message', { message: 'What is the capital of India?' }, studentToken);
  check(chat1.ok, 'Chat 1: Ask "What is the capital of India?" succeeds');
  check(chat1.data?.message?.includes('New Delhi'), 'Chat 1 response mentions "New Delhi"');
  check(chat1.data?.message?.toLowerCase().includes('explanation'), 'Chat 1 response includes explanation');
  check(!!chat1.data?.topic, 'Chat 1 includes topic information');

  // Test 2: Student gives wrong answer: "Question: 2 + 2 = ? Student Answer: 5"
  const chat2 = await request('POST', '/chat/message', { message: 'Question: 2 + 2 = ? Student Answer: 5' }, studentToken);
  check(chat2.ok, 'Chat 2: Submit wrong math answer succeeds');
  check(chat2.data?.message?.includes('Incorrect'), 'Chat 2 marks answer as Incorrect');
  check(chat2.data?.message?.includes('4'), 'Chat 2 provides correct answer 4');
  check(chat2.data?.isCorrect === false, 'Chat 2 returns isCorrect = false');

  // Test 2b: Student gives correct answer: "Question: 2 + 2 = ? Student Answer: 4"
  const chat2b = await request('POST', '/chat/message', { message: 'Question: 2 + 2 = ? Student Answer: 4' }, studentToken);
  check(chat2b.ok, 'Chat 2b: Submit correct math answer succeeds');
  check(chat2b.data?.message?.includes('Correct'), 'Chat 2b marks answer as Correct');
  check(chat2b.data?.isCorrect === true, 'Chat 2b returns isCorrect = true');

  // Test 3: Explanation request: "Explain Fundamental Rights."
  const chat3 = await request('POST', '/chat/message', { message: 'Explain Fundamental Rights.' }, studentToken);
  check(chat3.ok, 'Chat 3: Explain Fundamental Rights succeeds');
  check(chat3.data?.message?.toLowerCase().includes('definition'), 'Chat 3 includes definition');
  check(chat3.data?.message?.toLowerCase().includes('explanation'), 'Chat 3 includes explanation');
  check(chat3.data?.message?.toLowerCase().includes('example'), 'Chat 3 includes example');
  check(chat3.data?.message?.toLowerCase().includes('important'), 'Chat 3 includes important point');

  // Test 4: Follow-up question: "Give me an example."
  const chat4 = await request('POST', '/chat/message', { message: 'Give me an example.' }, studentToken);
  check(chat4.ok, 'Chat 4: Follow-up question succeeds');
  check(chat4.data?.message?.toLowerCase().includes('article'), 'Chat 4 follow-up contextual response cites relevant articles');

  // Test 5: Question from Question Bank
  const chat5 = await request('POST', '/chat/message', { message: 'Choose the correct synonym for "ABUNDANT"' }, studentToken);
  check(chat5.ok, 'Chat 5: Query stored question bank question succeeds');
  check(chat5.data?.message?.includes('Plentiful'), 'Chat 5 uses approved question bank answer (Plentiful)');

  // ========== 5. CHATBOT ERROR & FAILURE TESTING ==========
  console.log('\n--- 5. CHATBOT FAILURE & EDGE CASES ---');

  // Empty message
  const emptyChat = await request('POST', '/chat/message', { message: '   ' }, studentToken);
  check(emptyChat.status === 400, 'Empty message returns 400');

  // Very long message (> 4000 chars)
  const longMsg = 'A'.repeat(5000);
  const longChat = await request('POST', '/chat/message', { message: longMsg }, studentToken);
  check(longChat.status === 400, 'Overly long message returns 400');

  // Unknown concept / graceful fallback
  const randomChat = await request('POST', '/chat/message', { message: 'xyzquantumquasizorp12345' }, studentToken);
  check(randomChat.ok, 'Unknown input receives graceful response (no crash)');
  check(randomChat.data?.message?.length > 10, 'Fallback message provides helpful study suggestions');

  // Chat history persistence
  const chatHistory = await request('GET', '/chat/history', null, studentToken);
  check(chatHistory.ok, 'Chat history endpoint succeeds');
  check(chatHistory.data?.length >= 5, `Chat history persisted (${chatHistory.data?.length} messages)`);

  // Clear chat history
  const clearChat = await request('DELETE', '/chat/history', null, studentToken);
  check(clearChat.ok, 'Clear chat history succeeds');
  const emptyHistory = await request('GET', '/chat/history', null, studentToken);
  check(emptyHistory.data?.length === 0, 'Chat history is empty after clear');

  // ========== SUMMARY ==========
  console.log('\n========================================');
  console.log(`  CYCLE 4 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  if (bugs.length > 0) {
    console.log('\n  BUGS FOUND:');
    bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
  }
  console.log('');
}

runCycle4().catch(console.error);
