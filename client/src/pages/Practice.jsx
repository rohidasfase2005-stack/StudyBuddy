import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, BookOpen, Target, XCircle, HelpCircle, ClipboardList, ArrowRight } from 'lucide-react';
import api from '../services/api';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Practice = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const practiceModes = [
    {
      id: 'random',
      title: 'Random Mix',
      description: 'Test your knowledge with a random mix of questions from all available subjects.',
      icon: Shuffle,
      color: 'bg-purple-100 text-purple-600',
      path: '/generate?mode=random',
      count: stats?.totalQuestions || 0,
      countLabel: 'Available Questions'
    },
    {
      id: 'subject',
      title: 'Subject Practice',
      description: 'Focus your practice on a specific subject to master its concepts.',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      path: '/generate?mode=subject',
      count: stats?.subjectCount || 0,
      countLabel: 'Subjects Available'
    },
    {
      id: 'topic',
      title: 'Topic Deep Dive',
      description: 'Target specific topics where you need the most improvement.',
      icon: Target,
      color: 'bg-emerald-100 text-emerald-600',
      path: '/generate?mode=topic',
      count: stats?.topicCount || 0,
      countLabel: 'Topics Available'
    },
    {
      id: 'wrong',
      title: 'Review Mistakes',
      description: 'Revisit questions you previously answered incorrectly to learn from your mistakes.',
      icon: XCircle,
      color: 'bg-red-100 text-red-600',
      path: '/generate?mode=wrong',
      count: stats?.wrongQuestions || 0,
      countLabel: 'Questions to Review'
    },
    {
      id: 'unattempted',
      title: 'New Questions',
      description: 'Challenge yourself with fresh questions you have never seen before.',
      icon: HelpCircle,
      color: 'bg-yellow-100 text-yellow-600',
      path: '/generate?mode=unattempted',
      count: stats?.unattemptedQuestions || 0,
      countLabel: 'Unseen Questions'
    },
    {
      id: 'mock',
      title: 'Full Mock Test',
      description: 'Simulate a real exam environment with a full-length, timed mock test.',
      icon: ClipboardList,
      color: 'bg-indigo-100 text-indigo-600',
      path: '/generate?mode=mock',
      count: 'Timed',
      countLabel: 'Exam Format'
    }
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Practice Center</h1>
        <p className="text-gray-600 mt-2 text-lg">Choose a practice mode to improve your skills and knowledge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practiceModes.map((mode) => (
          <Card 
            key={mode.id}
            className="flex flex-col h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-transparent hover:border-blue-200 group"
            onClick={() => navigate(mode.path)}
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${mode.color}`}>
                  <mode.icon className="w-7 h-7" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">{mode.count}</div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{mode.countLabel}</div>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {mode.title}
              </h3>
              
              <p className="text-gray-600 flex-1">
                {mode.description}
              </p>
              
              <div className="mt-6 flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
                Start Practice <ArrowRight className="w-5 h-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Practice;

