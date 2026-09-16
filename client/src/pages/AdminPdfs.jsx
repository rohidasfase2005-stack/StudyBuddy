import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import Alert from '../components/common/Alert';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FilePlus,
  Layers
} from 'lucide-react';

const AdminPdfs = () => {
  const [pdfs, setPdfs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchPdfs = async () => {
    try {
      const res = await api.get('/pdfs');
      setPdfs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch PDFs:', err);
      setError('Failed to load PDFs.');
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  // Auto-refresh when any PDFs are pending or processing
  useEffect(() => {
    const hasProcessing = pdfs.some(p => p.processing_status === 'pending' || p.processing_status === 'processing');
    if (!hasProcessing) return;
    const interval = setInterval(fetchPdfs, 2000);
    return () => clearInterval(interval);
  }, [pdfs]);

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (validFiles.length === 0) {
      setError('Only PDF files are supported.');
      return;
    }
    uploadFiles(validFiles);
  };

  const uploadFiles = async (files) => {
    const formData = new FormData();
    if (files.length === 1) {
      formData.append('file', files[0]);
    } else {
      files.forEach(f => formData.append('files', f));
    }

    setUploading(true);
    setProgress(0);
    setUploadCount(files.length);
    setError('');
    setSuccess('');

    try {
      await api.post('/pdfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setProgress(pct);
        }
      });
      setSuccess(`Successfully uploaded ${files.length} PDF(s). Processing questions in background...`);
      fetchPdfs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload PDF files.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will delete all its extracted questions.`)) return;
    try {
      await api.delete(`/pdfs/${id}`);
      setSuccess('PDF deleted successfully.');
      fetchPdfs();
    } catch (err) {
      setError('Failed to delete PDF');
    }
  };

  const handleReprocess = async (id) => {
    try {
      await api.post(`/pdfs/${id}/reprocess`);
      setSuccess('PDF re-processing initiated.');
      fetchPdfs();
    } catch (err) {
      setError('Failed to reprocess PDF');
    }
  };

  const getStatusBadge = (status, count) => {
    if (status === 'completed') {
      return <Badge variant="success" size="sm">{count || 0} Questions ✓</Badge>;
    }
    if (status === 'processing') {
      return <Badge variant="warning" size="sm">Processing...</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="danger" size="sm">Failed</Badge>;
    }
    return <Badge variant="default" size="sm">Pending</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">PDF Question Papers Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload and manage test question papers. Questions are automatically extracted and made available for student practice.
        </p>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Upload Box */}
      <div 
        className="bg-white p-8 sm:p-12 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 transition-colors flex flex-col items-center justify-center cursor-pointer bg-indigo-50/20 hover:bg-indigo-50/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
          <UploadCloud size={32} />
        </div>
        <p className="text-lg font-bold text-gray-900">Drag & Drop PDF Question Papers</p>
        <p className="text-xs text-gray-500 mt-1 mb-5">Select one or multiple PDF files (Max 50MB per file)</p>
        
        <Button 
          variant="primary" 
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <FilePlus size={16} className="mr-2" /> Browse PDF Files
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => handleFiles(e.target.files)} 
          accept="application/pdf" 
          multiple
          className="hidden" 
        />
      </div>

      {/* Uploading Progress */}
      {uploading && (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between text-sm font-semibold text-gray-700">
            <span>Uploading {uploadCount} PDF(s)...</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar progress={progress} color="indigo" />
        </div>
      )}

      {/* Uploaded PDFs List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" /> Uploaded PDFs ({pdfs.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchPdfs} className="text-gray-500">
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>

        {pdfs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 space-y-2">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm">No PDF question papers uploaded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{pdf.original_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {pdf.page_count} pages • Uploaded {new Date(pdf.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                  {getStatusBadge(pdf.processing_status, pdf.question_count)}

                  {pdf.processing_status === 'completed' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/admin/pdfs/${pdf.id}/review`)}
                      className="text-indigo-600 hover:bg-indigo-50"
                    >
                      <Eye size={16} className="mr-1" /> Review Qs
                    </Button>
                  )}

                  <button
                    onClick={() => handleReprocess(pdf.id)}
                    title="Reprocess PDF"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(pdf.id, pdf.original_name)}
                    title="Delete PDF"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPdfs;
