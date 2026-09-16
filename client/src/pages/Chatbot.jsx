import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Sparkles, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SUGGESTIONS = [
  'What is the capital of India?',
  'Explain Fundamental Rights.',
  'Question: 2 + 2 = ? Student Answer: 5',
  'Give me an example.',
  'Choose the correct synonym for "ABUNDANT"'
];

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/chat/history');
        if (res.data && res.data.length > 0) {
          setMessages(res.data);
        } else {
          // Welcome greeting
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            message: 'Hello! I am your AI StudyBuddy. Ask me any question, test your answers, or request explanations for any competitive exam topic.',
            topic: 'General'
          }]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const message = (textToSend || input).trim();
    if (!message || loading) return;

    setInput('');
    setError('');

    // Optimistically add user message
    const tempUserMsg = { id: 'user-' + Date.now(), role: 'user', message };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.post('/chat/message', { message });
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.response?.data?.message || 'Unable to process your question right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.delete('/chat/history');
      setMessages([{
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        message: 'Chat history cleared. How can I help you study today?',
        topic: 'General'
      }]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              AI Study Assistant
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Tutor</span>
            </h2>
            <p className="text-xs text-gray-500">Ask questions, evaluate answers, and review exam concepts</p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="text-gray-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors p-2"
          title="Clear Chat History"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Quick Suggestions */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <span className="text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles size={13} className="text-amber-500" /> Suggestions:
        </span>
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="px-3 py-1 bg-white border border-gray-200 rounded-full hover:bg-indigo-50 hover:border-indigo-300 text-gray-700 transition-colors whitespace-nowrap"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id || Math.random()}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${
                  isUser ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                  {m.message}
                </div>

                {m.topic && !isUser && (
                  <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
                    <span className="bg-gray-200/70 text-gray-600 px-2 py-0.5 rounded font-medium">
                      {m.topic}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-none p-4 text-sm text-gray-500 flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>StudyBuddy is thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <XCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question or answer here (e.g. 'Explain Fundamental Rights')..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || loading}
            className="px-5 rounded-xl flex items-center gap-2"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
