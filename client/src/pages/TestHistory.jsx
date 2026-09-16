import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import api from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TestHistory = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const limit = 20;

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/tests?page=${page}&limit=${limit}`);
        setTests(response.data.tests || []);
        setTotalPages(Math.ceil((response.data.total || 0) / limit) || 1);
      } catch (err) {
        console.error('Failed to load test history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [page]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getScoreColor = (score, total) => {
    if (!total) return 'text-gray-500';
    const pct = (score / total) * 100;
    if (pct >= 80) return 'text-green-600 font-semibold';
    if (pct >= 60) return 'text-blue-600 font-semibold';
    if (pct >= 40) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Test History</h1>
          <p className="text-gray-600 mt-2">Review your past performance and track your progress.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12"><LoadingSpinner /></div>
        ) : tests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tests found</h3>
            <p>You haven't taken any tests yet. Go to Practice to start.</p>
            <Button className="mt-4" onClick={() => navigate('/practice')}>Start Practicing</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Test Name</th>
                  <th className="p-4 font-medium">Mode</th>
                  <th className="p-4 font-medium text-center">Score</th>
                  <th className="p-4 font-medium text-center">Accuracy</th>
                  <th className="p-4 font-medium text-right">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tests.map((test) => {
                  const accuracy = test.total_questions > 0 
                    ? Math.round((test.score / test.total_questions) * 100) 
                    : 0;
                  
                  return (
                    <tr 
                      key={test.id} 
                      onClick={() => navigate(`/student/test/${test.id}/result`)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors group"
                    >
                      <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(test.started_at || test.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900 group-hover:text-indigo-600">
                          {test.test_name || test.name || 'Practice Test'}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="default" className="capitalize">
                          {test.test_mode || test.mode || 'Random'}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <span className={getScoreColor(test.score, test.total_questions)}>
                          {test.score} / {test.total_questions}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-2 py-1 rounded bg-gray-100 text-sm font-medium text-gray-700">
                          {accuracy}%
                        </span>
                      </td>
                      <td className="p-4 text-right text-sm text-gray-500">
                        {formatTime(test.time_taken)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && tests.length > 0 && totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-600">
              Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TestHistory;

