import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Badge from '../components/common/Badge';
import { 
  XCircle, 
  RotateCcw, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle,
  ArrowRight,
  BookOpen
} from 'lucide-react';

const WrongQuestions = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ totalWrong: 0, questions: [] });
  const [loading, setLoading] = useState(true);
  const [practicing, setPracticing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  const fetchWrongSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tests/wrong-summary');
      setData(res.data || { totalWrong: 0, questions: [] });
    } catch (err) {
      console.error('Failed to load wrong questions:', err);
      setError('Unable to load wrong questions history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWrongSummary();
  }, []);

  const handleStartWrongPractice = async () => {
    if (data.totalWrong === 0) return;
    setPracticing(true);
    setError('');
    try {
      const count = Math.min(data.totalWrong, 20);
      const res = await api.post('/tests/generate', {
        questionCount: count,
        mode: 'wrong',
      });
      if (res.data?.test?.id) {
        navigate(`/student/test/${res.data.test.id}`);
      }
    } catch (err) {
      console.error('Failed to generate wrong questions test:', err);
      setError(err.response?.data?.message || 'Failed to start practice session.');
    } finally {
      setPracticing(false);
    }
  };

  const subjects = ['All', ...new Set(data.questions.map(q => q.subject).filter(Boolean))];

  const filteredQuestions = data.questions.filter(q => {
    const matchesSubject = selectedSubject === 'All' || q.subject === selectedSubject;
    const matchesSearch = !searchTerm || q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) || (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Loading wrong questions analysis...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <XCircle size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wrong Questions Center</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Target and master the questions you missed in previous tests.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={practicing || data.totalWrong === 0}
          onClick={handleStartWrongPractice}
          className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 rounded-xl shadow-md self-start sm:self-auto w-full sm:w-auto"
        >
          {practicing ? <LoadingSpinner size="sm" /> : <RotateCcw size={18} />}
          <span>Practice Mistakes ({Math.min(data.totalWrong, 20)} Qs)</span>
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Mistakes Stored</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{data.totalWrong}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Affected Subjects</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{Math.max(subjects.length - 1, 0)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready for Review</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{data.questions.length}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {data.totalWrong > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <input
            type="text"
            placeholder="Search within missed questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedSubject === sub
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Questions List */}
      {data.totalWrong === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">No Incorrect Questions!</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              You haven't made any mistakes yet or all previous tests were 100% accurate. Keep practicing!
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/student/generate-test')}>
            Take a Practice Test
          </Button>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 shadow-sm">
          No questions match your current search or filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const optKeys = [
              { key: 'A', text: q.option_a },
              { key: 'B', text: q.option_b },
              { key: 'C', text: q.option_c },
              { key: 'D', text: q.option_d },
            ].filter(o => o.text && o.text.trim() !== '');

            return (
              <div key={q.id || idx} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <Badge variant="default" size="sm">{q.subject || 'General'}</Badge>
                    {q.difficulty && <Badge variant="warning" size="sm">{q.difficulty}</Badge>}
                  </div>
                </div>

                <p className="text-base font-medium text-gray-900 leading-relaxed">
                  {q.question_text}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {optKeys.map((opt, oIdx) => {
                    const isCorrect = oIdx === q.correct_answer;
                    return (
                      <div
                        key={opt.key}
                        className={`p-3 rounded-xl border text-sm flex items-center justify-between ${
                          isCorrect
                            ? 'border-green-300 bg-green-50/70 font-semibold text-green-900'
                            : 'border-gray-200 bg-gray-50/50 text-gray-700'
                        }`}
                      >
                        <span>
                          <strong className="mr-2">{opt.key})</strong> {opt.text}
                        </span>
                        {isCorrect && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900">
                    <strong className="font-semibold block mb-1">Explanation / Solution:</strong>
                    <p className="whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WrongQuestions;
