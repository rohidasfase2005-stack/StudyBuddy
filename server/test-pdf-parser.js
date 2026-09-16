// StudyBuddy PDF and Question Parser Test Suite
import { parseQuestions, detectAnswerKey, guessSubject } from './parsers/questionParser.js';

let passed = 0, failed = 0;
function check(condition, msg) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

console.log('\n========================================');
console.log('  CYCLE 5: PDF & MCQ PARSER ROBUSTNESS');
console.log('========================================\n');

// 1. Subject Guessing Test
console.log('--- 1. SUBJECT DETECTION ---');
check(guessSubject('Find the synonym of ABUNDANT in the sentence.') === 'English', 'Detects English from synonym');
check(guessSubject('Calculate the area of a circle with radius 7cm.') === 'Mathematics', 'Detects Mathematics from calculate/area');
check(guessSubject('Who was the first President of India?') === 'General Knowledge', 'Detects General Knowledge from president/who was');
check(guessSubject('Complete the series: 2, 4, 8, 16, ?') === 'Reasoning', 'Detects Reasoning from series');

// 2. Format 1: Standard numbering with letter options and inline Answer
console.log('\n--- 2. FORMAT 1: STANDARD INLINE MCQ ---');
const sampleFormat1 = `
1. What is the capital of India?
A) Mumbai
B) Delhi
C) Kolkata
D) Chennai
Answer: B

2. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B
`;

const parsed1 = parseQuestions(sampleFormat1, 'mock1.pdf');
check(parsed1.length === 2, `Parsed 2 questions (got ${parsed1.length})`);
check(parsed1[0]?.question_text?.includes('capital of India'), 'Q1 text extracted correctly');
check(parsed1[0]?.option_a === 'Mumbai', 'Q1 option A is Mumbai');
check(parsed1[0]?.option_b === 'Delhi', 'Q1 option B is Delhi');
check(parsed1[0]?.correct_answer === 1, 'Q1 correct answer mapped to index 1 (B)');
check(parsed1[0]?.needs_review === false, 'Q1 with answer does not need review');

// 3. Format 2: Parenthesized options e.g. (a), (b), (c), (d)
console.log('\n--- 3. FORMAT 2: PARENTHESIZED OPTIONS ---');
const sampleFormat2 = `
Q1. Which gas is most abundant in Earth's atmosphere?
(a) Oxygen
(b) Nitrogen
(c) Carbon Dioxide
(d) Hydrogen
Correct Answer: b
`;

const parsed2 = parseQuestions(sampleFormat2, 'mock2.pdf');
check(parsed2.length === 1, `Parsed parenthesized format question (got ${parsed2.length})`);
check(parsed2[0]?.option_b === 'Nitrogen', 'Option b extracted as Nitrogen');
check(parsed2[0]?.correct_answer === 1, 'Correct answer index is 1 (b)');

// 4. Format 3: Answer key at end
console.log('\n--- 4. FORMAT 3: ANSWER KEY AT END ---');
const sampleWithKey = `
1. What is the chemical formula for water?
A) CO2
B) H2O
C) NaCl
D) O2

2. What is the speed of light?
A) 300,000 km/s
B) 150,000 km/s
C) 500,000 km/s
D) 1,000 km/s

Answer Key:
1. B
2. A
`;

const parsedKey = parseQuestions(sampleWithKey, 'mock_key.pdf');
check(parsedKey.length === 2, 'Parsed questions with answer key at end');
check(parsedKey[0]?.correct_answer === 1, 'Q1 answer mapped from answer key (B -> 1)');
check(parsedKey[1]?.correct_answer === 0, 'Q2 answer mapped from answer key (A -> 0)');

// 5. Format 4: PDF with NO questions (Test C)
console.log('\n--- 5. PDF WITHOUT QUESTIONS ---');
const noQuestionsText = `
Welcome to the Annual University Research Symposium 2026.
This document outlines the presentation schedule and keynote speakers.
Registration will begin at 9:00 AM in Hall B.
`;
const parsedEmpty = parseQuestions(noQuestionsText, 'no_questions.pdf');
check(parsedEmpty.length === 0, 'Document without questions returns 0 questions gracefully without crashing');

// 6. Format 5: Questions without answers (marks needs_review = true)
console.log('\n--- 6. QUESTIONS NEEDING REVIEW ---');
const unkeyedText = `
1. What is the square root of 144?
A) 10
B) 11
C) 12
D) 13
`;
const parsedUnkeyed = parseQuestions(unkeyedText, 'unkeyed.pdf');
check(parsedUnkeyed.length === 1, 'Extracted unkeyed question');
check(parsedUnkeyed[0]?.needs_review === true, 'Question without answer is flagged as needs_review = true');

console.log('\n========================================');
console.log(`  PARSER RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
