import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import PricingPage from './pages/PricingPage';
import AppointmentsPage from './pages/AppointmentsPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Auth Hook
import { useAuth } from './hooks/useAuth';
import { AboutUs } from './pages/AboutusPage';
import ForgotPasswordForm from './pages/forgetPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './components/dashboard/UserDashboard';
import ConsultantDetailsPage from './pages/ConsultantDetailsPage';
import VoiceCallWithAI from './pages/Voicecall';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// App Component
const App: React.FC = () => {
  return (
    
      <Router>
        <AppContent />
      </Router>
 
  );
};

// App Content Component (with access to Redux)
const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation(); // Now inside Router!

  return (
    <div className="flex flex-col min-h-screen">
     {
       location.pathname !== "/admin" && <Navbar />
      } 
  
  
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/consultant/:consultantId" element={<ConsultantDetailsPage />} />
          <Route path="/settings" element={<UserDashboard />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/voicechat" element={<VoiceCallWithAI />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {/* Conditionally render footer, hide on /chat page */}
      {location.pathname !== "/chat" && location.pathname !== "/admin" && <Footer />}
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default App;
