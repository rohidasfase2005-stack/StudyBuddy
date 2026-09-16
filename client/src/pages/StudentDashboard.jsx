import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import { 
  Zap, 
  Target, 
  Flame, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar, 
  ArrowRight,
  PlusCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [targetData, setTargetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, targetRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/targets')
      ]);
      setDashData(statsRes.data);
      setTargetData(targetRes.data);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError('Unable to load dashboard information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const target = targetData?.target || { daily_questions: 20, daily_tests: 1, daily_study_minutes: 60 };
  const progress = targetData?.progress || { questions_today: 0, tests_today: 0, study_minutes_today: 0, streak_days: 0 };
  const schedules = targetData?.schedules || [];
  const recentTests = dashData?.recentTests || [];

  const questionsPercent = Math.min(Math.round((progress.questions_today / (target.daily_questions || 1)) * 100), 100);
  const testsPercent = Math.min(Math.round((progress.tests_today / (target.daily_tests || 1)) * 100), 100);
  const timePercent = Math.min(Math.round((progress.study_minutes_today / (target.daily_study_minutes || 1)) * 100), 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Student'} 👋
          </h1>
          <p className="text-indigo-100 text-sm mt-1">
            Ready for today's practice? Keep your streak going!
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl border border-white/20 self-start sm:self-auto">
          <Flame className="w-6 h-6 text-amber-300 animate-pulse" />
          <div>
            <p className="text-xs text-indigo-100 font-medium uppercase tracking-wider">Current Streak</p>
            <p className="text-lg font-bold">{progress.streak_days} {progress.streak_days === 1 ? 'Day' : 'Days'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchDashboardData}>Retry</Button>
        </div>
      )}

      {/* Main Grid: Today's Target + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Target Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Target className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Today's Target</h2>
            </div>
            <button 
              onClick={() => navigate('/student/daily-target')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Configure Target →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Questions Target */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                <span>Questions</span>
                <span className="text-indigo-600 font-bold">{progress.questions_today} / {target.daily_questions}</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${questionsPercent}%` }} />
              </div>
            </div>

            {/* Tests Target */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                <span>Tests</span>
                <span className="text-green-600 font-bold">{progress.tests_today} / {target.daily_tests}</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-green-600 h-full rounded-full transition-all" style={{ width: `${testsPercent}%` }} />
              </div>
            </div>

            {/* Study Time Target */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
              <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                <span>Study Time</span>
                <span className="text-purple-600 font-bold">{progress.study_minutes_today} / {target.daily_study_minutes}m</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${timePercent}%` }} />
              </div>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Need more practice?</p>
              <p className="text-xs text-gray-600 mt-0.5">Select PDF question papers and generate a custom random test.</p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow"
              onClick={() => navigate('/student/generate-test')}
            >
              <Zap className="w-4 h-4" /> Start Practice
            </Button>
          </div>
        </div>

        {/* Today's Schedule Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Today's Schedule</h2>
            </div>
            <button
              onClick={() => navigate('/student/daily-target')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-6 text-gray-500 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-sm">No study slots set for today.</p>
              <button
                onClick={() => navigate('/student/daily-target')}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                + Add Study Slot
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {schedules.map((slot) => (
                <div key={slot.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{slot.title}</p>
                    <p className="text-xs text-gray-500">{slot.start_time} – {slot.end_time}</p>
                  </div>
                  <Badge variant="default" size="sm">Scheduled</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Your Overall Progress Summary Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Your Progress</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tests Taken</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{dashData?.testsAttempted || 0}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Score</p>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-600 mt-1">{dashData?.averageScore || 0}%</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Best Score</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{dashData?.bestScore || 0}%</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Questions</p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{dashData?.totalQuestions || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Tests Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Tests</h2>
          <button 
            onClick={() => navigate('/student/tests')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All Tests <ArrowRight size={14} />
          </button>
        </div>

        {recentTests.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-gray-500 text-sm">No tests taken yet. Start with your first practice test!</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/student/generate-test')}>
              Generate Test Now
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500 font-medium">
                  <th className="pb-3">Test Name</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Accuracy</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTests.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 font-medium text-gray-900">{t.test_name || 'Practice Test'}</td>
                    <td className="py-3.5 text-gray-700 font-semibold">{t.score} / {t.total_questions}</td>
                    <td className="py-3.5">
                      <Badge variant={t.accuracy >= 70 ? 'success' : t.accuracy >= 40 ? 'warning' : 'danger'} size="sm">
                        {Math.round(t.accuracy || 0)}%
                      </Badge>
                    </td>
                    <td className="py-3.5 text-gray-500 text-xs">
                      {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => navigate(`/student/test/${t.id}/result`)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                      >
                        Review
                      </button>
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

export default StudentDashboard;
