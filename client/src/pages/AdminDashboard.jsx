import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  BarChart2, 
  TrendingUp,
  Shield,
  UploadCloud,
  Zap
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, studentsRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/students'),
        ]);
        setStats(dashRes.data);
        setStudents(studentsRes.data || []);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
        setError(err.response?.data?.message || 'Access denied or failed to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const studyTimeHours = Math.round((stats?.totalStudyTimeMinutes || 0) / 60);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Platform overview and management controls</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/admin/pdfs')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow"
          >
            <UploadCloud size={16} /> Upload PDFs
          </Button>
        </div>
      </div>

      {/* 6 Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Students</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats?.totalStudents || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">PDFs</p>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1">{stats?.totalPdfs || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{stats?.totalQuestions || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tests Taken</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{stats?.totalTests || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Today</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">{stats?.activeToday || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Study Time</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{studyTimeHours} hrs</p>
        </div>
      </div>

      {/* Recent Student Activity Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" /> Recent Student Activity
          </h2>
          <button 
            onClick={() => navigate('/admin/students')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All Students <ChevronRight size={14} />
          </button>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No student records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-gray-500 font-semibold">
                <tr>
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Tests Taken</th>
                  <th className="pb-3">Avg Score</th>
                  <th className="pb-3">Study Time</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.slice(0, 5).map(st => (
                  <tr 
                    key={st.id} 
                    onClick={() => navigate(`/admin/students/${st.id}`)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 font-medium text-gray-900">
                      <div>
                        <p className="font-semibold">{st.name}</p>
                        <p className="text-xs text-gray-500">{st.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 text-gray-700 font-semibold">{st.tests_completed || 0}</td>
                    <td className="py-3.5">
                      <Badge variant={st.avg_score >= 70 ? 'success' : st.avg_score >= 40 ? 'warning' : 'default'} size="sm">
                        {Math.round(st.avg_score || 0)}%
                      </Badge>
                    </td>
                    <td className="py-3.5 text-gray-600 font-medium">{Math.round((st.study_time_seconds || 0) / 60)} min</td>
                    <td className="py-3.5 text-right">
                      <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        View →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
