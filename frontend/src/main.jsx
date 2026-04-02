import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AboutPage from './pages/AboutPage';
import ChatPage from './pages/ChatPage.jsx';
import LearningHubPage from './pages/LearningHubPage.jsx';
import SummarizerPage from './pages/SummarizerPage.jsx';
import PrecedentPage from './pages/PrecedentPage.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

// Public Route (redirect if logged in)
function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? <>{children}</> : <Navigate to="/chat" />;
}

function Main() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/learning" element={<LearningHubPage />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/summarizer" element={<ProtectedRoute><SummarizerPage /></ProtectedRoute>} />
            <Route path="/precedents" element={<ProtectedRoute><PrecedentPage /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
