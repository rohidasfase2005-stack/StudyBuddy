import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import useActivityTracker from './hooks/useActivityTracker';

// Lazy loaded student components
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').catch(() => ({ default: () => <div>Student Dashboard</div> })));
const GenerateTest = lazy(() => import('./pages/GenerateTest').catch(() => ({ default: () => <div>Generate Test</div> })));
const TestHistory = lazy(() => import('./pages/TestHistory').catch(() => ({ default: () => <div>My Tests</div> })));
const TestInterface = lazy(() => import('./pages/TestInterface').catch(() => ({ default: () => <div>Test Interface</div> })));
const TestResult = lazy(() => import('./pages/TestResult').catch(() => ({ default: () => <div>Test Result</div> })));
const TestReview = lazy(() => import('./pages/TestReview').catch(() => ({ default: () => <div>Test Review</div> })));
const Analytics = lazy(() => import('./pages/Analytics').catch(() => ({ default: () => <div>Analytics</div> })));
const WrongQuestions = lazy(() => import('./pages/WrongQuestions').catch(() => ({ default: () => <div>Wrong Questions</div> })));
const Chatbot = lazy(() => import('./pages/Chatbot').catch(() => ({ default: () => <div>AI Study Chat</div> })));
const DailyTarget = lazy(() => import('./pages/DailyTarget').catch(() => ({ default: () => <div>Daily Target</div> })));
const Settings = lazy(() => import('./pages/Settings').catch(() => ({ default: () => <div>Settings</div> })));

// Lazy loaded admin components
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').catch(() => ({ default: () => <div>Admin Dashboard</div> })));
const AdminPdfs = lazy(() => import('./pages/AdminPdfs').catch(() => ({ default: () => <div>Admin PDFs</div> })));
const AdminStudents = lazy(() => import('./pages/AdminStudents').catch(() => ({ default: () => <div>Admin Students</div> })));
const AdminStudentDetail = lazy(() => import('./pages/AdminStudentDetail').catch(() => ({ default: () => <div>Admin Student Detail</div> })));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics').catch(() => ({ default: () => <div>Admin Analytics</div> })));
const QuestionReview = lazy(() => import('./pages/QuestionReview').catch(() => ({ default: () => <div>Question Review</div> })));

// Auth Pages
const Login = lazy(() => import('./pages/Login').catch(() => ({ default: () => <div>Login Page</div> })));
const Register = lazy(() => import('./pages/Register').catch(() => ({ default: () => <div>Register Page</div> })));

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-gray-500">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-gray-500">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

const RoleRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-gray-500">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return user?.role === 'admin' 
    ? <Navigate to="/admin/dashboard" replace />
    : <Navigate to="/student/dashboard" replace />;
};

const FallbackLoading = () => (
  <div className="flex justify-center items-center h-full p-8 text-gray-500 font-medium">Loading...</div>
);

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  // Automatically track study time and activity
  useActivityTracker(isAuthenticated);

  return (
    <Suspense fallback={<FallbackLoading />}>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Root Redirect based on Role */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/dashboard" element={<RoleRedirect />} />

        {/* App Layout Protected Shell */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          {/* STUDENT ROUTES */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/generate-test" element={<GenerateTest />} />
          <Route path="/student/tests" element={<TestHistory />} />
          <Route path="/student/test/:id" element={<TestInterface />} />
          <Route path="/student/test/:id/result" element={<TestResult />} />
          <Route path="/student/test/:id/review" element={<TestReview />} />
          <Route path="/student/analytics" element={<Analytics />} />
          <Route path="/student/wrong-questions" element={<WrongQuestions />} />
          <Route path="/student/chat" element={<Chatbot />} />
          <Route path="/student/daily-target" element={<DailyTarget />} />
          <Route path="/student/settings" element={<Settings />} />

          {/* ADMIN ROUTES */}
          <Route path="/admin" element={
            <AdminRoute>
              <Navigate to="/admin/dashboard" replace />
            </AdminRoute>
          } />
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/pdfs" element={
            <AdminRoute>
              <AdminPdfs />
            </AdminRoute>
          } />
          <Route path="/admin/pdfs/:id/review" element={
            <AdminRoute>
              <QuestionReview />
            </AdminRoute>
          } />
          <Route path="/admin/students" element={
            <AdminRoute>
              <AdminStudents />
            </AdminRoute>
          } />
          <Route path="/admin/students/:id" element={
            <AdminRoute>
              <AdminStudentDetail />
            </AdminRoute>
          } />
          <Route path="/admin/analytics" element={
            <AdminRoute>
              <AdminAnalytics />
            </AdminRoute>
          } />
          <Route path="/admin/settings" element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          } />

          {/* Legacy / Direct Aliases */}
          <Route path="/generate" element={<Navigate to="/student/generate-test" replace />} />
          <Route path="/tests" element={<Navigate to="/student/tests" replace />} />
          <Route path="/history" element={<Navigate to="/student/tests" replace />} />
          <Route path="/test/:id" element={<Navigate to="/student/test/:id" replace />} />
          <Route path="/test/:id/result" element={<Navigate to="/student/test/:id/result" replace />} />
          <Route path="/test/:id/review" element={<Navigate to="/student/test/:id/review" replace />} />
          <Route path="/analytics" element={<Navigate to="/student/analytics" replace />} />
          <Route path="/chat" element={<Navigate to="/student/chat" replace />} />
          <Route path="/pdfs" element={<RoleRedirect />} />
          <Route path="/settings" element={<RoleRedirect />} />
        </Route>

        {/* Fallback Catch-all */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
