import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { Save, Trash2, CheckCircle } from 'lucide-react';

const QuestionReview = () => {
  const { id: pdfId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/questions?pdf_id=${pdfId}&limit=200`);
      setQuestions(res.data);
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [pdfId]);

  const handleUpdateField = (qId, field, value) => {
    setQuestions(qs => qs.map(q => q.id === qId ? { ...q, [field]: value } : q));
  };

  const handleSave = async (qId) => {
    setSavingId(qId);
    try {
      const q = questions.find(q => q.id === qId);
      await api.put(`/questions/${qId}`, {
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        explanation: q.explanation,
        needs_review: false
      });
      handleUpdateField(qId, 'needs_review', false);
    } catch (err) {
      alert('Failed to save question');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (qId) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      setQuestions(qs => qs.filter(q => q.id !== qId));
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  const handleApproveAll = async () => {
    try {
      await api.post(`/questions/approve-all/${pdfId}`);
      setQuestions(qs => qs.map(q => ({ ...q, needs_review: false })));
    } catch (err) {
      alert('Failed to approve all');
    }
  };

  if (loading) return <div className="flex justify-center mt-12"><LoadingSpinner size="lg" /></div>;
  if (error) return <Alert type="error" message={error} className="m-8" />;

  const total = questions.length;
  const needsReview = questions.filter(q => q.needs_review).length;
  const approved = total - needsReview;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Questions</h1>
          <p className="text-gray-500 mt-1">
            Total: {total} | Approved: {approved} | Needs Review: {needsReview}
          </p>
        </div>
        <Button onClick={handleApproveAll} className="flex items-center gap-2" variant="outline">
          <CheckCircle className="w-4 h-4" /> Approve All
        </Button>
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id} className="p-6 relative">
            {q.needs_review && (
              <div className="absolute top-4 right-4">
                <Badge type="warning" text="Needs Review" />
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <span className="font-bold text-gray-500">Q{index + 1}</span>
                <textarea
                  className="w-full p-2 border rounded resize-none"
                  rows={3}
                  value={q.question_text}
                  onChange={(e) => handleUpdateField(q.id, 'question_text', e.target.value)}
                  placeholder="Question text"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                {['a', 'b', 'c', 'd'].map(opt => (
                  <div key={opt} className="flex items-center gap-2">
                    <span className="font-medium uppercase">{opt})</span>
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded"
                      value={q[`option_${opt}`]}
                      onChange={(e) => handleUpdateField(q.id, `option_${opt}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-10">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Correct Answer</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={q.correct_answer}
                    onChange={(e) => handleUpdateField(q.id, 'correct_answer', e.target.value)}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Difficulty</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={q.difficulty}
                    onChange={(e) => handleUpdateField(q.id, 'difficulty', e.target.value)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={q.subject || ''}
                    onChange={(e) => handleUpdateField(q.id, 'subject', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Topic</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={q.topic || ''}
                    onChange={(e) => handleUpdateField(q.id, 'topic', e.target.value)}
                  />
                </div>
              </div>

              <div className="pl-10">
                <label className="block text-sm text-gray-500 mb-1">Explanation</label>
                <textarea
                  className="w-full p-2 border rounded resize-none"
                  rows={2}
                  value={q.explanation || ''}
                  onChange={(e) => handleUpdateField(q.id, 'explanation', e.target.value)}
                />
              </div>
              
              <div className="flex justify-end gap-2 pl-10 pt-2 border-t">
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(q.id)}>
                  <Trash2 className="w-4 h-4 mr-2 inline" /> Delete
                </Button>
                <Button onClick={() => handleSave(q.id)} disabled={savingId === q.id}>
                  {savingId === q.id ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4 mr-2 inline" /> Save</>}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuestionReview;

