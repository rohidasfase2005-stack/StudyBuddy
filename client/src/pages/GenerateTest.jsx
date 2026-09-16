import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import Badge from '../components/common/Badge';
import { 
  Zap, 
  FileText, 
  CheckSquare, 
  Square, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';

const PRESET_COUNTS = [10, 20, 25, 50, 100];

const TIMER_OPTIONS = [
  { label: 'No Timer', seconds: 0 },
  { label: '10 min', seconds: 600 },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 },
  { label: '60 min', seconds: 3600 },
];

const MODES = [
  { value: 'random', label: 'Random Mix', desc: 'Randomly selected questions from chosen sources' },
  { value: 'balanced_subject', label: 'Balanced by Subject', desc: 'Equal distribution across subjects' },
  { value: 'balanced_difficulty', label: 'Balanced by Difficulty', desc: 'Equal mix of Easy, Medium, and Hard' },
  { value: 'unattempted', label: 'Unattempted Only', desc: 'Questions you have never answered before' },
  { value: 'wrong', label: 'Wrong Questions Only', desc: 'Questions you previously answered incorrectly' },
];

const GenerateTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pdfs, setPdfs] = useState([]);
  const [selectedPdfIds, setSelectedPdfIds] = useState([]);
  const [numQuestions, setNumQuestions] = useState(20);
  const [customNum, setCustomNum] = useState('');
  const [difficulty, setDifficulty] = useState('Mixed');
  const [mode, setMode] = useState(searchParams.get('mode') || 'random');
  const [timeLimit, setTimeLimit] = useState(0);

  const [loading, setLoading] = useState(false);
  const [fetchingPdfs, setFetchingPdfs] = useState(true);
  const [error, setError] = useState('');

  // Fetch available completed PDFs
  useEffect(() => {
    const fetchPdfs = async () => {
      try {
        const res = await api.get('/pdfs');
        const list = (res.data || []).filter(p => p.processing_status === 'completed' && p.question_count > 0);
        setPdfs(list);
        // By default select all PDFs
        setSelectedPdfIds(list.map(p => p.id));
      } catch (err) {
        console.error('Failed to load PDFs:', err);
      } finally {
        setFetchingPdfs(false);
      }
    };
    fetchPdfs();
  }, []);

  const togglePdf = (pdfId) => {
    setSelectedPdfIds(prev =>
      prev.includes(pdfId) ? prev.filter(id => id !== pdfId) : [...prev, pdfId]
    );
  };

  const handleSelectAllPdfs = () => {
    if (selectedPdfIds.length === pdfs.length) {
      setSelectedPdfIds([]);
    } else {
      setSelectedPdfIds(pdfs.map(p => p.id));
    }
  };

  // Calculate total available questions from selected PDFs
  const totalAvailableQuestions = selectedPdfIds.length === 0 && pdfs.length === 0
    ? 25 // fallback demo questions
    : selectedPdfIds.length === 0
      ? 0
      : pdfs.filter(p => selectedPdfIds.includes(p.id)).reduce((sum, p) => sum + (p.question_count || 0), 0);

  const selectedCount = numQuestions === 'custom' ? parseInt(customNum, 10) || 0 : numQuestions;

  const handleGenerate = async () => {
    setError('');

    if (pdfs.length > 0 && selectedPdfIds.length === 0) {
      setError('Please select at least one PDF question paper.');
      return;
    }

    if (!selectedCount || selectedCount < 1) {
      setError('Please enter a valid number of questions (minimum 1).');
      return;
    }

    // Validation against available pool
    if (totalAvailableQuestions > 0 && selectedCount > totalAvailableQuestions) {
      setError(`Only ${totalAvailableQuestions} questions are available from the selected PDFs. Please select ${totalAvailableQuestions} or fewer questions, or select additional PDFs.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/tests/generate', {
        questionCount: selectedCount,
        pdfIds: selectedPdfIds.length > 0 ? selectedPdfIds : undefined,
        difficulties: difficulty === 'Mixed' ? ['Easy', 'Medium', 'Hard'] : [difficulty],
        mode,
        timeLimit,
      });

      if (res.data?.test?.id) {
        navigate(`/student/test/${res.data.test.id}`);
      } else {
        throw new Error('Test generation failed to return a test session.');
      }
    } catch (err) {
      console.error('Test generation error:', err);
      setError(err.response?.data?.message || 'Failed to generate test. Make sure you have selected enough questions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Generate Practice Test</h1>
        <p className="text-gray-500 text-sm mt-1">
          Select one or multiple PDF question papers to create a randomized practice test.
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Step 1: Select PDFs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">1. Select Question Sources (PDFs)</h2>
          </div>
          {pdfs.length > 0 && (
            <button
              onClick={handleSelectAllPdfs}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 self-start sm:self-auto"
            >
              {selectedPdfIds.length === pdfs.length ? 'Deselect All' : 'Select All PDFs'}
            </button>
          )}
        </div>

        {fetchingPdfs ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : pdfs.length === 0 ? (
          <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm">
            <p className="font-semibold">Using System Demo Question Bank</p>
            <p className="text-xs mt-1">No custom PDFs uploaded yet. Tests will be generated from the built-in 25 practice questions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pdfs.map(pdf => {
              const isSelected = selectedPdfIds.includes(pdf.id);
              return (
                <div
                  key={pdf.id}
                  onClick={() => togglePdf(pdf.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={isSelected ? 'text-indigo-600' : 'text-gray-400'}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{pdf.original_name}</p>
                      <p className="text-xs text-gray-500">{pdf.page_count} pages • {pdf.question_count} questions</p>
                    </div>
                  </div>
                  <Badge variant={isSelected ? 'info' : 'default'} size="sm">
                    {pdf.question_count} Qs
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic Summary Banner */}
        <div className="bg-gray-50 rounded-xl p-3.5 flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">
            Selected: <strong className="text-indigo-600">{selectedPdfIds.length}</strong> of {pdfs.length || 1} PDFs
          </span>
          <span className="text-gray-600 font-medium">
            Available Questions: <strong className="text-indigo-600">{totalAvailableQuestions}</strong>
          </span>
        </div>
      </div>

      {/* Step 2: Number of Questions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">2. Number of Questions</h2>
        <div className="flex flex-wrap gap-3">
          {PRESET_COUNTS.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => { setNumQuestions(count); setCustomNum(''); }}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                numQuestions === count
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600 ring-offset-2'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {count} Questions
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={200}
              placeholder="Custom"
              value={customNum}
              onChange={(e) => { setCustomNum(e.target.value); setNumQuestions('custom'); }}
              className={`w-28 px-3 py-2 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                numQuestions === 'custom' ? 'border-indigo-600 ring-1 ring-indigo-500 bg-indigo-50/20' : 'border-gray-200'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Test Options (Mode, Difficulty, Timer) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Test Mode */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Test Mode</h3>
          <div className="space-y-2">
            {MODES.map(m => (
              <label key={m.value} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="testMode"
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{m.label}</p>
                  <p className="text-[11px] text-gray-500">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Difficulty</h3>
          <div className="space-y-2">
            {['Mixed', 'Easy', 'Medium', 'Hard'].map(d => (
              <label key={d} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === d}
                  onChange={() => setDifficulty(d)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-gray-800">{d}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <Clock size={16} className="text-indigo-600" /> Time Limit
          </h3>
          <div className="space-y-2">
            {TIMER_OPTIONS.map(t => (
              <label key={t.seconds} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="timeLimit"
                  checked={timeLimit === t.seconds}
                  onChange={() => setTimeLimit(t.seconds)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-gray-800">{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          disabled={loading || (pdfs.length > 0 && selectedPdfIds.length === 0)}
          onClick={handleGenerate}
          className="w-full sm:w-80 flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 py-4 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" /> Generating Practice Test...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" /> GENERATE PRACTICE TEST
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default GenerateTest;
