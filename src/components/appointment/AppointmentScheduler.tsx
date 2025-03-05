import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { setSelectedDate, setSelectedTime, scheduleAppointment } from '../../redux/slices/appointmentSlice';
import { useNavigate } from 'react-router-dom';
import { Clock, Check, AlertCircle, Phone, Calendar } from 'lucide-react';
import { format, addDays, isSameDay, isBefore, parseISO } from 'date-fns';

const AppointmentScheduler: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { selectedExpert, selectedDate, selectedTime, loading } = useSelector(
    (state: RootState) => state.appointment
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [mobileNumber, setMobileNumber] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get available dates from expert's availability and sort them
  const availableDates = selectedExpert?.availability
    .map(day => ({
      date: day.day,
      dayName: format(parseISO(day.day), 'EEEE'),
      shortDay: format(parseISO(day.day), 'EEE'),
      dateNum: format(parseISO(day.day), 'd')
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
  
  // Get available time slots for the selected date
  const availableTimeSlots = selectedExpert?.availability.find(
    day => day.day === selectedDate
  )?.slots || [];

  const handleDateSelect = (date: string) => {
    dispatch(setSelectedDate(date));
    dispatch(setSelectedTime(''));
    setShowConfirmation(false);
  };

  const handleTimeSelect = (time: string) => {
    dispatch(setSelectedTime(time));
    setShowConfirmation(true);
  };

  const handleScheduleAppointment = async () => {
    if (!user || !selectedExpert || !selectedDate || !selectedTime || !mobileNumber) return;

    try {
      await dispatch(scheduleAppointment({
        userId: user.uid,
        expertId: selectedExpert.id,
        date: selectedDate,
        time: selectedTime,
        notes: `Mobile: ${mobileNumber.trim()}`, // Store mobile number in notes for now
      }));
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
    }
  };

  if (!selectedExpert) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          Please select an expert first to schedule an appointment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6 text-white text-center">
        <h2 className="text-3xl font-bold">Book an Appointment</h2>
        <p className="text-lg mt-2 font-light">With {selectedExpert.name}, {selectedExpert.specialization}</p>
      </div>

      <div className="p-8 bg-white dark:bg-gray-800 rounded-t-3xl">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-4">
            <Calendar className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
            Available Days
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {availableDates.map((dateInfo) => (
              <button
                key={dateInfo.date}
                onClick={() => handleDateSelect(dateInfo.date)}
                className={`p-4 rounded-lg text-left transition-transform transform hover:scale-105 shadow-lg ${
                  selectedDate === dateInfo.date
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <div className="text-lg font-semibold">{dateInfo.dayName}</div>
                <div className="text-sm opacity-80">{dateInfo.dateNum}</div>
              </button>
            ))}
          </div>

          {selectedDate && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <Clock className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                Available Time Slots
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableTimeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`py-3 px-5 rounded-lg text-md font-semibold transition-transform transform hover:scale-105 shadow-lg ${
                      selectedTime === time
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {showConfirmation && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center mb-4">
              <AlertCircle className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
              Contact Information
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="Enter your mobile number"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <p>Selected Day: {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM dd, yyyy') : ''}</p>
                  <p>Selected Time: {selectedTime}</p>
                  <p className="mt-2">Our admin will contact you shortly to confirm your appointment.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showConfirmation && (
          <button
            onClick={handleScheduleAppointment}
            disabled={loading || !mobileNumber}
            className="w-full py-4 px-6 rounded-lg text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-3 mt-6 transform transition-transform hover:scale-105"
          >
            {loading ? 'Booking...' : <><Check className="h-6 w-6" /> Confirm Booking</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentScheduler;