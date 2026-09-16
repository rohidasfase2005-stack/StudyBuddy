import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Clock, ChevronRight, BarChart2 } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TestResult = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await api.get(`/tests/${testId}/result`);
        setResult(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load test result');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [testId]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!result) return <div className="p-8 text-center">No result available.</div>;

  // API returns { test: {...}, subjectWise: [{subject, total, correct}, ...] }
  const { test, subjectWise } = result;

  const totalQuestions = test.total_questions || 0;
  const correctCount = test.correct_count || 0;
  const wrongCount = test.wrong_count || 0;
  const skippedCount = test.skipped_count || 0;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Format subject stats for chart
  const chartData = (subjectWise || []).map(s => ({
    name: s.subject || 'Unknown',
    accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    correct: s.correct,
    total: s.total
  }));

  const getPercentageColor = (pct) => {
    if (pct >= 80) return 'text-green-500';
    if (pct >= 60) return 'text-blue-500';
    if (pct >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBarColor = (pct) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#3b82f6';
    if (pct >= 40) return '#eab308';
    return '#ef4444';
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const formatTime = (seconds) => {
    if (!seconds) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Test Result</h1>
          <p className="text-gray-500 mt-1">{test.test_name || 'Practice Test'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/')}>Dashboard</Button>
          <Button variant="primary" onClick={() => navigate(`/test/${testId}/review`)}>Review Answers</Button>
          <Button variant="secondary" onClick={() => navigate('/generate')}>New Test</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Card */}
        <Card className="p-8 flex flex-col items-center justify-center text-center col-span-1 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-600 mb-6">Overall Score</h3>

          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
              <circle
                cx="70" cy="70" r={radius} fill="transparent"
                stroke={getBarColor(percentage)} strokeWidth="12"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round" className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getPercentageColor(percentage)}`}>{percentage}%</span>
              <span className="text-sm text-gray-500 font-medium mt-1">{correctCount} / {totalQuestions}</span>
            </div>
          </div>

          <p className="mt-6 text-gray-600 font-medium">
            {percentage >= 80 ? '🎉 Excellent work!' :
             percentage >= 60 ? '👍 Good job!' :
             percentage >= 40 ? '📚 Keep practicing.' : '💪 Needs improvement.'}
          </p>
        </Card>

        {/* Stats Grid */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
          <Card className="p-5 flex items-center gap-4 bg-green-50 border-green-100">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Correct</p>
              <p className="text-2xl font-bold text-green-700">{correctCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-red-50 border-red-100">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <XCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Wrong</p>
              <p className="text-2xl font-bold text-red-700">{wrongCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-gray-50">
            <div className="p-3 bg-gray-200 rounded-full text-gray-600">
              <MinusCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Skipped</p>
              <p className="text-2xl font-bold text-gray-700">{skippedCount}</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-blue-50 border-blue-100">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Time Taken</p>
              <p className="text-2xl font-bold text-blue-700">{formatTime(test.time_taken)}</p>
            </div>
          </Card>
        </div>
      </div>

      {chartData.length > 0 && (
        <Card className="p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-gray-500" />
            <h3 className="text-xl font-bold text-gray-800">Subject Performance</h3>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, 'Accuracy']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="accuracy" name="accuracy" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-4 pt-4 pb-8">
        <Button
          variant="primary"
          onClick={() => navigate(`/student/test/${testId}/review`)}
          className="px-6 bg-indigo-600 hover:bg-indigo-700"
        >
          Review Answers <ChevronRight className="w-4 h-4 ml-1 inline" />
        </Button>

        {wrongCount > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/student/wrong-questions')}
            className="px-6 border-red-300 text-red-600 hover:bg-red-50"
          >
            Practice Wrong Questions ({wrongCount})
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => navigate('/student/generate-test')}
          className="px-6"
        >
          Generate New Test
        </Button>
      </div>
    </div>
  );
};

export default TestResult;
