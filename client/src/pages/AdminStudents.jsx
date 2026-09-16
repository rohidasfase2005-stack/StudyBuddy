import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import { 
  Users, 
  Search, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

const AdminStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
      setError('Failed to fetch student directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Loading registered students...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Registered Students</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor student engagement, test performance, and study duration.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchStudents}>Retry</Button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" /> All Students ({students.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No students found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 border-b text-gray-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-4">Tests Taken</th>
                  <th className="py-3.5 px-4">Average Score</th>
                  <th className="py-3.5 px-4">Study Time</th>
                  <th className="py-3.5 px-4">Last Active</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(st => (
                  <tr
                    key={st.id}
                    onClick={() => navigate(`/admin/students/${st.id}`)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                          {st.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{st.name}</p>
                          <p className="text-xs text-gray-500">{st.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-700">
                      {st.tests_completed || 0}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={st.avg_score >= 70 ? 'success' : st.avg_score >= 40 ? 'warning' : 'default'} size="sm">
                        {Math.round(st.avg_score || 0)}%
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-600 font-medium">
                      {Math.round((st.study_time_seconds || 0) / 60)} min
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-xs">
                      {st.last_active ? new Date(st.last_active).toLocaleDateString() : 'Active today'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1">
                        Details <ChevronRight size={14} />
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

export default AdminStudents;
