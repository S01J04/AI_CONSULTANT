import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, Calendar, CreditCard, Settings, 
  BarChart2, Bell, Search
} from 'lucide-react';
import { fetchAdminStats } from '../redux/slices/adminSlice';
import { 
  fetchConsultantProfile,
  saveConsultantProfile,
  fetchAllConsultantProfiles
} from '../redux/slices/authSlice';
import {
  Appointment,
  fetchConsultantAppointments,
  fetchUserAppointments,
  cancelAppointment,
  completeAppointment
} from '../redux/slices/appointmentSlice';
import UserManagement from '../components/admin/UserManagement';
import { toast } from 'react-toastify';

// Import our custom chart components
import { LineChart, BarChart, PieChart as PieChartComponent, DoughnutChart } from '../components/charts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const handleappointment = (appointmentDetails) => {
  const modal = document.createElement('div');
  modal.className =
    'fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm z-50 transition-opacity duration-300';

  const modalContent = document.createElement('div');
  modalContent.className =
    'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-[90%] max-w-md relative transform scale-100 transition-transform duration-300 ease-out';

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.className =
    'absolute top-3 right-4 text-2xl text-gray-400 hover:text-red-500 focus:outline-none transition-colors';
  closeButton.onclick = () => {
    document.body.removeChild(modal);
  };

  const title = document.createElement('h2');
  title.className =
    'text-2xl font-bold text-center mb-5 text-indigo-600 dark:text-indigo-400';
  title.innerText = '📅 Appointment Details';

  const detailBlock = (label, value) => `
    <div class="flex justify-between items-center border-b py-2 text-gray-700 dark:text-gray-300">
      <span class="font-medium text-sm">${label}</span>
      <span class="text-right text-sm font-semibold">${value}</span>
    </div>`;
  console.log('appointmentDetails',appointmentDetails)
  const detailsHTML = `
    ${detailBlock('👤 User', appointmentDetails.userName)}
    ${detailBlock('🧑‍⚕️ Expert', appointmentDetails.expertName)}
    ${detailBlock('🔬 Specialization', appointmentDetails.expertSpecialization)}
    ${detailBlock('📆 Date', appointmentDetails.date)}
    ${detailBlock('⏰ Time', appointmentDetails.time)}
    ${detailBlock('📞 Contact', appointmentDetails?.notes?.split(',')[0])}
    ${detailBlock('📍 Status', formatStatus(appointmentDetails?.status))}
  `;

  const details = document.createElement('div');
  details.className = 'space-y-2';
  details.innerHTML = detailsHTML;

  modalContent.appendChild(closeButton);
  modalContent.appendChild(title);
  modalContent.appendChild(details);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
};

const formatStatus = (status) => {
  if (!status) return '⏳ Pending';
  const lower = status.toLowerCase();
  if (lower.includes('completed'))
    return `<span class="text-green-600 dark:text-green-400">✅ Completed</span>`;
  if (lower.includes('cancelled'))
    return `<span class="text-red-600 dark:text-red-400">❌ Cancelled</span>`;
  return `<span class="text-yellow-500 dark:text-yellow-400">🕒 Scheduled</span>`;
};

