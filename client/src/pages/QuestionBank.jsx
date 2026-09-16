import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import SearchInput from '../components/common/SearchInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { Edit2, Trash2 } from 'lucide-react';

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    subject: '',
    topic: '',
    difficulty: '',
    search: ''
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [subRes, topRes] = await Promise.all([
          api.get('/questions/subjects'),
          api.get('/questions/topics')
        ]);
        setSubjects(subRes.data);
        setTopics(topRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 20,
        ...filters
      }).toString();
      
      const res = await api.get(`/questions?${query}`);
      setQuestions(res.data.questions || res.data);
      if (res.data.totalPages) setTotalPages(res.data.totalPages);
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchInput 
              placeholder="Search questions..." 
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <select 
            className="p-2 border rounded"
            value={filters.subject}
            onChange={(e) => handleFilterChange('subject', e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            className="p-2 border rounded"
            value={filters.topic}
            onChange={(e) => handleFilterChange('topic', e.target.value)}
          >
            <option value="">All Topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            className="p-2 border rounded"
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </Card>

      {error && <Alert type="error" message={error} />}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Question</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Subject</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Topic</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Difficulty</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No questions found.</td>
                  </tr>
                ) : (
                  questions.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-md truncate" title={q.question_text}>
                          {q.question_text}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{q.subject}</td>
                      <td className="px-6 py-4 text-sm">{q.topic}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          q.difficulty === 'Hard' ? 'bg-red-100 text-red-800' :
                          q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <Button variant="ghost" size="sm"><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex justify-center gap-2">
        <Button 
          disabled={page === 1} 
          onClick={() => setPage(p => p - 1)} 
          variant="outline"
        >
          Previous
        </Button>
        <span className="py-2 px-4 text-gray-600">Page {page} of {totalPages || 1}</span>
        <Button 
          disabled={page >= totalPages} 
          onClick={() => setPage(p => p + 1)} 
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default QuestionBank;

