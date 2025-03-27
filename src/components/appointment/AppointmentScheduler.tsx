import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import {
  setSelectedDate,
  setSelectedTime,
  scheduleAppointment,
  clearSelections,
  Expert
} from '../../redux/slices/appointmentSlice';
import { Calendar, Clock, CheckCircle, Calendar as CalendarIcon, AlertCircle, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Define our local component state type that extends the global state
interface AppointmentSchedulerProps {
  selectedExpert?: Expert | null;
  selectedDate?: string | null;
  selectedTime?: string | null;
  loading: boolean;
  error: string | null;
}

const AppointmentScheduler: React.FC = () => {
  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [schedulingComplete, setSchedulingComplete] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Get appointment state from Redux store
  const {
    selectedExpert,
    selectedDate,
    selectedTime,
    loading,
    error
  } = useSelector<RootState, AppointmentSchedulerProps>((state: RootState) => state.appointment);
  
  // Get current user from auth state
  const { user } = useSelector((state: RootState) => state.auth);

  // Reset scheduling state when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearSelections());
    };
  }, [dispatch]);

  // Reset scheduling complete status when selection changes
  useEffect(() => {
    if (schedulingComplete) {
      setSchedulingComplete(false);
    }
  }, [selectedExpert, selectedDate, selectedTime]);

  // If no expert is selected, show a prompt
  if (!selectedExpert) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
        <div className="p-6 flex flex-col items-center">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Select a consultant first
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please choose a consultant from the list to view available times
          </p>
        </div>
      </div>
    );
  }

  // Map availability to dates and times using the correct property names
  const availableDates = selectedExpert.availability.map(slot => ({
    day: slot.day,
    hasSlots: slot.slots.length > 0
  }));
  
  const getAvailableTimesForDate = (date: string) => {
    const dateSlot = selectedExpert.availability.find(slot => slot.day === date);
    return dateSlot ? dateSlot.slots : [];
  };

  const availableTimes = selectedDate ? getAvailableTimesForDate(selectedDate) : [];

  const handleDateChange = (day: string) => {
    dispatch(setSelectedDate(day));
    dispatch(setSelectedTime(''));
  };

  const handleTimeChange = (time: string) => {
    dispatch(setSelectedTime(time));
  };

  const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMobileNumber(e.target.value);
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime || !mobileNumber || !user) return;
    
    setSubmitting(true);
    
    try {
      dispatch(scheduleAppointment({
        userId: user.uid,
        expertId: selectedExpert.id,
        expertName: selectedExpert.name,
        expertSpecialization: selectedExpert.specialization,
        date: selectedDate,
        time: selectedTime,
        notes: `Mobile: ${mobileNumber.trim()}`
      }) as any);
      
      setSuccess(true);
    } catch (error) {
      setSuccess(false);
      console.error('Error scheduling appointment:', error);
    }
    
    // Reset submitting state after scheduling attempt completes
    setTimeout(() => {
      setSubmitting(false);
      setSchedulingComplete(true);
      
      // Reset the form after 3 seconds if successful
      if (success) {
        setTimeout(() => {
          dispatch(clearSelections());
        }, 3000);
      }
    }, 1500);
  };

  const formatDisplayDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Loading state during form submission
  if (submitting) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 h-full flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300">Scheduling your appointment...</p>
      </div>
    );
  }

  // Success state
  if (schedulingComplete && success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="py-6 px-4 flex flex-col items-center text-center">
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Appointment Scheduled Successfully!
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            Your appointment with {selectedExpert.name} on {selectedDate} at {selectedTime} has been booked. 
            You'll receive a confirmation email shortly.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (schedulingComplete && error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="py-6 px-4 flex flex-col items-center text-center">
          <div className="rounded-full bg-red-100 p-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Scheduling Failed</h3>
          <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setSchedulingComplete(false)}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-indigo-500" />
        Schedule with {selectedExpert.name}
      </h2>
      
      {/* Two column layout for desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date and Time Selection Column */}
        <div>
          {/* Date Selection */}
          <div className="mb-3">
            <h3 className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              <Calendar className="h-4 w-4 mr-1 text-indigo-500" /> 
              Select Date
            </h3>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date.day}
                  onClick={() => handleDateChange(date.day)}
                  className={`px-2 py-1.5 text-xs rounded-md transition-colors ${
                    selectedDate === date.day
                      ? 'bg-indigo-600 text-white'
                      : date.hasSlots
                      ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!date.hasSlots}
                >
                  {new Date(date.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          </div>
          
          {/* Time Selection - only show if date is selected */}
          {selectedDate && (
            <div className="mb-3">
              <h3 className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                <Clock className="h-4 w-4 mr-1 text-indigo-500" /> 
                Select Time
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeChange(time)}
                    className={`px-2 py-1.5 text-xs rounded-md transition-colors ${
                      selectedTime === time
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Contact Info and Booking Column */}
        <div>
          {/* Mobile number input - only show if date and time are selected */}
          {selectedDate && selectedTime && (
            <div className="mb-3">
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Your Contact Number
              </label>
              <input
                type="tel"
                id="mobileNumber"
                value={mobileNumber}
                onChange={handleMobileNumberChange}
                placeholder="Enter your phone number"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                We'll use this number to send appointment reminders
              </p>
            </div>
          )}
          
          {/* Booking details summary - only show if all fields are selected */}
          {selectedDate && selectedTime && mobileNumber && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Appointment Summary</h3>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <li><span className="font-medium">Consultant:</span> {selectedExpert.name}</li>
                <li><span className="font-medium">Specialization:</span> {selectedExpert.specialization}</li>
                <li><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString()}</li>
                <li><span className="font-medium">Time:</span> {selectedTime}</li>
              </ul>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-md flex items-start">
              <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Book button */}
          <button
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime || !mobileNumber || loading}
            className={`w-full mt-1 flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm ${
              !selectedDate || !selectedTime || !mobileNumber
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Book Appointment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentScheduler;