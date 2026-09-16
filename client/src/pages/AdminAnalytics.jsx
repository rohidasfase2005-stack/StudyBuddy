import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Award,
  PieChart
} from 'lucide-react';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [dashRes, testsRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/analytics/tests')
        ]);
        setData({
          ...dashRes.data,
          modes: testsRes.data?.modes || [],
          scoreDistribution: testsRes.data?.scoreDistribution || []
        });
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
        setError('Failed to fetch platform analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Loading platform analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          High-level insights on test attempts, study patterns, and score distributions across all students.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tests Taken</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{data?.totalTests || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Students</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{data?.activeToday || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Study Time</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{Math.round((data?.totalStudyTimeMinutes || 0) / 60)} hrs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question Bank</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{data?.totalQuestions || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Mode Usage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" /> Practice Modes Popularity
          </h2>
          {(!data?.modes || data.modes.length === 0) ? (
            <p className="text-sm text-gray-500 py-6 text-center">No test attempts recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {data.modes.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-semibold text-sm text-gray-800 capitalize">{m.test_mode?.replace('_', ' ') || 'Random'}</span>
                  <Badge variant="info" size="sm">{m.count} attempts</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Score Distribution
          </h2>
          {(!data?.scoreDistribution || data.scoreDistribution.length === 0) ? (
            <p className="text-sm text-gray-500 py-6 text-center">No completed tests for distribution.</p>
          ) : (
            <div className="space-y-3">
              {data.scoreDistribution.map((s, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>{s.range}</span>
                    <span>{s.count} Tests</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min((s.count / (data.totalTests || 1)) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
