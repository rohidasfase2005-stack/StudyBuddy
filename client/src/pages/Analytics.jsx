import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Target, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const Analytics = () => {
  const [data, setData] = useState({ overview: null, subjects: [], weakTopics: [], history: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [overviewRes, subjectsRes, weakTopicsRes, historyRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/subjects'),
          api.get('/analytics/weak-topics'),
          api.get('/analytics/history')
        ]);
        
        setData({
          overview: overviewRes.data,
          subjects: subjectsRes.data,
          weakTopics: weakTopicsRes.data,
          history: historyRes.data
        });
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner />;

  const { overview, subjects, weakTopics, history } = data;

  const statCards = [
    { title: 'Total Tests Taken', value: overview?.totalTests || 0, icon: Target, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Questions Attempted', value: overview?.questionsAttempted || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Overall Accuracy', value: `${overview?.overallAccuracy || 0}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Study Time', value: overview?.studyTimeHours ? `${overview.studyTimeHours}h` : '0h', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Performance Analytics</h1>
        <p className="text-gray-600 mt-2">Track your progress and identify areas for improvement.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-full ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score History */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Score History</h3>
          {history && history.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{fill: '#6b7280'}} tickMargin={10} />
                  <YAxis domain={[0, 100]} stroke="#9ca3af" tick={{fill: '#6b7280'}} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    name="Accuracy %" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">Not enough data to display history.</div>
          )}
        </Card>

        {/* Subject Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Subject Performance</h3>
          {subjects && subjects.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjects} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="name" type="category" width={100} stroke="#9ca3af" tick={{fill: '#4b5563', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="accuracy" name="Accuracy %" radius={[0, 4, 4, 0]} barSize={24}>
                    {subjects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.accuracy > 70 ? '#10b981' : entry.accuracy > 40 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">Not enough data to display subject performance.</div>
          )}
        </Card>
      </div>

      {/* Weak Topics */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Areas for Improvement</h3>
        {weakTopics && weakTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weakTopics.map((topic, idx) => {
              const accuracy = parseFloat(topic.accuracy);
              let colorClass = 'border-red-200 bg-red-50 text-red-700';
              let badgeClass = 'bg-red-100 text-red-800';
              
              if (accuracy >= 50 && accuracy < 70) {
                colorClass = 'border-orange-200 bg-orange-50 text-orange-700';
                badgeClass = 'bg-orange-100 text-orange-800';
              } else if (accuracy >= 70) {
                colorClass = 'border-green-200 bg-green-50 text-green-700';
                badgeClass = 'bg-green-100 text-green-800';
              }

              return (
                <div key={idx} className={`p-5 rounded-xl border flex flex-col justify-between ${colorClass}`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg">{topic.topic_name}</h4>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${badgeClass}`}>
                        {topic.accuracy}%
                      </span>
                    </div>
                    <p className="text-sm opacity-80 mb-4">{topic.subject_name}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-white/50 hover:bg-white"
                    onClick={() => navigate('/student/generate-test')}
                  >
                    Practice Topic
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500 border border-dashed rounded-xl">
            You don't have enough data yet or you have mastered all topics! Keep practicing.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Analytics;