const ConsultantProfileTab: React.FC = () => {


  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [consultantData, setConsultantData] = useState({
    fullName: user?.userName || '',
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
  const { consultantAppointments, userAppointments } = useSelector((state: RootState) => state.appointment);

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

      // Show success toast
      toast.success(`Consultant profile ${updatedProfile.isActive ? 'activated' : 'deactivated'} successfully`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error: any) {
      console.error('Failed to toggle profile visibility:', error);

      // Show error toast
      toast.error(`Failed to update profile visibility: ${error.message || 'Unknown error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
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

      // Show success toast
      toast.success("Consultant profile saved successfully", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error: any) {
      console.error('Failed to save consultant profile:', error);

      // Show error toast
      toast.error(`Failed to save consultant profile: ${error.message || 'Unknown error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const formatAppointmentDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(timestamp);
    }
  };

  const handleViewDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
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
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { stats, loading, error } = useSelector((state: RootState) => state.admin);
  const { consultantAppointments, userAppointments } = useSelector((state: RootState) => state.appointment);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Admin appointments pagination
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [apointmentloading, setapointmentLoading] = useState(false);
  // Filter appointments based on search term and status
  const filteredAppointments = useMemo(() => {
    return stats?.recentAppointments.filter((appointment) => {
      const matchesSearch =
        (appointment.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.expertName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, stats]);

  // Get current appointments for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAppointments = filteredAppointments?.slice(indexOfFirstItem, indexOfLastItem);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Get filtered admin appointments
  const filteredAdminAppointments = useMemo(() => {
    const appointments = user?.role === 'superadmin' ? userAppointments : consultantAppointments;
    return appointments?.filter(appointment => {
      const matchesSearch = !searchTerm ||
        (appointment.displayName && appointment.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, userAppointments, consultantAppointments, user?.role]);

  // Get current admin appointments for pagination
  const indexOfLastAdminItem = adminCurrentPage * itemsPerPage;
  const indexOfFirstAdminItem = indexOfLastAdminItem - itemsPerPage;
  const currentAdminAppointments = filteredAdminAppointments?.slice(indexOfFirstAdminItem, indexOfLastAdminItem);

  // Change admin page
  const paginateAdmin = (pageNumber: number) => setAdminCurrentPage(pageNumber);
  
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedAppointment(null);
    setIsModalOpen(false);
  };

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
    if (user?.uid) {
      if (user.role === 'superadmin') {
        // For superadmin, fetch all appointments
        dispatch(fetchUserAppointments({ userRole: 'superadmin' }));
      } else if (user.role === 'admin') {
        // For regular admin, fetch only their appointments as consultant
        dispatch(fetchConsultantAppointments(user.uid));
      }
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

          {
            user.role == 'superadmin' && (
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
            )
          }
        
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
        {user?.role == "superadmin" && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Monthly Activity</h3>
          <div className="h-80">
              <LineChart
                title="Monthly Activity"
                data={{
                  labels: stats?.monthlyStats?.map(stat => stat.name) || [],
                  datasets: [
                    ...(user?.role === 'superadmin' ? [{
                      label: 'Users',
                      data: stats?.monthlyStats?.map(stat => stat.users) || [],
                      borderColor: '#8884d8',
                      backgroundColor: 'rgba(136, 132, 216, 0.2)',
                      tension: 0.3
                    }] : []),
                    {
                      label: 'Appointments',
                      data: stats?.monthlyStats?.map(stat => stat.appointments) || [],
                      borderColor: '#82ca9d',
                      backgroundColor: 'rgba(130, 202, 157, 0.2)',
                      tension: 0.3
                    }
                  ]
                }}
                height={300}
              />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Appointment Status</h3>
          <div className="h-80">
              <PieChartComponent
                title="Appointment Status"
                data={{
                  labels: ['Scheduled', 'Completed', 'Cancelled'],
                  datasets: [
                    {
                      data: [
                        stats?.appointmentStatus?.scheduled || 0,
                        stats?.appointmentStatus?.completed || 0,
                        stats?.appointmentStatus?.cancelled || 0
                      ],
                      backgroundColor: [
                        '#FFBB28',
                        '#00C49F',
                        '#FF8042'
                      ],
                      borderColor: [
                        '#FFBB28',
                        '#00C49F',
                        '#FF8042'
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                height={300}
              />
          </div>
        </div>
        </div>)}

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
          {user?.role == "superadmin" && (<div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${user?.role === 'superadmin' ? '' : 'lg:col-span-2'}`}>
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
                        {appointment.displayName || 'Unknown User'}
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${appointment.status === 'scheduled'
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
          </div>)}


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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'completed'
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


      </div>
    </div>
  );
  };
  var formatAppointmentDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  const renderAppointmentsTab = (
    handleViewDetails, closeModal,
    setSearchTerm, searchTerm,
    statusFilter, setStatusFilter
    ,filteredAppointments
  ) => (

    <div className="space-y-6">

      {user?.role == "superadmin" && (
        <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-300">
                        Loading appointments...
                      </td>
                    </tr>
                  ) : currentAppointments?.length > 0 ? (
                    currentAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {appointment.displayName || 'Unknown Client'}
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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${appointment.status === 'scheduled'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : appointment.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <button
                            onClick={() => handleappointment(appointment)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                      View Details
                    </button>
                  </td>
                </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-300">
                        No appointments found.
                      </td>
                    </tr>
                  )}

                  {/* Pagination */}
                  {filteredAppointments && filteredAppointments.length > itemsPerPage && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex justify-center mt-4">
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {Array.from({ length: Math.ceil(filteredAppointments.length / itemsPerPage) }).map((_, index) => (
                              <button
                                key={index}
                                onClick={() => paginate(index + 1)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === index + 1
                                    ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-500 text-indigo-600 dark:text-indigo-200'
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}

                            <button
                              onClick={() => paginate(currentPage < Math.ceil(filteredAppointments.length / itemsPerPage) ? currentPage + 1 : currentPage)}
                              disabled={currentPage === Math.ceil(filteredAppointments.length / itemsPerPage)}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Appointment Trends</h3>
          <div className="h-80">
                <LineChart
                  title="Appointment Trends"
                  data={{
                    labels: stats?.monthlyStats?.map(stat => stat.name) || [],
                    datasets: [
                      {
                        label: 'Appointments',
                        data: stats?.monthlyStats?.map(stat => stat.appointments) || [],
                        borderColor: '#82ca9d',
                        backgroundColor: 'rgba(130, 202, 157, 0.2)',
                        tension: 0.3
                      }
                    ]
                  }}
                  height={300}
                />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Appointment Status</h3>
          <div className="h-80">
                <PieChartComponent
                  title="Appointment Status"
                  data={{
                    labels: ['Scheduled', 'Completed', 'Cancelled'],
                    datasets: [
                      {
                        data: [
                          stats?.appointmentStatus?.scheduled || 0,
                          stats?.appointmentStatus?.completed || 0,
                          stats?.appointmentStatus?.cancelled || 0
                        ],
                        backgroundColor: [
                          '#FFBB28',
                          '#00C49F',
                          '#FF8042'
                        ],
                        borderColor: [
                          '#FFBB28',
                          '#00C49F',
                          '#FF8042'
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  height={300}
                />
              </div>
            </div>
          </div>
        </>
      )}
      {/* My Appointments */}
      {
        user?.role == 'admin' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">My Appointments</h3>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by client name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
          </div>
        </div>

            {/* Loading State */}
            {apointmentloading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
            ) : (
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
                    {/* Display paginated appointments */}
                    {filteredAdminAppointments?.length > 0 ? (
                      currentAdminAppointments?.map((appointment) => (
                          <React.Fragment key={appointment.id}>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {appointment?.userName || 'Client'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {appointment?.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${appointment.status === 'scheduled'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : appointment.status === 'completed'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex space-x-2">
                                  <button
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    onClick={() => handleViewDetails(appointment)}
                                  >
                                    View Details
                                  </button>

                                  {appointment.status === 'scheduled' && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          try {
                                            setapointmentLoading(true);

                                            // Use the completeAppointment action
                                            await dispatch(completeAppointment({
                                              appointmentId: appointment.id,
                                              completedBy: 'admin'
                                            }));

                                            // Refresh the appointments list
                                            if (user?.uid) {
                                              dispatch(fetchConsultantAppointments(user.uid));
                                            }

                                            toast.success("Appointment marked as completed!");
                                          } catch (error) {
                                            console.error("Error updating appointment:", error);
                                            toast.error("Failed to update appointment.");
                                          } finally {
                                            setapointmentLoading(false);
                                          }
                                        }}
                                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                      >
                                        Complete
                                      </button>

                                      <button
                                        onClick={() => {
                                          setSelectedAppointment(appointment);
                                          setShowCancelModal(true);
                                        }}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))
                    ) : (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400" colSpan={4}>
                          No appointments scheduled yet.
                        </td>
                      </tr>
                    )}

                    {/* No results message */}
                    {filteredAdminAppointments?.length === 0 && (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400" colSpan={4}>
                          No appointments match your search criteria.
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>

                {/* Pagination for admin appointments */}
                {filteredAdminAppointments && filteredAdminAppointments.length > itemsPerPage && (
                  <div className="flex justify-center mt-4">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => paginateAdmin(adminCurrentPage > 1 ? adminCurrentPage - 1 : 1)}
                        disabled={adminCurrentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {Array.from({ length: Math.ceil(filteredAdminAppointments.length / itemsPerPage) }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => paginateAdmin(index + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            adminCurrentPage === index + 1
                              ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-500 text-indigo-600 dark:text-indigo-200'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => paginateAdmin(adminCurrentPage < Math.ceil(filteredAdminAppointments.length / itemsPerPage) ? adminCurrentPage + 1 : adminCurrentPage)}
                        disabled={adminCurrentPage === Math.ceil(filteredAdminAppointments.length / itemsPerPage)}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}

            {/* Appointment Details Modal */}
            {isModalOpen && selectedAppointment && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-xl relative animate-fadeIn">
                  {/* Close Button */}
                  <button
                    onClick={closeModal}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl"
                    aria-label="Close"
                  >
                    ✕
                  </button>

                  {/* Title */}
                  <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white text-center">
                    Appointment Details
                  </h2>

                  {/* Status Message */}
                  {selectedAppointment.status === "completed" && (
                    <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-sm text-center">
                      ✅ This appointment has been marked as <strong>Completed</strong>.
                    </div>
                  )}

                  {selectedAppointment.status === "cancelled" && (
                    <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 text-sm text-center">
                      ❌ This appointment has been <strong>Cancelled</strong>.
                    </div>
                  )}

                  {/* Appointment Info */}
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <p><strong>Client Name:</strong> {selectedAppointment?.userName || 'Unknown Client'}</p>
                    <p><strong>Date:</strong> {selectedAppointment.date}</p>
                    <p><strong>Time:</strong> {selectedAppointment.time}</p>
                    <p><strong>Status:</strong> <span className="capitalize">{selectedAppointment.status}</span></p>
                    <p><strong>Notes:</strong> {selectedAppointment.notes || "No notes provided."}</p>
                    <p><strong>Expert:</strong> {selectedAppointment.expertName} ({selectedAppointment.expertSpecialization})</p>
                  </div>

                  {/* Action Buttons */}
                  {selectedAppointment.status === 'scheduled' && (
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        onClick={async () => {
                          try {
                            // Use the completeAppointment action
                            await dispatch(completeAppointment({
                              appointmentId: selectedAppointment.id,
                              completedBy: 'admin'
                            }));

                            setSelectedAppointment({ ...selectedAppointment, status: "completed" });

                            // Refresh the appointments list
                            if (user?.uid) {
                              dispatch(fetchConsultantAppointments(user.uid));
                            }

                            toast.success("Appointment marked as completed!");
                            setIsModalOpen(false);
                          } catch (error) {
                            console.error("Error updating appointment:", error);
                            toast.error("Failed to update appointment.");
                          }
                        }}
                        className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        Mark as Completed
                      </button>

                      <button
                        onClick={() => {
                          setShowCancelModal(true);
                          setIsModalOpen(false);
                        }}
                        className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation Modal */}
            {showCancelModal && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cancel Appointment</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Are you sure you want to cancel this appointment? This action cannot be undone.
                  </p>

                  <div className="mb-4">
                    <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cancellation Reason (required, will be visible to the user) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="cancellationReason"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder="Please provide a reason for cancellation..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowCancelModal(false);
                        setCancellationReason('');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Validate that a reason is provided
                        if (!cancellationReason.trim()) {
                          toast.error("Please provide a reason for cancellation", {
                            position: "top-right",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                          });
                          return;
                        }

                        try {
                          setapointmentLoading(true);

                          // Use the enhanced cancelAppointment action
                          if (selectedAppointment) {
                            console.log('Cancelling appointment:', selectedAppointment.id);
                            console.log('Cancellation reason:', cancellationReason);
                            console.log('Selected appointment details:', selectedAppointment);

                            const result = await dispatch(cancelAppointment({
                              appointmentId: selectedAppointment.id,
                              reason: cancellationReason,
                              cancelledBy: 'admin'
                            }));

                            console.log('Cancellation result:', result);
                          } else {
                            throw new Error('No appointment selected');
                          }

                          // Update the selected appointment if it's open
                          if (selectedAppointment) {
                            setSelectedAppointment({
                              ...selectedAppointment,
                              status: "cancelled",
                              cancellationReason: cancellationReason
                            });
                          }

                          // Refresh the appointments list
                          if (user?.uid) {
                            dispatch(fetchConsultantAppointments(user.uid));
                          }

                          toast.success("Appointment cancelled successfully");

                          // Close the modal and reset state
                          setShowCancelModal(false);
                          setCancellationReason('');
                        } catch (error) {
                          console.error("Error cancelling appointment:", error);
                          toast.error("Failed to cancel appointment.");
                        } finally {
                          setapointmentLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }
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
          <BarChart
            title="Revenue Trends"
            data={{
              labels: stats?.monthlyStats?.map(stat => stat.name) || [],
              datasets: [
                {
                  label: 'Revenue',
                  data: stats?.monthlyStats?.map(stat => stat.revenue) || [],
                  backgroundColor: 'rgba(136, 132, 216, 0.6)',
                  borderColor: '#8884d8',
                  borderWidth: 1,
                }
              ]
            }}
            height={300}
            options={{
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      let label = context.dataset.label || '';
                      if (label) {
                        label += ': ';
                      }
                      if (context.parsed.y !== null) {
                        label += `₹${context.parsed.y}`;
                      }
                      return label;
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Plan Distribution</h3>
        <div className="h-80">
          <DoughnutChart
            title="Plan Distribution"
            data={{
              labels: stats?.planDistribution?.map(plan => plan.name) || [],
              datasets: [
                {
                  data: stats?.planDistribution?.map(plan => plan.value) || [],
                  backgroundColor: COLORS.map(color => color),
                  borderColor: COLORS.map(color => color),
                  borderWidth: 1,
                }
              ]
            }}
            height={300}
          />
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'completed'
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

  const renderConsultantsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Consultant Profiles</h2>
          <span className="px-3 py-1 text-sm rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            {allConsultantProfiles.length} Consultants
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {allConsultantProfilesLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : allConsultantProfiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No consultant profiles found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allConsultantProfiles.map((profile) => (
                <div key={profile.uid} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="relative h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-bold text-xl">
                      {profile.fullName.charAt(0)}
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${profile.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${profile.isActive
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
      </div>
    );
  };

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
                  className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'overview'
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
                    className={`w-full flex items-center px-4 py-3 rounded-lg ${activeTab === 'users'
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
                  className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'appointments'
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
                    className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'consultations'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <MessageSquare className="mr-3 h-5 w-5" />
                    Consultant Profile
                  </button>
                )}
                {user?.role === 'superadmin' && (
                  <>
                    <button
                      onClick={() => setActiveTab('consultants')}
                      className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'consultants'
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Users className="mr-3 h-5 w-5" />
                      Consultants
                </button>
                <button
                  onClick={() => setActiveTab('revenue')}
                      className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'revenue'
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-l-4 border-indigo-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <CreditCard className="mr-3 h-5 w-5" />
                  Revenue
                </button>
                  </>
                )}
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${activeTab === 'settings'
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
            {activeTab === 'consultants' && user?.role === 'superadmin' && renderConsultantsTab()}
            {activeTab === 'appointments' && renderAppointmentsTab(
               handleViewDetails, closeModal,
               setSearchTerm, searchTerm,
               statusFilter, setStatusFilter
               ,filteredAppointments
            )}
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
