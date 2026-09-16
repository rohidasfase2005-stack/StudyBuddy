import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('  SIMPLIFIED PRODUCT ROLES & CORE WORKFLOW E2E TEST');
  console.log('======================================================\n');

  // 1. AUTHENTICATION & ROLE ISOLATION
  console.log('--- 1. TWO DISTINCT ROLES & ACCESS ---');
  // Student Login
  const studentLogin = await (await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@studybuddy.com', password: 'password123' })
  })).json();
  assert(studentLogin.token && studentLogin.user?.role === 'student', 'Student logs in with role="student"');
  const studentHeaders = { Authorization: `Bearer ${studentLogin.token}` };

  // Admin Login
  const adminLogin = await (await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studybuddy.com', password: 'admin123' })
  })).json();
  assert(adminLogin.token && adminLogin.user?.role === 'admin', 'Admin logs in with role="admin"');
  const adminHeaders = { Authorization: `Bearer ${adminLogin.token}` };

  // RBAC Check: Student blocked from Admin endpoints
  const studentAdminAccess = await fetch('http://localhost:5000/api/admin/dashboard', { headers: studentHeaders });
  assert(studentAdminAccess.status === 403, 'Student is blocked from /api/admin/dashboard (403)');

  // Admin granted access
  const adminDashRes = await fetch('http://localhost:5000/api/admin/dashboard', { headers: adminHeaders });
  const adminDash = await adminDashRes.json();
  assert(adminDashRes.status === 200, 'Admin accesses /api/admin/dashboard (200)');
  assert(typeof adminDash.totalStudents === 'number', `Admin dashboard shows totalStudents (${adminDash.totalStudents})`);
  assert(typeof adminDash.totalPdfs === 'number', `Admin dashboard shows totalPdfs (${adminDash.totalPdfs})`);
  assert(typeof adminDash.totalQuestions === 'number', `Admin dashboard shows totalQuestions (${adminDash.totalQuestions})`);

  // Admin views student directory
  const adminStudentsRes = await fetch('http://localhost:5000/api/admin/students', { headers: adminHeaders });
  const adminStudents = await adminStudentsRes.json();
  assert(Array.isArray(adminStudents) && adminStudents.length > 0, `Admin students directory lists ${adminStudents.length} students`);

  // 2. DAILY TARGET & SCHEDULE API
  console.log('\n--- 2. DAILY TARGET & SCHEDULE WORKFLOW ---');
  const targetGetRes = await fetch('http://localhost:5000/api/targets', { headers: studentHeaders });
  const targetData = await targetGetRes.json();
  assert(targetGetRes.status === 200, 'Student fetches daily targets & progress');
  assert(targetData.target?.daily_questions !== undefined, `Default target questions = ${targetData.target?.daily_questions}`);
  assert(typeof targetData.progress?.streak_days === 'number', `Calculated streak days = ${targetData.progress?.streak_days}`);

  // Update target
  const targetPutRes = await fetch('http://localhost:5000/api/targets', {
    method: 'PUT',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ daily_questions: 25, daily_tests: 2, daily_study_minutes: 45 })
  });
  assert(targetPutRes.status === 200, 'Student updates daily target (25 Qs, 2 Tests, 45 min)');

  // Add study slot
  const slotRes = await fetch('http://localhost:5000/api/targets/schedules', {
    method: 'POST',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Evening Mock Practice', start_time: '07:00 PM', end_time: '08:00 PM' })
  });
  const slotData = await slotRes.json();
  assert(slotRes.status === 201 && slotData.id, 'Student adds study schedule slot');

  // Verify updated targets and slot
  const updatedTargetRes = await (await fetch('http://localhost:5000/api/targets', { headers: studentHeaders })).json();
  assert(updatedTargetRes.target.daily_questions === 25, 'Persisted daily_questions = 25');
  assert(updatedTargetRes.schedules.some(s => s.id === slotData.id), 'Schedule slot appears in student schedules list');

  // Delete slot
  const deleteSlotRes = await fetch(`http://localhost:5000/api/targets/schedules/${slotData.id}`, {
    method: 'DELETE',
    headers: studentHeaders
  });
  assert(deleteSlotRes.status === 200, 'Student deletes study slot cleanly');

  // 3. ADMIN PDF UPLOAD & PROCESSING
  console.log('\n--- 3. PDF UPLOAD & PROCESSING ---');
  const samplePdfPath = path.resolve('./uploads/8b3ed86e-533f-4c1e-9f3d-6bdcbdc0e030.pdf');
  const pdfBuffer = fs.readFileSync(samplePdfPath);
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'NPTEL_Electrical_Protection.pdf');

  const pdfUploadRes = await (await fetch('http://localhost:5000/api/pdfs/upload', {
    method: 'POST',
    headers: adminHeaders,
    body: formData
  })).json();
  assert(pdfUploadRes.id, `Admin uploaded PDF: ${pdfUploadRes.original_name}`);

  // Wait for processing
  console.log('  Waiting for PDF extraction to complete...');
  let processedPdf = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    const check = await (await fetch(`http://localhost:5000/api/pdfs/${pdfUploadRes.id}`, { headers: adminHeaders })).json();
    if (check.processing_status === 'completed') {
      processedPdf = check;
      break;
    }
  }
  assert(processedPdf?.processing_status === 'completed' && processedPdf?.question_count > 0, `PDF processed: ${processedPdf?.question_count} questions extracted and approved`);

  // 4. MULTI-PDF TEST GENERATION
  console.log('\n--- 4. MULTI-PDF RANDOM TEST GENERATION & VALIDATION ---');
  const pdfList = await (await fetch('http://localhost:5000/api/pdfs', { headers: studentHeaders })).json();
  assert(Array.isArray(pdfList) && pdfList.length > 0, `Student lists ${pdfList.length} available question paper PDFs`);

  const selectedPdfs = pdfList.filter(p => p.processing_status === 'completed').slice(0, 2);
  const selectedPdfIds = selectedPdfs.map(p => p.id);
  const combinedQuestionsCount = selectedPdfs.reduce((sum, p) => sum + (p.question_count || 0), 0);

  // Validation Test: Requesting more questions than available in selected PDFs
  const excessiveCount = combinedQuestionsCount + 100;
  const invalidGenRes = await fetch('http://localhost:5000/api/tests/generate', {
    method: 'POST',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfIds: selectedPdfIds,
      questionCount: excessiveCount
    })
  });
  const invalidGenData = await invalidGenRes.json();
  assert(invalidGenRes.status === 400, 'System rejects test when requested question count exceeds available pool');
  assert(invalidGenData.message?.includes('available from the selected PDFs'), 'Validation returns clear, actionable error message');

  // Valid Test Generation with Multiple PDFs
  const validGenRes = await fetch('http://localhost:5000/api/tests/generate', {
    method: 'POST',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfIds: selectedPdfIds,
      questionCount: Math.min(5, combinedQuestionsCount),
      mode: 'random',
      timeLimit: 600
    })
  });
  const validGenData = await validGenRes.json();
  assert(validGenRes.status === 201, `Generated test across multiple PDFs (status: 201, id: ${validGenData.test?.id})`);
  assert(validGenData.questions?.length === Math.min(5, combinedQuestionsCount), `Test contains ${validGenData.questions?.length} randomized questions`);

  // 5. ATTEMPT TEST, SUBMIT & VERIFY WRONG QUESTIONS
  console.log('\n--- 5. TEST ATTEMPT, RESULT & WRONG QUESTIONS TRACKING ---');
  const testId = validGenData.test.id;

  // Answer Q1 correctly, Q2 wrong
  await fetch(`http://localhost:5000/api/tests/${testId}/answer`, {
    method: 'POST',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: validGenData.questions[0].question_id,
      selectedAnswer: 0,
      timeSpent: 20
    })
  });

  if (validGenData.questions.length > 1) {
    await fetch(`http://localhost:5000/api/tests/${testId}/answer`, {
      method: 'POST',
      headers: { ...studentHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: validGenData.questions[1].question_id,
        selectedAnswer: 3, // Intentional wrong
        timeSpent: 25
      })
    });
  }

  // Submit test
  const submitRes = await (await fetch(`http://localhost:5000/api/tests/${testId}/submit`, {
    method: 'POST',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeTaken: 45 })
  })).json();
  assert(submitRes.status === 'completed', 'Test submitted and status is "completed"');

  // Verify results endpoint
  const resultRes = await (await fetch(`http://localhost:5000/api/tests/${testId}/result`, { headers: studentHeaders })).json();
  assert(resultRes.test?.id === testId, 'Result endpoint returns completed test summary');
  assert(Array.isArray(resultRes.subjectWise), 'Result includes subject performance breakdown');

  // Verify Wrong Questions Summary
  const wrongSummary = await (await fetch('http://localhost:5000/api/tests/wrong-summary', { headers: studentHeaders })).json();
  assert(typeof wrongSummary.totalWrong === 'number', `Wrong questions summary returns totalWrong = ${wrongSummary.totalWrong}`);
  assert(Array.isArray(wrongSummary.questions), 'Wrong questions list returned for review');

  // Practice Wrong Questions Test Mode
  if (wrongSummary.totalWrong > 0) {
    const wrongTestGen = await (await fetch('http://localhost:5000/api/tests/generate', {
      method: 'POST',
      headers: { ...studentHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'wrong',
        questionCount: Math.min(wrongSummary.totalWrong, 5)
      })
    })).json();
    assert(wrongTestGen.test?.test_mode === 'wrong', 'Generated specialized Wrong Questions Practice test');
  }

  // 6. AI STUDY CHATBOT
  console.log('\n--- 6. AI STUDY ASSISTANT ---');
  const chatRes = await (await fetch('http://localhost:5000/api/chat/message', {
    method: 'POST',
    headers: { ...studentHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What is the capital of India?' })
  })).json();
  assert(chatRes.reply && (chatRes.reply.includes('Delhi') || chatRes.reply.includes('New Delhi')), 'AI Chatbot answers exam question accurately');

  // Cleanup uploaded test PDF
  await fetch(`http://localhost:5000/api/pdfs/${pdfUploadRes.id}`, { method: 'DELETE', headers: adminHeaders });
  console.log('  Cleaned up temporary test PDF');

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
