import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, Calendar, CreditCard, Settings, 
  BarChart2, PieChart as PieChartIcon, Activity, Bell, Search
} from 'lucide-react';
import { fetchAdminStats } from '../redux/slices/adminSlice';
import { 
  fetchConsultantProfile, 
  saveConsultantProfile,
  fetchAllConsultantProfiles
} from '../redux/slices/authSlice';
import { fetchConsultantAppointments } from '../redux/slices/appointmentSlice';
import UserManagement from '../components/admin/UserManagement';

// Chart components
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// ConsultantProfileTab component
const ConsultantProfileTab: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [consultantData, setConsultantData] = useState({
    fullName: user?.displayName || '',
    title: '',
    phoneNumber: '',
    specializations: '',
    yearsOfExperience: 0,
    bio: '',
    availability: {
      days: [] as string[],
      hours: {
        from: 9,
        to: 17,
      },
      duration: 60,
    },
    isActive: true,
  });
  const { consultantProfile, consultantProfileLoading } = useSelector((state: RootState) => state.auth);
  const { consultantAppointments } = useSelector((state: RootState) => state.appointment);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchConsultantProfile(user.uid));
      dispatch(fetchConsultantAppointments(user.uid));
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (consultantProfile) {
      setConsultantData({
        fullName: consultantProfile.fullName,
        title: consultantProfile.title,
        phoneNumber: consultantProfile.phoneNumber,
        specializations: consultantProfile.specializations.join(', '),
        yearsOfExperience: consultantProfile.yearsOfExperience,
        bio: consultantProfile.bio,
        availability: {
          ...consultantProfile.availability
        },
        isActive: consultantProfile.isActive,
      });
    }
  }, [consultantProfile]);

  // Handles visibility toggle for consultant profile
  const handleToggleActive = async () => {
    if (!user?.uid) return;

    try {
      const updatedProfile = {
        ...consultantData,
        uid: user.uid,
        specializations: consultantData.specializations.split(',').map(s => s.trim()).filter(Boolean),
        isActive: !consultantData.isActive,
      };

      await dispatch(saveConsultantProfile(updatedProfile));
    } catch (error) {
      console.error('Failed to toggle profile visibility:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConsultantData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvailabilityDayToggle = (day: string) => {
    setConsultantData(prev => {
      const days = prev.availability.days.includes(day)
        ? prev.availability.days.filter(d => d !== day)
        : [...prev.availability.days, day];
      
      return {
        ...prev,
        availability: {
          ...prev.availability,
          days
        }
      };
    });
  };

  const handleAvailabilityChange = (type: 'from' | 'to' | 'duration', value: number) => {
    setConsultantData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [type === 'duration' ? 'duration' : 'hours']: 
          type === 'duration' 
            ? value 
            : {
                ...prev.availability.hours,
                [type]: value
              }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    try {
      const profileData = {
        uid: user.uid,
        fullName: consultantData.fullName,
        title: consultantData.title,
        phoneNumber: consultantData.phoneNumber,
        specializations: consultantData.specializations.split(',').map(s => s.trim()).filter(Boolean),
        yearsOfExperience: Number(consultantData.yearsOfExperience),
        bio: consultantData.bio,
        availability: consultantData.availability,
        isActive: consultantData.isActive,
      };

      await dispatch(saveConsultantProfile(profileData));
    } catch (error) {
      console.error('Failed to save consultant profile:', error);
    }
  };

  const formatAppointmentDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // If user was previously an admin but got demoted, show appropriate message
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Consultant Profile</h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-yellow-100 p-4 text-yellow-500 mb-4">
              <Bell className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
              You no longer have consultant privileges
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your account has been changed to a standard user account. If you believe this is an error, please contact the administrator.
            </p>
            <button
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => window.location.href = '/dashboard'}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Consultant Profile</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Profile Visibility:</span>
          <div 
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer
              ${consultantData.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={handleToggleActive}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${consultantData.isActive ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </div>
          <span className={`text-sm ${consultantData.isActive ? 'text-green-500' : 'text-gray-500'}`}>
            {consultantData.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {consultantProfileLoading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={consultantData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={consultantData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Senior Consultant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={consultantData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Profile */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">Professional Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Specializations
                  </label>
                  <input
                    type="text"
                    name="specializations"
                    value={consultantData.specializations}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Machine Learning, Data Science, Cloud Architecture (comma separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter your areas of expertise, separated by commas
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    value={consultantData.yearsOfExperience}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={consultantData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Write a short bio describing your expertise and experience..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">Availability</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Available Days
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <label key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={consultantData.availability.days.includes(day)}
                            onChange={() => handleAvailabilityDayToggle(day)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-2"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Available Hours
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400">From</label>
                        <select 
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                          value={consultantData.availability.hours.from}
                          onChange={e => handleAvailabilityChange('from', parseInt(e.target.value))}
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>
                              {i < 10 ? `0${i}:00` : `${i}:00`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400">To</label>
                        <select 
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                          value={consultantData.availability.hours.to}
                          onChange={e => handleAvailabilityChange('to', parseInt(e.target.value))}
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>
                              {i < 10 ? `0${i}:00` : `${i}:00`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Consultation Duration (minutes)
                  </label>
                  <select 
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm rounded-md"
                    value={consultantData.availability.duration}
                    onChange={e => handleAvailabilityChange('duration', parseInt(e.target.value))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>

      {/* My Appointments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-4">My Appointments</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {consultantAppointments.length > 0 ? (
                consultantAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {appointment.userName || 'Client'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatAppointmentDate(appointment.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'scheduled'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : appointment.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400" colSpan={4}>
                    No appointments scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { stats, loading, error } = useSelector((state: RootState) => state.admin);
  const { consultantAppointments } = useSelector((state: RootState) => state.appointment);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  
  // Check for role changes in real-time
  useEffect(() => {
    // If the user is no longer an admin or superadmin, redirect them
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      alert("Your administrative privileges have been revoked. You will be redirected to the dashboard.");
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'appointment',
      message: 'New appointment booked by Sarah Johnson',
      time: '10 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'payment',
      message: 'New premium subscription by Michael Chen',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      type: 'user',
      message: 'New user registration: Emily Rodriguez',
      time: '3 hours ago',
      read: true
    }
  ]);
  
  useEffect(() => {
    dispatch(fetchAdminStats());
    if (user?.uid && (user.role === 'admin' || user.role === 'superadmin')) {
      dispatch(fetchConsultantAppointments(user.uid));
    }
  }, [dispatch, user]);

  // Fetch consultant profiles for superadmin
  useEffect(() => {
    if (user?.role === 'superadmin') {
      dispatch(fetchAllConsultantProfiles());
    }
  }, [dispatch, user?.role]);

  // Get allConsultantProfiles from state
  const { allConsultantProfiles, allConsultantProfilesLoading } = useSelector((state: RootState) => state.auth);

  // Check if user is admin or superadmin
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return <Navigate to="/dashboard" />;
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };
  
  const renderOverviewTab = () => {
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user?.role === 'superadmin' ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Total Users</h3>
                <Users className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalUsers || 0}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Active Users</span>
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">My Consultations</h3>
                <MessageSquare className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {consultantAppointments?.length || 0}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Total Consultations</span>
              </p>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Appointments</h3>
              <Calendar className="h-8 w-8 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalAppointments || 0}</p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>Total Bookings</span>
            </p>
          </div>
          
          {user?.role === 'superadmin' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Revenue</h3>
                <CreditCard className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">₹{stats?.totalRevenue.toLocaleString() || 0}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Total Earnings</span>
              </p>
            </div>
          )}
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Monthly Activity</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.monthlyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {user?.role === 'superadmin' && <Line type="monotone" dataKey="users" name="Users" stroke="#8884d8" />}
                  <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Appointment Status</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Scheduled', value: stats?.appointmentStatus.scheduled || 0 },
                      { name: 'Completed', value: stats?.appointmentStatus.completed || 0 },
                      { name: 'Cancelled', value: stats?.appointmentStatus.cancelled || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#FFBB28" />
                    <Cell fill="#00C49F" />
                    <Cell fill="#FF8042" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Users - only show for superadmin */}
          {user?.role === 'superadmin' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Users</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Plan
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {stats?.recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {user.plan}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {user.joined}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Appointments */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${user?.role === 'superadmin' ? '' : 'lg:col-span-2'}`}>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Appointments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Expert
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {stats?.recentAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {appointment.userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {appointment.expertName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {appointment.expertSpecialization || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {appointment.date} at {appointment.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          appointment.status === 'scheduled'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Payments - only show for superadmin */}
          {user?.role === 'superadmin' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Payments</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Plan
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {stats?.recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {payment.user}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {payment.plan}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          ₹{payment.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {payment.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Consultant Profiles - only show for superadmin */}
          {user?.role === 'superadmin' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Consultant Profiles</h3>
                <span className="px-3 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  {allConsultantProfiles.length} Consultants
                </span>
              </div>
              
              {allConsultantProfilesLoading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : allConsultantProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No consultant profiles found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allConsultantProfiles.map((profile) => (
                    <div key={profile.uid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="relative h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold text-xl">
                          {profile.fullName.charAt(0)}
                          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${
                            profile.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-md font-medium text-gray-900 dark:text-white">
                            {profile.fullName}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {profile.title}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">Specializations:</span>
                          <span className="truncate">{profile.specializations.join(', ')}</span>
                        </div>
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">Experience:</span>
                          <span>{profile.yearsOfExperience} years</span>
                        </div>
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300 mr-2">Available days:</span>
                          <span>{profile.availability.days.join(', ') || 'None'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-auto pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          profile.isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {profile.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button 
                          className="ml-auto text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                          onClick={() => navigate(`/admin/consultant/${profile.uid}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAppointmentsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Appointment Management</h3>
          <div className="flex space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search appointments..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select className="border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white">
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expert
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Specialization
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {stats?.recentAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {appointment.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {appointment.expertName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {appointment.expertSpecialization || 'Not specified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {appointment.date} at {appointment.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      appointment.status === 'scheduled'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : appointment.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Appointment Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.monthlyStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="appointments" name="Appointments" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Appointment Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Scheduled', value: stats?.appointmentStatus.scheduled || 0 },
                    { name: 'Completed', value: stats?.appointmentStatus.completed || 0 },
                    { name: 'Cancelled', value: stats?.appointmentStatus.cancelled || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#FFBB28" />
                  <Cell fill="#00C49F" />
                  <Cell fill="#FF8042" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRevenueTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Total Revenue</h3>
            <CreditCard className="h-8 w-8 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">₹{stats?.totalRevenue.toLocaleString() || 0}</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>Total Earnings</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Paying Users</h3>
            <Users className="h-8 w-8 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.planDistribution.reduce((sum, plan) => sum + plan.value, 0) || 0}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>Active Subscribers</span>
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Revenue Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.monthlyStats || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
              <Legend />
              <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Plan Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats?.planDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {stats?.planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Payments</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {stats?.recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {payment.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {payment.plan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ₹{payment.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {payment.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      payment.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : payment.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <UserManagement />
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6">
        <p className="text-gray-600 dark:text-gray-400">Settings content will be added here.</p>
      </div>
    </div>
  );

  const renderConsultationsTab = () => (
    <ConsultantProfileTab />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <nav className="flex flex-col">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activeTab === 'overview'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <BarChart2 className="mr-3 h-5 w-5" />
                  Overview
                </button>
                {/* Only show Users tab for superadmin */}
                {user?.role === 'superadmin' && (
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center px-4 py-3 rounded-lg ${
                      activeTab === 'users'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Users className="h-5 w-5 mr-3" />
                    <span>Users</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activeTab === 'appointments'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  Appointments
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('consultations')}
                    className={`flex items-center px-4 py-3 text-sm font-medium ${
                      activeTab === 'consultations'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <MessageSquare className="mr-3 h-5 w-5" />
                    Consultant Profile
                  </button>
                )}
                {user?.role === 'superadmin' && (
                  <button
                    onClick={() => setActiveTab('revenue')}
                    className={`flex items-center px-4 py-3 text-sm font-medium ${
                      activeTab === 'revenue'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <CreditCard className="mr-3 h-5 w-5" />
                    Revenue
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    activeTab === 'settings'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </button>
              </nav>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'users' && user?.role === 'superadmin' && renderUsersTab()}
            {activeTab === 'appointments' && renderAppointmentsTab()}
            {activeTab === 'revenue' && user?.role === 'superadmin' && renderRevenueTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'consultations' && renderConsultationsTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;