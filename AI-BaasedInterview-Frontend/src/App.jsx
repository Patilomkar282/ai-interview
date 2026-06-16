import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Interview from './pages/Interview';
import LiveInterview from './pages/Live';
import FeedbackPage from './pages/InterviewFeedback';
import Onboarding from './pages/Onboarding';
import AdminDashboard from './pages/AdminDashboard';
import AuthGate from './Components/AuthGate';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  React.useEffect(() => {
    // If not loading and not authenticated, we don't force a redirect immediately
    // to avoid loops. We just let it render the return null or an error page.
  }, [loading, isAuthenticated]);

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white shadow rounded">
            <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You are not authenticated or your session has expired.</p>
            <button 
                onClick={() => window.location.href = 'https://smartprep.live/login'}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
                Return to Central Hub
            </button>
        </div>
      </div>
    );
  }

  // Ensure user is onboarded, otherwise force them to onboarding
  // We use window.location.pathname instead of useLocation to avoid extra imports if possible,
  // or simply check if this route is NOT the onboarding route itself to prevent loops.
  if (isAuthenticated && !user?.isOnboarded && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/" element={<AuthGate />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/interview/:type" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
      <Route path="/live/:type" element={<ProtectedRoute><LiveInterview /></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
      <Route path="*" element={<AuthGate />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
