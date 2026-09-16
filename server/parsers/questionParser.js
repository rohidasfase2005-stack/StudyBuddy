export function guessSubject(questionText) {
  const text = questionText.toLowerCase();
  
  const englishKeywords = ['synonym', 'antonym', 'grammar', 'adjective', 'noun', 'verb', 'sentence', 'meaning', 'comprehension', 'vocabulary'];
  const mathKeywords = ['calculate', 'percentage', 'area', 'volume', 'sum', 'difference', 'equation', 'triangle', 'ratio', 'integer', 'kv', 'line voltage', 'phase voltage', 'power', 'current', 'voltage', 'transformer'];
  const gkKeywords = ['capital', 'president', 'country', 'who is', 'where is', 'history', 'geography', 'river', 'mountain', 'minister', 'constitution'];
  const reasoningKeywords = ['series', 'analogy', 'pattern', 'coding', 'decoding', 'syllogism', 'blood relation', 'odd one out'];

  if (englishKeywords.some(kw => text.includes(kw))) return 'English';
  if (mathKeywords.some(kw => text.includes(kw))) return 'Mathematics';
  if (gkKeywords.some(kw => text.includes(kw))) return 'General Knowledge';
  if (reasoningKeywords.some(kw => text.includes(kw))) return 'Reasoning';

  return 'General';
}

export function detectAnswerKey(text) {
  const answerKey = new Map();
  // Match patterns like "1. A", "1- B", "1) C" often found in answer keys at the end
  const lines = text.split('\n');
  const keyRegex = /^(\d+)\s*[.)-]?\s*([a-d])/i;
  
  let inAnswerKeySection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('answer key') || trimmed.toLowerCase() === 'answers') {
      inAnswerKeySection = true;
      continue;
    }
    
    if (inAnswerKeySection) {
      const match = trimmed.match(keyRegex);
      if (match) {
        const qNum = parseInt(match[1], 10);
        const ans = match[2].toUpperCase();
        
        let answerIndex = -1;
        if (ans === 'A') answerIndex = 0;
        else if (ans === 'B') answerIndex = 1;
        else if (ans === 'C') answerIndex = 2;
        else if (ans === 'D') answerIndex = 3;
        
        if (answerIndex !== -1) {
          answerKey.set(qNum, answerIndex);
        }
      }
    }
  }
  
  return answerKey;
}

export function parseQuestions(text, sourcePdf, pages = []) {
  const questions = [];
  const answerKeyMap = detectAnswerKey(text);
  
  // Separate question text from answer key section so answer key doesn't get split as questions
  let questionBodyText = text;
  const answerKeySectionIdx = text.search(/(?:\n|^)\s*(?:answer\s*key|answers)\s*[:\n]/i);
  if (answerKeySectionIdx !== -1) {
    questionBodyText = text.substring(0, answerKeySectionIdx);
  }

  // Split the text into question blocks based on standard question numbering:
  // Supports: Question 1:, Question 1., Q1., Q1:, Q.1., 1., 1), 1:
  const questionSplitRegex = /(?:^|\n)\s*(?:Question\s*\d+|Q\.?\s*\d+|\d+)\s*[:.)]\s*/i;
  let rawBlocks = questionBodyText.split(questionSplitRegex);
  
  // The first block is typically preamble before Question 1
  if (rawBlocks.length > 0 && !/^\s*(?:Question\s*\d+|Q\.?\s*\d+|\d+)\s*[:.)]/i.test(questionBodyText.trim())) {
    rawBlocks.shift();
  }
  
  let currentQuestionNumber = 1;
  
  for (let block of rawBlocks) {
    block = block.trim();
    if (!block) continue;
    
    let questionObj = {
      question_text: '',
      option_a: null,
      option_b: null,
      option_c: null,
      option_d: null,
      correct_answer: null,
      explanation: null,
      subject: null,
      topic: 'Uncategorized',
      page_number: null,
      needs_review: true
    };
    
    // Find options
    // Options must start at beginning of line (or beginning of string) to avoid matching (a) inside text
    // Matches: A), A., (A), a), a., (a), etc.
    const optionsRegex = /(?:^|\n)\s*(?:[A-Da-d]\s*[.)]|\([A-Da-d]\))\s*(.+?)(?=(?:\n\s*(?:[A-Da-d]\s*[.)]|\([A-Da-d]\))\s*)|(?:\n\s*(?:Ans(?:wer)?|Correct\s*Answer|Solution|Explanation)\s*[:=])|$)/gis;
    
    let match;
    const options = [];
    let optionStartIndex = block.length;
    
    while ((match = optionsRegex.exec(block)) !== null) {
      if (options.length === 0) {
        optionStartIndex = match.index;
      }
      options.push(match[1].trim());
    }
    
    // Extract question text
    if (options.length > 0) {
      questionObj.question_text = block.substring(0, optionStartIndex).trim();
    } else {
      questionObj.question_text = block.trim();
    }
    
    // Must have at least 2 options to be a valid MCQ
    if (options.length < 2) {
      continue;
    }
    
    // Assign options
    questionObj.option_a = options[0];
    questionObj.option_b = options[1];
    if (options.length >= 3) questionObj.option_c = options[2];
    if (options.length >= 4) questionObj.option_d = options[3];
    
    // Extract inline answer if present:
    // Matches: Answer: A, Answer: (a), Ans: B, Correct Answer: c, etc.
    const inlineAnsRegex = /(?:Ans(?:wer)?|Correct\s*Answer)\s*[:=]\s*\(?([a-dA-D])\)?/i;
    const inlineAnsMatch = block.match(inlineAnsRegex);
    
    if (inlineAnsMatch) {
      const ansChar = inlineAnsMatch[1].toUpperCase();
      if (ansChar === 'A') questionObj.correct_answer = 0;
      else if (ansChar === 'B') questionObj.correct_answer = 1;
      else if (ansChar === 'C') questionObj.correct_answer = 2;
      else if (ansChar === 'D') questionObj.correct_answer = 3;
    } else if (answerKeyMap.has(currentQuestionNumber)) {
      questionObj.correct_answer = answerKeyMap.get(currentQuestionNumber);
    }
    
    // Extract solution/explanation if present
    const explanationRegex = /(?:Solution|Explanation)\s*[:=]\s*([\s\S]+?)(?=(?:Question\s*\d+|Q\.?\s*\d+|\d+)\s*[:.)]|$)/i;
    const expMatch = block.match(explanationRegex);
    if (expMatch) {
      questionObj.explanation = expMatch[1].trim();
    }
    
    if (questionObj.correct_answer !== null && options.length >= 2) {
      questionObj.needs_review = false;
    }
    
    questionObj.subject = guessSubject(questionObj.question_text);
    
    // Determine page number if pages array is provided
    if (pages && pages.length > 0) {
      for (const page of pages) {
        if (page.text.includes(questionObj.question_text.substring(0, 30))) {
          questionObj.page_number = page.pageNumber;
          break;
        }
      }
    }
    
    questions.push(questionObj);
    currentQuestionNumber++;
  }
  
  return questions;
}
