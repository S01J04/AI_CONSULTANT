import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchUserSessions, clearChat } from '../../redux/slices/chatSlice';
import { fetchUserPayments, processPayment } from '../../redux/slices/paymentSlice';
import { fetchUserAppointments } from '../../redux/slices/appointmentSlice';
import { fetchUserNotifications } from '../../redux/slices/notificationSlice';
import { addAdditionalAppointments } from '../../redux/slices/authSlice';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Calendar, CreditCard, User, Settings, Clock, Trash2, Edit2, Bell, Key, MessageCircle, History, Trash, X, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import usePlanAccess from '../../hooks/usePlanAccess';
import UserAppointments from './UserAppointments';
import AppointmentHistory from './AppointmentHistory';
import NotificationsTab from './NotificationsTab';
import SubscriptionStatusCard from './SubscriptionStatusCard';
import PayPerServiceCard from './PayPerServiceCard';
import { toast } from 'react-toastify';

import { useAppointmentListener } from '../../hooks/useAppointmentListener';
import { useNotificationListener } from '../../hooks/useNotificationListener';


interface UserDashboardProps {
  initialTab?: string;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ initialTab }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { sessions, loading: chatLoading } = useSelector((state: RootState) => state.chat);
  const { userPayments, currentPlan, plans, loading: paymentLoading } = useSelector((state: RootState) => state.payment);
  const { userAppointments, loading: appointmentLoading } = useSelector((state: RootState) => state.appointment);
  const { isExpired, formattedExpiryDate, daysRemaining, hasActivePlan, planFeatures, remainingAppointments } = usePlanAccess();
  const { authloading, deleteAccount, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Use the real-time listeners
  useAppointmentListener();
  useNotificationListener();

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Log notification state for debugging
  const notificationState = useSelector((state: RootState) => state.notification);
  useEffect(() => {
    console.log('Current notification state:', notificationState);
  }, [notificationState]);



  // Fetch data only once when component mounts or user changes
  useEffect(() => {
    if (user?.uid) {
      // Fetch user sessions if needed
      if (!sessions || sessions.length === 0) {
        dispatch(fetchUserSessions() as any);
      }

      // Fetch user payments
      dispatch(fetchUserPayments(user.uid) as any);

      // Fetch user appointments where the user is the creator (regardless of role)
      // This ensures that even if the user is an admin/consultant, they only see appointments they booked
      dispatch(fetchUserAppointments({
        userId: user.uid,
        userRole: 'user' // Force 'user' role to only get appointments where userId matches
      }) as any);

      // Fetch user notifications
      dispatch(fetchUserNotifications(user.uid) as any);
    }
  }, [dispatch, user?.uid]); // Remove sessions dependency to prevent repeated fetching
  const tabs = [
    // { id: 'appointments', label: 'My Appointments', icon: Calendar },
    // { id: 'notifications', label: 'Notifications', icon: Bell },
    // { id: 'history', label: 'Appointment History', icon: History },
      { id: 'profile', label: 'My Profile', icon: User },
    { id: 'chats', label: 'My Chats', icon: MessageCircle },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await user.updateProfile({ displayName });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await deleteAccount();
      navigate('/login');
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    try {
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      await user.updatePassword(newPassword);
      setShowChangePasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (error: any) {
      setPasswordError(error.message);
    }
  };

  const handleChangeEmail = async () => {
    if (!user) return;
    try {
      await user.updateEmail(newEmail);
      setShowChangeEmailModal(false);
      setNewEmail('');
      setEmailError('');
    } catch (error: any) {
      setEmailError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    try {
      await dispatch(clearChat(user.uid));
      setShowClearChatConfirm(false);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  // Handle pay-per-service purchase
  const [processingPayment, setProcessingPayment] = useState(false);

  const handlePayPerServicePurchase = async () => {
    if (!user) {
      toast.error('You must be logged in to purchase appointments');
      return;
    }

    setProcessingPayment(true);

    try {
      // Process the payment
      const paymentResult = await dispatch(processPayment({
        userId: user.uid,
        planId: 'pay-per-call', // Use the existing pay-per-call plan
        amount: 299, // Price for a single appointment
        currency: 'INR',
        paymentMethod: 'card',
      }));

      // Check if the payment was successful
      if (processPayment.fulfilled.match(paymentResult)) {
        const paymentData = paymentResult.payload;
        console.log('Payment successful:', paymentData);

        // Add the additional appointment to the user's account
        // Add the additional appointment to the user's account
        const appointmentResult = await dispatch(addAdditionalAppointments({
          userId: user.uid,
          count: 1 // Add 1 appointment
        }));

        if (addAdditionalAppointments.fulfilled.match(appointmentResult)) {
          console.log('Appointment added successfully:', appointmentResult.payload);
          toast.success('Payment successful! You have purchased 1 appointment.', {
            position: "top-center",
            autoClose: 5000,
          });

          // Refresh the user's appointments
          if (user?.uid) {
            dispatch(fetchUserAppointments(user.uid));
          }
        } else {
          console.error('Failed to add appointment:', appointmentResult.error);
          toast.error('Payment was processed but failed to add appointment. Please contact support.', {
            position: "top-center",
            autoClose: 5000,
          });
        }
      } else {
        // If the payment failed, show an error message
        console.error('Payment processing failed:', paymentResult.error);
        toast.error('Payment failed. Please try again or contact support.', {
          position: "top-center",
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('An error occurred while processing your payment. Please try again.', {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderContent = () => {
    // Always show the subscription status card first
    if (!hasActivePlan && activeTab !== 'profile' && activeTab !== 'settings' && activeTab !== 'history' && activeTab !== 'chats' && activeTab !== 'payments' && activeTab !== 'notifications') {
      return (
        <div className="space-y-6">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            {activeTab === 'appointments' ? 'My Appointments' :
             activeTab === 'history' ? 'Appointment History' :
            //  activeTab === 'notifications' ? 'Notifications' :
             activeTab === 'chats' ? 'My Chats' :
             activeTab === 'payments' ? 'Payments' : 'Dashboard'}
          </h2>

          {/* Subscription Status Card */}
          <SubscriptionStatusCard />

          {/* Subscription Required Message */}
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 my-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                  Subscription Required
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                  <p>You need an active subscription to access this feature. All features in this application require a subscription plan.</p>
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

    // If user has an active plan or is viewing profile/settings, show the regular content
    switch (activeTab) {
      case 'appointments':
        return (
          <div className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h2>

            {/* Subscription Status Card */}
            <SubscriptionStatusCard />

            <UserAppointments onPayPerServicePurchase={handlePayPerServicePurchase} />
          </div>
        );
      case 'history':
        return (
          // <div className="space-y-6">
          //   <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Appointment History</h2>
          //   <AppointmentHistory />
          // </div>
          <></>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4">Notifications</h2>
            <NotificationsTab />
          </div>
        );
      case 'chats':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Chats</h2>
              <div className="flex space-x-4">
                {sessions.length > 0 && (
                  <button
                    onClick={() => setShowClearChatConfirm(true)}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 dark:bg-gray-800 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Clear All Chats
                  </button>
                )}
                <Link
                  to="/chat"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  New Chat
                </Link>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {chatLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No conversations</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start a new chat to get help from our experts.</p>
                  <div className="mt-6">
                    <Link
                      to="/chat"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Start New Chat
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <MessageSquare className="h-8 w-8 text-indigo-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {session.title || 'New Conversation'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(new Date(session.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/chat`}
                        state={session.id}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Continue Chat
                      </Link>
                    </div>
                  ))}
                  {sessions.length > 5 && (
                    <div className="text-center pt-4">
                      <Link
                        to="/chat"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        View All Chats →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clear Chat Confirmation Modal */}
            {showClearChatConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Clear Chat History</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Are you sure you want to clear all your chat history? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowClearChatConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearChat}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      Clear All Chats
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'payments':
        // Sort payments by date (newest first)
        const sortedPayments = [...userPayments].sort((a, b) => b.createdAt - a.createdAt);

        return (
          <div className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Subscription & Payments</h2>

            {/* Subscription Status Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6 border-l-4 border-indigo-500">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Subscription Status</h3>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Current Plan:</span>
                    {hasActivePlan ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {user?.planName || user?.plan || currentPlan?.name || 'Active Plan'}
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        No Active Plan
                      </span>
                    )}
                  </div>

                  {hasActivePlan && formattedExpiryDate && (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Valid Until:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-indigo-500" />
                        {formattedExpiryDate}
                        {daysRemaining <= 5 && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {isExpired && user?.plan && (
                    <div className="text-sm text-red-600 dark:text-red-400 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Your {user?.planName || user?.plan} subscription expired on {formattedExpiryDate}
                    </div>
                  )}
                </div>

                <div>
                  {hasActivePlan ? (
                    <Link to="/pricing" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Upgrade Plan
                    </Link>
                  ) : (
                    <Link to="/pricing" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      {isExpired ? 'Renew Subscription' : 'Get Subscription'}
                    </Link>
                  )}
                </div>
              </div>

              {/* Features Access Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Features Access</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${planFeatures.canUseChat ? 'text-green-500' : 'text-red-500'}`}>
                      {planFeatures.canUseChat ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">AI Chat Access</p>
                  </div>

                  <div className="flex items-start">
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${planFeatures.canUseVoice ? 'text-green-500' : 'text-red-500'}`}>
                      {planFeatures.canUseVoice ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">Voice Call Access</p>
                  </div>

                  <div className="flex items-start">
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${planFeatures.canBookAppointments ? 'text-green-500' : 'text-red-500'}`}>
                      {planFeatures.canBookAppointments ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      Appointment Booking
                      {planFeatures.canBookAppointments && (
                        <span className="text-xs ml-1">({remainingAppointments} left)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 sm:mb-0">Recent Payments</h3>
                {sortedPayments.length > 5 && (
                  <button
                    onClick={() => setShowAllPayments(!showAllPayments)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {showAllPayments ? 'Show Less' : 'See All Payments'}
                  </button>
                )}
              </div>

              {paymentLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : sortedPayments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No payment history found.</p>
                  <Link to="/pricing" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                    View Subscription Plans
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {(showAllPayments ? sortedPayments : sortedPayments.slice(0, 5)).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2 sm:space-y-0"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${payment.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                            <CreditCard className="h-5 w-5" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.planName || (
                              // Try to find the plan name from the plans array
                              plans.find((p: { id: string; name: string }) => p.id === payment.planId)?.name
                            ) || 'Subscription'}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {payment.createdAt ? format(new Date(payment.createdAt), 'MMM dd, yyyy • h:mm a') : 'Date not available'}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${payment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.currency === 'INR' ? '₹' : payment.currency === 'USD' ? '$' : ''}{payment.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.paymentMethod === 'card' ? 'Credit/Debit Card' : payment.paymentMethod}
                        </p>
                        {payment.transactionId && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            ID: {payment.transactionId.substring(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">My Profile</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {/* Subscription Status Card */}
            {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6 border-l-4 border-indigo-500 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Subscription Status</h3>
                  <div className="flex items-center mb-2">
                    {hasActivePlan ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mr-2">
                          {user?.planName || user?.plan || currentPlan?.name || 'Active Plan'}
                        </span>
                        {formattedExpiryDate && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Valid until {formattedExpiryDate}
                          </span>
                        )}
                      </div>
                    ) : isExpired ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 mr-2">
                          Expired
                        </span>
                        <span className="text-sm text-red-600 dark:text-red-400 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Your subscription has expired
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        No Active Plan
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Link to="/pricing" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {hasActivePlan ? 'Manage Subscription' : isExpired ? 'Renew Subscription' : 'Get Subscription'}
                  </Link>
                </div>
              </div>
            </div> */}
            <SubscriptionStatusCard />

            {/* Profile Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 dark:text-white">{user?.displayName || 'Not set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                      <p className="mt-1 text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Member Since</label>
                      <p className="mt-1 text-gray-900 dark:text-white">
                        {user?.createdAt ? format(new Date(user.createdAt), 'MMMM dd, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Type</label>
                      <div className="mt-1">
                        {hasActivePlan ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {user?.planName || user?.plan || currentPlan?.name || 'Active Plan'}
                            </span>
                            {formattedExpiryDate && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                Expires: {formattedExpiryDate}
                                {daysRemaining <= 5 && (
                                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                                    ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : isExpired ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Expired
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Your {user?.planName || user?.plan} subscription has expired
                            </div>
                            <Link to="/pricing" className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mt-1 inline-block">
                              Renew subscription
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                              No Active Plan
                            </span>
                            <Link to="/pricing" className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mt-1 inline-block">
                              View subscription plans
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Settings</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bell className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates about your appointments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        emailNotifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowChangePasswordModal(true)}
                      className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      <Key className="h-5 w-5 mr-3" />
                      Change Password
                    </button>
                    <button
                      onClick={() => setShowChangeEmailModal(true)}
                      className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      <Edit2 className="h-5 w-5 mr-3" />
                      Change Email
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Actions</h3>
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 className="h-5 w-5 mr-3" />
                      Delete Account
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdateProfile}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Account Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Delete Account</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Are you sure you want to delete your account? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Modal */}
            {showChangePasswordModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      />
                    </div>
                    {passwordError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowChangePasswordModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleChangePassword}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Change Email Modal */}
            {showChangeEmailModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Email</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Email</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                      />
                    </div>
                    {emailError && (
                      <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowChangeEmailModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleChangeEmail}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                    >
                      Update Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6">
              <p className="text-gray-600 dark:text-gray-400">Settings content will be added here.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Data fetching is already handled in the useEffect at the top of the component

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Please log in to view your dashboard.</p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  const Skeleton = () => {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 animate-pulse">
        {/* Logo or Header */}
        <div className="h-10 w-48 bg-gray-300 dark:bg-gray-700 rounded-lg mb-6"></div>

        {/* Sidebar & Content */}
        <div className="flex w-full px-8 gap-6">
          {/* Sidebar Skeleton */}
          <div className="w-64 h-[80vh] bg-gray-300 dark:bg-gray-700 rounded-lg"></div>

          {/* Main Content */}
          <div className="flex-1 grid grid-cols-3 gap-6">
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  };

  if(authloading){
   return <Skeleton/>
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-64 bg-white dark:bg-gray-800 shadow-lg fixed lg:relative top-0 z-50">
          <div className="p-4 lg:p-6 flex justify-between items-center">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
            <div className="flex items-center space-x-2">
              <Link to="/" className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Link>
            </div>
          </div>
          <nav className="flex flex-row lg:flex-col justify-around lg:justify-start bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 lg:px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5 lg:mr-3" />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-8 mt-20 lg:mt-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

