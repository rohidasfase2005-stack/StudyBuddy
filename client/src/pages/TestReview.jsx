import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, X, AlertCircle, BookOpen } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';

const TestReview = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        const res = await api.get(`/tests/${testId}/review`);
        // API returns { test, questions: [{ ...questionFields, shuffled_options, selected_answer, is_correct, ... }] }
        setTest(res.data.test);
        setQuestions(res.data.questions || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load review data');
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [testId]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!questions || questions.length === 0) return <div className="p-8 text-center">No questions found to review.</div>;

  const currentQuestion = questions[currentIndex];

  // Parse shuffled_options
  let shuffleArray = [0, 1, 2, 3];
  try {
    const so = currentQuestion.shuffled_options;
    if (typeof so === 'string') shuffleArray = JSON.parse(so);
    else if (Array.isArray(so)) shuffleArray = so;
  } catch (e) { /* fallback */ }

  const rawOptions = [
    currentQuestion.option_a,
    currentQuestion.option_b,
    currentQuestion.option_c,
    currentQuestion.option_d
  ];
  const displayedOptions = shuffleArray.map(idx => rawOptions[idx]);

  // The correct answer's display index
  const correctDisplayIndex = shuffleArray.indexOf(currentQuestion.correct_answer);
  // The user's selected display index (directly on the question from the API)
  const userDisplayIndex = currentQuestion.selected_answer;
  const isSkipped = userDisplayIndex === null || userDisplayIndex === undefined;
  const isCorrect = !isSkipped && currentQuestion.is_correct === 1;

  // Count stats from all questions
  const correctCount = questions.filter(q => q.is_correct === 1).length;
  const wrongCount = questions.filter(q => q.selected_answer !== null && q.selected_answer !== undefined && q.is_correct !== 1).length;
  const skippedCount = questions.filter(q => q.selected_answer === null || q.selected_answer === undefined).length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 sm:px-6 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate(`/student/test/${testId}/result`)}>
            <ChevronLeft className="w-4 h-4 mr-1 inline" /> Results
          </Button>
          <h1 className="text-lg font-bold text-gray-800 hidden sm:block">
            Review: {test?.test_name || 'Test'}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-green-600 font-medium">✓ {correctCount}</span>
          <span className="text-red-600 font-medium">✗ {wrongCount}</span>
          <span className="text-gray-400 font-medium">— {skippedCount}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl w-full mx-auto space-y-4">

            {/* Status Banner */}
            <div className={`p-3 rounded-xl flex items-center gap-3 border ${
              isSkipped ? 'bg-gray-100 border-gray-200 text-gray-700' :
              isCorrect ? 'bg-green-50 border-green-200 text-green-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              {isSkipped ? <AlertCircle className="w-5 h-5 text-gray-500" /> :
               isCorrect ? <Check className="w-5 h-5 text-green-600" /> :
               <X className="w-5 h-5 text-red-600" />}
              <span className="font-semibold">
                {isSkipped ? 'Skipped' : isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              {/* Question header */}
              <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                <h2 className="text-lg font-semibold text-gray-700">Question {currentIndex + 1} of {questions.length}</h2>
                <div className="flex gap-2 text-sm">
                  {currentQuestion.subject && <Badge>{currentQuestion.subject}</Badge>}
                  {currentQuestion.topic && <Badge variant="info">{currentQuestion.topic}</Badge>}
                </div>
              </div>

              {/* Question body */}
              <div className="p-6 sm:p-8">
                <div className="text-lg sm:text-xl text-gray-800 mb-8 font-medium leading-relaxed">
                  {currentQuestion.question_text}
                </div>

                <div className="space-y-3">
                  {displayedOptions.map((opt, idx) => {
                    if (!opt) return null;
                    const isSelected = userDisplayIndex === idx;
                    const isThisCorrect = correctDisplayIndex === idx;

                    let bgStyle = 'bg-white border-gray-200';
                    let icon = <div className="w-5 h-5 rounded-full border border-gray-300" />;

                    if (isThisCorrect) {
                      bgStyle = 'bg-green-50 border-green-400';
                      icon = <Check className="w-5 h-5 text-green-600" />;
                    } else if (isSelected && !isThisCorrect) {
                      bgStyle = 'bg-red-50 border-red-400';
                      icon = <X className="w-5 h-5 text-red-600" />;
                    }

                    return (
                      <div key={idx} className={`block p-4 border-2 rounded-xl transition-all ${bgStyle}`}>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-0.5">{icon}</div>
                          <div className="flex-1 text-gray-800">{String.fromCharCode(65 + idx)}. {opt}</div>
                          <div className="text-sm font-medium flex-shrink-0">
                            {isThisCorrect && <span className="text-green-600">Correct</span>}
                            {isSelected && !isThisCorrect && <span className="text-red-600">Your Answer</span>}
                            {isSelected && isThisCorrect && <span className="text-green-600 ml-2">✓ Your Answer</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {currentQuestion.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Explanation
                    </h4>
                    <p className="text-blue-800 leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                )}
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

                <span className="text-gray-500 font-medium">{currentIndex + 1} / {questions.length}</span>

                <Button
                  variant="primary"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1 inline" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="hidden lg:flex w-72 bg-white border-l shadow-sm flex-col shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-700">Questions</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const qSkipped = q.selected_answer === null || q.selected_answer === undefined;
                const qCorrect = q.is_correct === 1;

                let btnColor = 'bg-gray-100 text-gray-500 border-gray-200'; // skipped
                if (!qSkipped) {
                  btnColor = qCorrect
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-red-100 text-red-700 border-red-300';
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
            <div className="mt-6 space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                Correct ({correctCount})
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                Wrong ({wrongCount})
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                Skipped ({skippedCount})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestReview;
