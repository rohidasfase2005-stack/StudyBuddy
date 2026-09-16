import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import Alert from '../components/common/Alert';
import { UploadCloud, File, Trash2, RefreshCw, Eye } from 'lucide-react';

const PdfUpload = () => {
  const [pdfs, setPdfs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchPdfs = async () => {
    try {
      const res = await api.get('/pdfs');
      setPdfs(res.data);
    } catch (err) {
      setError('Failed to fetch PDFs');
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  // Auto-refresh when any PDFs are processing
  useEffect(() => {
    const hasProcessing = pdfs.some(p => p.processing_status === 'pending' || p.processing_status === 'processing');
    if (!hasProcessing) return;
    const interval = setInterval(fetchPdfs, 2000);
    return () => clearInterval(interval);
  }, [pdfs]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      return setError('Only PDF files are allowed');
    }
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      await api.post('/pdfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      fetchPdfs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf') {
        return setError('Only PDF files are allowed');
      }
      uploadFile(file);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) return;
    try {
      await api.delete(`/pdfs/${id}`);
      fetchPdfs();
    } catch (err) {
      setError('Failed to delete PDF');
    }
  };

  const handleReprocess = async (id) => {
    try {
      await api.post(`/pdfs/${id}/reprocess`);
      fetchPdfs();
    } catch (err) {
      setError('Failed to reprocess PDF');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      completed: 'success',
      failed: 'danger',
      processing: 'warning',
      pending: 'default'
    };
    return <Badge variant={map[status] || 'default'}>{(status || 'unknown').toUpperCase()}</Badge>;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Upload PDF</h1>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <Card 
        className="p-12 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">Drag & Drop your PDF here</p>
        <p className="text-sm text-gray-500 mt-2 mb-6">or</p>
        <Button variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          Browse Files
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="application/pdf" 
          className="hidden" 
        />
      </Card>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Uploaded PDFs</h2>
        <div className="space-y-4">
          {pdfs.length === 0 ? (
            <p className="text-gray-500">No PDFs uploaded yet.</p>
          ) : (
            pdfs.map(pdf => (
              <Card key={pdf.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-red-100 text-red-600 rounded">
                    <File className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{pdf.original_name}</p>
                    <p className="text-sm text-gray-500">
                      {pdf.page_count} pages • {pdf.question_count} questions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {getStatusBadge(pdf.processing_status)}
                  
                  {pdf.processing_status === 'completed' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/pdfs/${pdf.id}/review`)}
                      className="text-indigo-600 hover:bg-indigo-50"
                    >
                      <Eye className="w-4 h-4 mr-1 inline" /> Review
                    </Button>
                  )}
                  
                  <Button variant="ghost" size="sm" onClick={() => handleReprocess(pdf.id)} title="Reprocess">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(pdf.id)} title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfUpload;

