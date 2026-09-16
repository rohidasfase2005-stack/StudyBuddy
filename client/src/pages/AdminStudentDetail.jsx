import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Clock, CheckCircle, BarChart2, Calendar, Activity } from 'lucide-react';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AdminStudentDetail = () => {
  const { id: studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/admin/students/${studentId}`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load student details:', err);
        setError(err.response?.data?.message || 'Failed to load student record');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data?.student) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600">{error || 'Student not found.'}</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>Back to Admin Dashboard</Button>
      </div>
    );
  }

  const { student, tests = [], activities = [], totalStudyTimeMinutes = 0, totalStudyTimeSeconds = 0 } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ChevronLeft size={16} className="mr-1" /> Back to Students
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Student Profile & Activity</h1>
      </div>

      {/* Profile Overview Card */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-2xl">
              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
              <p className="text-sm text-gray-500">{student.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium">
                  {student.role || 'student'}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={12} /> Joined: {new Date(student.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center sm:text-right">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Study Time</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{totalStudyTimeMinutes} min</p>
              <p className="text-xs text-gray-400">({totalStudyTimeSeconds}s)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 uppercase font-semibold">Tests Completed</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {tests.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tests Record Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" /> Test Performance History
          </h3>
          <span className="text-xs text-gray-500">{tests.length} Total Attempts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4">Test Name</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time Spent</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-400">No tests taken yet.</td>
                </tr>
              ) : (
                tests.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{t.test_name}</td>
                    <td className="py-3 px-4">{t.correct_count} / {t.total_questions}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${
                        t.accuracy >= 70 ? 'text-green-600' : t.accuracy >= 40 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {Math.round(t.accuracy || 0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{Math.round(t.time_taken || 0)}s</td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {t.completed_at ? new Date(t.completed_at).toLocaleString() : 'In progress'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Sessions Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Activity size={18} className="text-indigo-600" /> Recorded Activity Sessions
          </h3>
          <span className="text-xs text-gray-500">{activities.length} Sessions Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
              <tr>
                <th className="py-3 px-4">Activity Type</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-gray-400">No activity sessions logged yet.</td>
                </tr>
              ) : (
                activities.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {a.activity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-600">
                      {Math.round(a.duration_seconds / 60)} min ({a.duration_seconds}s)
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-400">
                      {a.session_id.substring(0, 20)}...
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(a.last_heartbeat).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetail;
