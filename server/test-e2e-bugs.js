// Comprehensive verification of the 3 critical bug fixes:
// 1. Dashboard visibility and stats
// 2. PDF upload and processing pipeline with real PDF
// 3. Test generation from uploaded PDF questions (pdfId filter)

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
  console.log('  CRITICAL BUG FIX VERIFICATION: 3 CORE WORKFLOWS');
  console.log('======================================================\n');

  // 1. LOGIN
  console.log('--- STEP 1: AUTHENTICATION ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@studybuddy.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.token, 'Login successful with token');
  const token = loginData.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. DASHBOARD STATS VERIFICATION
  console.log('\n--- STEP 2: DASHBOARD STATS API CONTRACT ---');
  const dashRes = await fetch('http://localhost:5000/api/dashboard/stats', { headers: authHeaders });
  const dash = await dashRes.json();
  assert(dashRes.status === 200, 'Dashboard stats returns 200');
  assert(typeof dash.totalQuestions === 'number', `totalQuestions is a number (${dash.totalQuestions})`);
  assert(typeof dash.totalPdfs === 'number', `totalPdfs is a number (${dash.totalPdfs})`);
  assert(typeof dash.testsAttempted === 'number', `testsAttempted is a number (${dash.testsAttempted})`);
  assert(typeof dash.averageScore === 'number', `averageScore is a number (${dash.averageScore})`);
  assert(Array.isArray(dash.recentTests), `recentTests is an array (len: ${dash.recentTests.length})`);
  assert(Array.isArray(dash.subjectCounts), `subjectCounts is an array (len: ${dash.subjectCounts.length})`);
  if (dash.recentTests.length > 0) {
    const t = dash.recentTests[0];
    assert(t.score !== undefined && t.total_questions !== undefined, 'Recent test has score and total_questions');
    assert(t.test_name !== undefined, `Recent test has test_name: "${t.test_name}"`);
  }

  // 3. PDF UPLOAD AND PROCESSING WITH REAL PDF
  console.log('\n--- STEP 3: PDF UPLOAD & PROCESSING PIPELINE ---');
  const samplePdfPath = path.resolve('./uploads/8b3ed86e-533f-4c1e-9f3d-6bdcbdc0e030.pdf');
  assert(fs.existsSync(samplePdfPath), `Sample PDF exists at ${samplePdfPath}`);

  const pdfBuffer = fs.readFileSync(samplePdfPath);
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'Electrical_Protection_Assignment.pdf');

  const uploadRes = await fetch('http://localhost:5000/api/pdfs/upload', {
    method: 'POST',
    headers: authHeaders,
    body: formData
  });
  const uploadedPdf = await uploadRes.json();
  assert(uploadRes.status === 201, `Upload succeeded with status 201 (id: ${uploadedPdf.id})`);
  assert(uploadedPdf.original_name === 'Electrical_Protection_Assignment.pdf', 'original_name preserved');
  assert(uploadedPdf.processing_status === 'pending', 'Initial status is pending');

  // Poll for completion
  console.log('  Waiting for PDF processing to complete...');
  let completedPdf = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const statusRes = await fetch(`http://localhost:5000/api/pdfs/${uploadedPdf.id}`, { headers: authHeaders });
    const checkPdf = await statusRes.json();
    if (checkPdf.processing_status === 'completed' || checkPdf.processing_status === 'failed') {
      completedPdf = checkPdf;
      break;
    }
  }

  assert(completedPdf !== null, 'PDF processing finished within 10 seconds');
  assert(completedPdf?.processing_status === 'completed', `PDF status is 'completed' (got: ${completedPdf?.processing_status})`);
  assert(completedPdf?.question_count > 0, `Extracted ${completedPdf?.question_count} questions from PDF`);

  // 4. VERIFY QUESTIONS ARE SAVED AND APPROVED
  console.log('\n--- STEP 4: QUESTION BANK AND APPROVAL CHECK ---');
  const qListRes = await fetch(`http://localhost:5000/api/questions?pdf_id=${uploadedPdf.id}`, { headers: authHeaders });
  const qListData = await qListRes.json();
  assert(qListData.questions?.length === completedPdf.question_count, `Retrieved ${qListData.questions?.length} questions for this PDF`);
  const allApproved = qListData.questions.every(q => q.is_approved === 1);
  assert(allApproved, 'All extracted questions have is_approved = 1 (usable for tests)');

  // 5. TEST GENERATION FROM THIS SPECIFIC PDF (pdfId filter)
  console.log('\n--- STEP 5: TEST GENERATION FROM SPECIFIC PDF ---');
  const genRes = await fetch('http://localhost:5000/api/tests/generate', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfId: uploadedPdf.id,
      questionCount: 5,
      mode: 'random',
      timeLimit: 300
    })
  });
  const genData = await genRes.json();
  assert(genRes.status === 201, `Test generated successfully with status 201 (id: ${genData.test?.id})`);
  assert(genData.questions?.length === 5, `Test contains exactly 5 questions (got ${genData.questions?.length})`);

  // Verify all questions belong to the requested PDF
  const testQIds = genData.questions.map(q => q.question_id);
  const dbQs = qListData.questions.map(q => q.id);
  const allBelongToPdf = testQIds.every(id => dbQs.includes(id));
  assert(allBelongToPdf, 'All test questions strictly belong to the selected PDF');

  // 6. ATTEMPT & SUBMIT TEST
  console.log('\n--- STEP 6: ATTEMPT & SUBMIT TEST ---');
  const testId = genData.test.id;
  // Answer question 1
  const firstQ = genData.questions[0];
  const ansRes = await fetch(`http://localhost:5000/api/tests/${testId}/answer`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: firstQ.question_id,
      selectedAnswer: 0, // Option A
      timeSpent: 15
    })
  });
  assert(ansRes.status === 200, 'Answered first question');

  // Submit test
  const submitRes = await fetch(`http://localhost:5000/api/tests/${testId}/submit`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeTaken: 60 })
  });
  const submitData = await submitRes.json();
  assert(submitRes.status === 200, 'Test submitted successfully');
  assert(submitData.status === 'completed' || submitData.test?.status === 'completed', 'Test status is completed');
  const finalScore = submitData.score !== undefined ? submitData.score : submitData.test?.score;
  assert(typeof finalScore === 'number', `Final score calculated: ${finalScore}`);

  // 7. DASHBOARD UPDATED VERIFICATION
  console.log('\n--- STEP 7: POST-TEST DASHBOARD UPDATE ---');
  const dashRes2 = await fetch('http://localhost:5000/api/dashboard/stats', { headers: authHeaders });
  const dash2 = await dashRes2.json();
  assert(dash2.totalPdfs >= dash.totalPdfs + 1, `totalPdfs incremented (${dash.totalPdfs} -> ${dash2.totalPdfs})`);
  assert(dash2.testsAttempted >= dash.testsAttempted + 1, `testsAttempted incremented (${dash.testsAttempted} -> ${dash2.testsAttempted})`);
  assert(dash2.recentTests[0]?.id === testId, 'Most recent test matches the just-submitted test');

  // 8. CLEANUP TEST PDF
  console.log('\n--- STEP 8: CLEANUP TEST PDF ---');
  const delRes = await fetch(`http://localhost:5000/api/pdfs/${uploadedPdf.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert(delRes.status === 200, 'Test PDF deleted cleanly');

  console.log('\n======================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
