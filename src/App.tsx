import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AlertCircle } from 'lucide-react';

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
import PaymentSuccess from './components/payment/PaymentSuccess';

// Auth Hook
import { useAuth } from './hooks/useAuth';
import usePlanAccess from './hooks/usePlanAccess';
import { AboutUs } from './pages/AboutusPage';
import ForgotPasswordForm from './pages/forgetPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './components/dashboard/UserDashboard';
import ConsultantDetailsPage from './pages/ConsultantDetailsPage';
import VoiceCallWithAI from './pages/Voicecall';

// Protected Route Component - Checks if user is logged in
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

// Subscription Protected Route - Checks if user has access to a specific feature
const SubscriptionProtectedRoute: React.FC<{
  children: React.ReactNode;
  feature: 'canUseChat' | 'canUseVoice' | 'canBookAppointments';
}> = ({ children, feature }) => {
  const { user, loading } = useAuth();
  const { canAccess, getUpgradeMessage } = usePlanAccess();

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

  // Check if user has access to the feature
  if (!canAccess(feature)) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                Subscription Required
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                <p>You need an active subscription to access this feature.</p>
                <p className="mt-1">{getUpgradeMessage(feature)}</p>
              </div>
              <div className="mt-4">
                <Link
                  to="/pricing"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

// Import subscription service
import { initSubscriptionService } from './services/subscriptionService';

// App Content Component (with access to Redux)
const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation(); // Now inside Router!

  // Initialize subscription service when user changes
  React.useEffect(() => {
    if (user) {
      // Initialize subscription service to check for expired subscriptions
      initSubscriptionService(user);
    }
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen">
     {
       location.pathname !== "/admin" && <Navbar />
      }


      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<SubscriptionProtectedRoute feature="canUseChat"><ChatPage /></SubscriptionProtectedRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/consultant/:consultantId" element={<ConsultantDetailsPage />} />
          <Route path="/settings" element={<UserDashboard />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/appointments" element={<SubscriptionProtectedRoute feature="canBookAppointments"><AppointmentsPage /></SubscriptionProtectedRoute>} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/voicechat" element={<SubscriptionProtectedRoute feature="canUseVoice"><VoiceCallWithAI /></SubscriptionProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedRoute><DashboardPage initialTab="notifications" /></ProtectedRoute>} />
          <Route path="/dashboard/appointments" element={<ProtectedRoute><DashboardPage initialTab="appointments" /></ProtectedRoute>} />
          <Route path="/dashboard/history" element={<ProtectedRoute><DashboardPage initialTab="history" /></ProtectedRoute>} />
          <Route path="/dashboard/chats" element={<ProtectedRoute><DashboardPage initialTab="chats" /></ProtectedRoute>} />
          <Route path="/dashboard/payments" element={<ProtectedRoute><DashboardPage initialTab="payments" /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardPage initialTab="profile" /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardPage initialTab="settings" /></ProtectedRoute>} />
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


