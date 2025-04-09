import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { 
  fetchConsultantProfile, 
  fetchUsers
} from '../redux/slices/authSlice';
import { fetchConsultantAppointments, scheduleAppointment } from '../redux/slices/appointmentSlice';
import { 
  ArrowLeft, Calendar, Clock, User, 
  Mail, Phone, Star, Check, AlertCircle,
  MessageSquare, Video, Info, Award
} from 'lucide-react';

// Appointment type definition
interface Appointment {
  id: string;
  userId: string;
  expertId: string;
  expertName?: string;
  expertSpecialization?: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  createdAt: number;
  consultantId?: string;
}

const ConsultantDetailsPage: React.FC = () => {
  const { consultantId } = useParams<{ consultantId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0); // scrolls to the top when this page loads
  }, []);
  // State for appointment booking
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [bookingStatus, setBookingStatus] = useState<{success?: string; error?: string}>({});
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'book'>('info');

  const { user, consultantProfile, consultantProfileLoading, users } = useSelector((state: RootState) => state.auth);
  const { consultantAppointments } = useSelector((state: RootState) => state.appointment);
  
  // Find user details for this consultant
  const userDetails = users.find(u => u.uid === consultantId);

  // Fetch consultant profile and appointments data
  useEffect(() => {
    if (consultantId) {
      dispatch(fetchConsultantProfile(consultantId));
      dispatch(fetchConsultantAppointments(consultantId));
      dispatch(fetchUsers());
    }
  }, [consultantId, dispatch]);

  // Generate available times based on consultant's hours
  useEffect(() => {
    if (consultantProfile && selectedDate) {
      try {
        const availabilityHours = consultantProfile.availability?.hours || { from: 9, to: 17 };
        const from = availabilityHours.from || 9;
        const to = availabilityHours.to || 17;
        const duration = consultantProfile.availability?.duration || 30;
        
        // Check if the selected day is in available days
        const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
        
        if (!consultantProfile.availability?.days?.includes(dayName)) {
          setAvailableTimes([]);
          return;
        }
        
        // Generate time slots
        const slots: string[] = [];
        const slotCount = Math.floor((to - from) * (60 / duration));
        
        for (let i = 0; i < slotCount; i++) {
          const minutes = i * duration;
          const hour = Math.floor(from + minutes / 60);
          const minute = minutes % 60;
          const formattedHour = hour.toString().padStart(2, '0');
          const formattedMinute = minute.toString().padStart(2, '0');
          slots.push(`${formattedHour}:${formattedMinute}`);
        }
        
        // Filter out booked slots
        const bookedSlots = consultantAppointments
          .filter(app => app.date === selectedDate && app.status === 'scheduled')
          .map(app => app.time);
        
        setAvailableTimes(slots.filter(time => !bookedSlots.includes(time)));
      } catch (error) {
        console.error('Error generating available times:', error);
        setAvailableTimes([]);
      }
    }
  }, [consultantProfile, selectedDate, consultantAppointments]);

  // Check if user is authorized
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Format date for display
  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Handle booking appointment
  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !user.uid || !consultantId || !consultantProfile) {
      setBookingStatus({ error: 'Please select a date and time for your appointment' });
      return;
    }
    
    try {
      await dispatch(scheduleAppointment({
              userId: user.uid,
              expertId: consultantId,
              date: selectedDate,
              time: selectedTime,
              displayName: user.displayName || 'Anonymous', // Add displayName
              expertName: consultantProfile.fullName,
              expertSpecialization: consultantProfile.specializations?.[0] || consultantProfile.title,
              notes
            })).unwrap();
      
      setBookingStatus({ success: 'Appointment booked successfully!' });
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      
      // Refresh appointments after booking
      dispatch(fetchConsultantAppointments(consultantId));
    } catch (error) {
      setBookingStatus({ error: 'Failed to book appointment. Please try again.' });
    }
  };

  // Generate next available dates (next 14 days)
  const getAvailableDates = () => {
    if (!consultantProfile?.availability?.days?.length) return [];
    
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      
      if (consultantProfile.availability.days.includes(dayName)) {
        dates.push({
          date: date.toISOString().split('T')[0],
          dayName,
          displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    }
    
    return dates;
  };

  // Loading state
  if (consultantProfileLoading || !consultantProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const availableDates = getAvailableDates();
  const myAppointments = consultantAppointments.filter(app => app.userId === user.uid);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <div className="mb-5 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back</span>
          </button>
        </div>

        {/* Consultant profile card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="md:flex">
            {/* Left side - Profile picture and quick info */}
            <div className="md:w-1/3 bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white flex flex-col items-center justify-center text-center">
              <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-4xl mb-4">
                {consultantProfile.fullName.charAt(0)}
              </div>
              <h1 className="text-2xl font-bold mb-1">{consultantProfile.fullName}</h1>
              <p className="text-indigo-100 mb-3">{consultantProfile.title}</p>
              
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm mb-4">
                <Award className="h-3.5 w-3.5 mr-1" />
                <span>{consultantProfile.yearsOfExperience} years experience</span>
              </div>

              <div className="w-full mt-2 space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Available {consultantProfile.availability?.days?.join(', ')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{consultantProfile.availability?.hours?.from}:00 - {consultantProfile.availability?.hours?.to}:00</span>
                </div>
                <div className="flex items-center text-sm">
                  <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{consultantProfile.availability?.duration} min sessions</span>
                </div>
              </div>
            </div>
            
            {/* Right side - Tabs and content */}
            <div className="md:w-2/3 p-0">
              {/* Tab navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center justify-center w-1/2 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'info' 
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Consultant Info
                </button>
                {/* <button 
                  onClick={() => setActiveTab('book')}
                  className={`flex items-center justify-center w-1/2 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'book' 
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Appointment
                </button> */}
              </div>
              
              {/* Tab content */}
              <div className="p-6">
                {activeTab === 'info' ? (
                  <div className="space-y-6">
                    {/* Specializations */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Specializations</h3>
                      <div className="flex flex-wrap gap-2">
                        {consultantProfile.specializations?.map((spec: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Bio */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">About</h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {consultantProfile.bio || 'No bio provided.'}
                      </p>
                    </div>
                    
                    {/* Contact details */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Contact Information</h3>
                      <div className="space-y-2">
                        {userDetails?.email && (
                          <div className="flex items-center">
                            <Mail className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">{userDetails.email}</span>
                          </div>
                        )}
                        {consultantProfile.phoneNumber && (
                          <div className="flex items-center">
                            <Phone className="h-5 w-5 text-indigo-500 mr-3 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">{consultantProfile.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status messages */}
                    {bookingStatus.success && (
                      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex">
                          <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <p className="text-green-700 dark:text-green-300">{bookingStatus.success}</p>
                        </div>
                      </div>
                    )}
                    
                    {bookingStatus.error && (
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                          <p className="text-red-700 dark:text-red-300">{bookingStatus.error}</p>
                        </div>
                      </div>
                    )}
                    
                    {!consultantProfile.isActive && (
                      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
                          <p className="text-amber-700 dark:text-amber-300">
                            This consultant is currently not accepting new appointments.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {consultantProfile.isActive && availableDates.length === 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
                          <p className="text-amber-700 dark:text-amber-300">
                            No available appointment slots in the next 14 days. Please check back later.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Date selection */}
                    {/* {consultantProfile.isActive && availableDates.length > 0 && ( */}
                      <>
                        {/* <div>
                          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">Select a date</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {availableDates.map((date) => (
                              <button
                                key={date.date}
                                onClick={() => setSelectedDate(date.date)}
                                className={`py-2 px-3 rounded-lg border text-center transition duration-150 ${
                                  selectedDate === date.date
                                    ? 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                                    : 'border-gray-200 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-700'
                                }`}
                              >
                                <div className="text-gray-500 dark:text-gray-400 text-xs">{date.dayName}</div>
                                <div className={`font-medium ${
                                  selectedDate === date.date
                                    ? 'text-indigo-800 dark:text-indigo-200' 
                                    : 'text-gray-800 dark:text-gray-200'
                                }`}>{date.displayDate}</div>
                              </button>
                            ))}
                          </div>
                        </div> */}
                        
                        {/* Time selection */}
                        {/* {selectedDate && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">Select a time</h3>
                            {availableTimes.length === 0 ? (
                              <p className="text-amber-600 dark:text-amber-400">No available time slots for this date.</p>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {availableTimes.map((time) => (
                                  <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`py-2 px-3 rounded-lg border text-center transition duration-150 ${
                                      selectedTime === time
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200'
                                        : 'border-gray-200 hover:border-indigo-300 dark:border-gray-700 dark:hover:border-indigo-700'
                                    }`}
                                  >
                                    <div className={`font-medium ${
                                      selectedTime === time
                                        ? 'text-indigo-800 dark:text-indigo-200' 
                                        : 'text-gray-800 dark:text-gray-200'
                                    }`}>{time}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )} */}
                        
                        {/* Notes field */}
                        {/* {selectedDate && selectedTime && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-3">Additional notes</h3>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Describe your reason for the appointment or any specific concerns..."
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
                            ></textarea>
                          </div>
                        )} */}
                        
                        {/* Book button */}
                        {/* {selectedDate && selectedTime && (
                          <div className="pt-2">
                            <button
                              onClick={handleBookAppointment}
                              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 flex items-center justify-center"
                            >
                              <Calendar className="h-5 w-5 mr-2" />
                              Book Appointment
                            </button>
                          </div>
                        )} */}
                      </>
                    {/* )} */}
                    
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* My appointments section */}
        {/* {myAppointments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
               Appointments
            </h2>
            
            <div className="space-y-4 mt-4">
              {myAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between"
                >
                  <div className="flex items-start mb-3 sm:mb-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                      appointment.status === 'scheduled'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : appointment.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {appointment.status === 'scheduled' ? (
                        <Calendar className="h-5 w-5" />
                      ) : appointment.status === 'completed' ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(appointment.date)} at {appointment.time}
                        </p>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          appointment.status === 'scheduled'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {appointment.notes || 'No additional notes'}
                      </p>
                    </div>
                  </div>
                  {appointment.status === 'scheduled' && appointment.meetingLink && (
                    <a
                      href={appointment.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 text-sm"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )} */}
        
        {/* What to expect section */}
        {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Info className="h-5 w-5 mr-2 text-indigo-500" />
            What to Expect
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-indigo-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-medium mb-3">
                1
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Book Appointment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select an available date and time slot that works best for you.
              </p>
            </div>
            
            <div className="bg-indigo-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-medium mb-3">
                2
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Confirmation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You'll receive a meeting link via email for your {consultantProfile.availability?.duration || 30}-minute consultation.
              </p>
            </div>
            
            <div className="bg-indigo-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-medium mb-3">
                3
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Join Meeting</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the meeting link at your scheduled time to connect with your consultant.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default ConsultantDetailsPage; 