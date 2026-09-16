import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, HelpCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TestInterface = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: displayIndex }
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await api.get(`/tests/${testId}`);
        const data = response.data;
        
        // API returns { ...testFields, questions: [...] }
        const { questions: testQuestions, ...testData } = data;
        setTest(testData);
        setQuestions(testQuestions || []);

        // Initialize timer
        if (testData.time_limit > 0) {
          setTimeRemaining(testData.time_limit);
        }

        // Restore previously saved answers
        const savedAnswers = {};
        if (testQuestions) {
          testQuestions.forEach(q => {
            if (q.selected_answer !== null && q.selected_answer !== undefined) {
              savedAnswers[q.question_id] = q.selected_answer;
            }
          });
        }
        setAnswers(savedAnswers);

        // Restore marked for review
        const marked = new Set();
        if (testQuestions) {
          testQuestions.forEach(q => {
            if (q.is_marked) marked.add(q.question_id);
          });
        }
        setMarkedForReview(marked);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load test');
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (timeRemaining !== null && timeRemaining > 0 && !submitting) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [timeRemaining, submitting]);

  const handleAnswerChange = async (questionId, displayIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: displayIndex }));

    try {
      await api.post(`/tests/${testId}/answer`, {
        questionId,
        selectedAnswer: displayIndex,
        isMarked: markedForReview.has(questionId),
        timeSpent: 0
      });
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const toggleMarkForReview = async () => {
    const currentQ = questions[currentIndex];
    const qId = currentQ.question_id;
    const newMarked = new Set(markedForReview);
    const isNowMarked = !newMarked.has(qId);
    
    if (isNowMarked) {
      newMarked.add(qId);
    } else {
      newMarked.delete(qId);
    }
    setMarkedForReview(newMarked);

    // Save mark status to backend
    try {
      await api.post(`/tests/${testId}/answer`, {
        questionId: qId,
        selectedAnswer: answers[qId] ?? null,
        isMarked: isNowMarked,
        timeSpent: 0
      });
    } catch (err) {
      console.error('Failed to save mark status:', err);
    }
  };

  const handleSubmitTest = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await api.post(`/tests/${testId}/submit`, { timeTaken: test?.time_limit ? (test.time_limit - (timeRemaining || 0)) : 0 });
      navigate(`/student/test/${testId}/result`);
    } catch (err) {
      console.error('Failed to submit test:', err);
      setError('Failed to submit test. Please try again.');
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  if (loading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!questions || questions.length === 0) return <div className="p-8 text-center">No questions found.</div>;

  const currentQuestion = questions[currentIndex];
  const currentQId = currentQuestion.question_id;

  // Parse shuffled_options
  let shuffleArray = [0, 1, 2, 3];
  try {
    const so = currentQuestion.shuffled_options;
    if (typeof so === 'string') {
      shuffleArray = JSON.parse(so);
    } else if (Array.isArray(so)) {
      shuffleArray = so;
    }
  } catch (e) {
    // fallback to default order
  }

  const rawOptions = [
    currentQuestion.option_a,
    currentQuestion.option_b,
    currentQuestion.option_c,
    currentQuestion.option_d
  ];
  const displayedOptions = shuffleArray.map(originalIdx => rawOptions[originalIdx]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 sm:px-6 py-3 flex justify-between items-center shrink-0">
        <h1 className="text-lg font-bold text-gray-800">{test?.test_name || 'Practice Test'}</h1>
        <div className="flex items-center gap-3">
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 text-lg font-mono px-4 py-2 rounded-lg ${timeRemaining < 60 ? 'bg-red-100 text-red-700 animate-pulse' : timeRemaining < 300 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          )}
          <Button variant="primary" onClick={() => setShowSubmitModal(true)}>Submit Test</Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl w-full mx-auto flex flex-col flex-1">
            <div className="bg-white rounded-xl shadow-sm border flex-1 flex flex-col">
              {/* Question header */}
              <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h2 className="text-lg font-semibold text-gray-700">Question {currentIndex + 1} of {questions.length}</h2>
                <div className="flex gap-2 text-sm">
                  {currentQuestion.subject && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{currentQuestion.subject}</span>
                  )}
                </div>
              </div>

              {/* Question body */}
              <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                <div className="text-lg sm:text-xl text-gray-800 mb-8 font-medium leading-relaxed">
                  {currentQuestion.question_text}
                </div>

                <div className="space-y-3">
                  {displayedOptions.map((opt, idx) => {
                    if (!opt) return null; // Skip empty options
                    const isSelected = answers[currentQId] === idx;
                    return (
                      <label
                        key={idx}
                        className={`block p-4 border rounded-xl cursor-pointer transition-all duration-150 ${
                          isSelected ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          name={`question-${currentQId}`}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(currentQId, idx)}
                        />
                        <div className="flex items-start gap-4">
                          <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <div className="text-gray-700">{String.fromCharCode(65 + idx)}. {opt}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
                <Button
                  variant="secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1 inline" /> Previous
                </Button>

                <Button
                  variant={markedForReview.has(currentQId) ? 'warning' : 'secondary'}
                  onClick={toggleMarkForReview}
                >
                  <HelpCircle className="w-4 h-4 mr-1 inline" />
                  {markedForReview.has(currentQId) ? 'Unmark' : 'Mark for Review'}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => {
                    if (currentIndex < questions.length - 1) {
                      setCurrentIndex(prev => prev + 1);
                    } else {
                      setShowSubmitModal(true);
                    }
                  }}
                >
                  {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4 ml-1 inline" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Navigator - hidden on small screens */}
        <div className="hidden lg:flex w-72 bg-white border-l shadow-sm flex-col shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-700">Question Navigator</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = q.question_id in answers;
                const isMarked = markedForReview.has(q.question_id);

                let btnColor = 'bg-gray-100 text-gray-600 border-gray-200';
                if (isMarked) {
                  btnColor = 'bg-orange-100 text-orange-700 border-orange-300';
                } else if (isAnswered) {
                  btnColor = 'bg-green-100 text-green-700 border-green-300';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 w-full rounded-lg border text-sm font-medium flex items-center justify-center transition-all ${btnColor} ${
                      isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-2 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                Answered ({answeredCount})
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                Not Answered ({unansweredCount})
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                Marked ({markedForReview.size})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => !submitting && setShowSubmitModal(false)}
        title="Submit Test?"
      >
        <div className="p-4">
          <p className="mb-4 text-gray-700">
            Are you sure you want to submit? You cannot change answers after submission.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-gray-800">{questions.length}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
              <div className="text-xl font-bold text-green-700">{answeredCount}</div>
              <div className="text-xs text-green-600">Answered</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
              <div className="text-xl font-bold text-red-700">{unansweredCount}</div>
              <div className="text-xs text-red-600">Unanswered</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center border border-orange-100">
              <div className="text-xl font-bold text-orange-700">{markedForReview.size}</div>
              <div className="text-xs text-orange-600">Marked</div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowSubmitModal(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitTest} loading={submitting}>
              {submitting ? 'Submitting...' : 'Confirm Submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TestInterface;
