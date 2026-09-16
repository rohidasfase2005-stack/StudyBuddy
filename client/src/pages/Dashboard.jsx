import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import { BookOpen, FileText, PenTool, Target, PlusCircle, TrendingUp, Clock } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentTests, setRecentTests] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/dashboard/stats');
      const d = response.data;
      setStats({
        totalQuestions: d.totalQuestions || 0,
        totalPdfs: d.totalPdfs || 0,
        testsAttempted: d.testsAttempted || 0,
        averageScore: d.averageScore || 0,
        bestScore: d.bestScore || 0,
      });
      setRecentTests(d.recentTests || []);
      setSubjectCounts(d.subjectCounts || []);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500">Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <h2 className="text-lg font-bold mb-2">Unable to load dashboard</h2>
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="primary" onClick={fetchDashboard}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Questions</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalQuestions}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">PDFs Uploaded</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalPdfs}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <PenTool className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tests Attempted</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.testsAttempted}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.averageScore}%</p>
            {stats?.bestScore > 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> Best: {stats.bestScore}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Generate Test CTA */}
      <div className="flex justify-center my-4">
        <Button
          size="lg"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-8 py-4 text-lg rounded-full shadow-lg"
          onClick={() => navigate('/generate')}
        >
          <PlusCircle className="w-6 h-6" />
          <span>Generate New Test</span>
        </Button>
      </div>

      {/* Recent Tests + Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Tests</h3>
          {recentTests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No tests taken yet.</p>
              <Button variant="outline" className="mt-3" onClick={() => navigate('/generate')}>
                Take Your First Test
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-2 font-medium">Test</th>
                    <th className="pb-2 font-medium">Score</th>
                    <th className="pb-2 font-medium">Accuracy</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.map((test, idx) => (
                    <tr
                      key={test.id || idx}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/test/${test.id}/result`)}
                    >
                      <td className="py-3 font-medium text-gray-900">
                        {test.test_name || 'Practice Test'}
                      </td>
                      <td className="py-3 text-gray-700">
                        {test.score} / {test.total_questions}
                      </td>
                      <td className="py-3">
                        <Badge variant={
                          test.accuracy >= 70 ? 'success' :
                          test.accuracy >= 40 ? 'warning' : 'danger'
                        }>
                          {Math.round(test.accuracy || 0)}%
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {test.completed_at
                          ? new Date(test.completed_at).toLocaleDateString()
                          : 'In progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subject Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Subject-wise Questions</h3>
          {subjectCounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No questions available yet.</p>
              <Button variant="outline" className="mt-3" onClick={() => navigate('/pdfs')}>
                Upload a PDF
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subjectCounts.map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 w-40 truncate">{sub.subject}</span>
                  <div className="flex-1 mx-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min((sub.count / (stats?.totalQuestions || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-10 text-right font-medium">{sub.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
