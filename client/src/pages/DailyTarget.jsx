import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { 
  Target, 
  Clock, 
  Calendar, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  BookOpen, 
  PenTool 
} from 'lucide-react';

const DailyTarget = () => {
  const navigate = useNavigate();

  const [dailyQuestions, setDailyQuestions] = useState(20);
  const [dailyTests, setDailyTests] = useState(1);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(60);

  const [schedules, setSchedules] = useState([]);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotStart, setSlotStart] = useState('07:00 AM');
  const [slotEnd, setSlotEnd] = useState('08:00 AM');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchTargets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/targets');
      if (res.data?.target) {
        setDailyQuestions(res.data.target.daily_questions || 20);
        setDailyTests(res.data.target.daily_tests || 1);
        setDailyStudyMinutes(res.data.target.daily_study_minutes || 60);
      }
      setSchedules(res.data?.schedules || []);
    } catch (err) {
      console.error('Failed to load targets:', err);
      setError('Unable to load target settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleSaveTargets = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put('/targets', {
        daily_questions: parseInt(dailyQuestions, 10),
        daily_tests: parseInt(dailyTests, 10),
        daily_study_minutes: parseInt(dailyStudyMinutes, 10),
      });
      setMessage('Daily targets updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update targets');
    } finally {
      setSaving(false);
    }
  };

  const handleAddScheduleSlot = async (e) => {
    e.preventDefault();
    if (!slotTitle.trim()) {
      setError('Please provide a title for the study slot.');
      return;
    }

    setAddingSlot(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/targets/schedules', {
        title: slotTitle.trim(),
        start_time: slotStart,
        end_time: slotEnd,
      });
      setSchedules(prev => [...prev, res.data]);
      setSlotTitle('');
      setMessage('Study slot added to your daily schedule!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add study slot');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      await api.delete(`/targets/schedules/${slotId}`);
      setSchedules(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      setError('Failed to remove study slot');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 font-medium">Loading target preferences...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Daily Target & Schedule</h1>
        <p className="text-gray-500 text-sm mt-1">
          Set your daily study goals and organize your study time slots.
        </p>
      </div>

      {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Target Settings Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
            <Target size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Daily Practice Targets</h2>
            <p className="text-xs text-gray-500">Tracked on your student dashboard every day.</p>
          </div>
        </div>

        <form onSubmit={handleSaveTargets} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Daily Questions */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Questions per day
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={dailyQuestions}
                  onChange={(e) => setDailyQuestions(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">Qs</span>
              </div>
            </div>

            {/* Daily Tests */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Tests per day
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={dailyTests}
                  onChange={(e) => setDailyTests(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">Tests</span>
              </div>
            </div>

            {/* Study Time */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800">
                Study time per day
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={720}
                  value={dailyStudyMinutes}
                  onChange={(e) => setDailyStudyMinutes(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">min</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              className="px-6 bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save Targets'}
            </Button>
          </div>
        </form>
      </div>

      {/* Daily Study Schedule Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
            <Calendar size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Daily Study Schedule Slots</h2>
            <p className="text-xs text-gray-500">Plan recurring study blocks to maintain consistency.</p>
          </div>
        </div>

        {/* Add Slot Form */}
        <form onSubmit={handleAddScheduleSlot} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">+ Add New Study Slot</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Slot Name</label>
              <input
                type="text"
                placeholder="e.g. Morning Practice"
                value={slotTitle}
                onChange={(e) => setSlotTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Time</label>
              <input
                type="text"
                placeholder="07:00 AM"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Time</label>
              <input
                type="text"
                placeholder="08:00 AM"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={addingSlot}
            >
              {addingSlot ? <LoadingSpinner size="sm" /> : 'Add Slot'}
            </Button>
          </div>
        </form>

        {/* Slots List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Configured Slots</h3>
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2">No study slots added yet. Add a slot above to build your daily routine.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {schedules.map(slot => (
                <div key={slot.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{slot.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock size={12} className="text-indigo-500" /> {slot.start_time} – {slot.end_time}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Slot"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyTarget;
