import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { cancelAppointment, fetchUserAppointments } from '../../redux/slices/appointmentSlice';
import { Calendar, Clock, User, X } from 'lucide-react';
import { format } from 'date-fns';

const UserAppointments: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { userAppointments, experts } = useSelector((state: RootState) => state.appointment);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (user?.uid) {
      console.log('Dispatching fetchUserAppointments for user:', user.uid);
      dispatch(fetchUserAppointments(user.uid));
    }
  }, [dispatch, user?.uid]);

  console.log('UserAppointments - userAppointments:', userAppointments);
  console.log('UserAppointments - experts:', experts);

  const handleCancelAppointment = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await dispatch(cancelAppointment(appointmentId));
      } catch (error) {
        console.error('Failed to cancel appointment:', error);
      }
    }
  };

  // Get expert details for each appointment
  const getExpertDetails = (expertId: string) => {
    const expert = experts.find(expert => expert.id === expertId);
    console.log('Getting expert details for ID:', expertId, 'Found:', expert);
    return expert || {
      name: 'Unknown Expert',
      specialization: 'Unknown Specialization'
    };
  };

  if (userAppointments.length === 0) {
    console.log('No appointments found in userAppointments array');
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No appointments found.</p>
      </div>
    );
  }

  const scheduledAppointments = userAppointments.filter((appointment) => appointment.status === 'scheduled');
  console.log('Filtered scheduled appointments:', scheduledAppointments);

  return (
    <div className="space-y-4">
      {scheduledAppointments.map((appointment) => {
        const expert = getExpertDetails(appointment.expertId);
        return (
          <div
            key={appointment.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <User className="h-8 w-8 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {appointment.expertName || 'Unknown Expert'}
                  </h3>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    {appointment.expertSpecialization || 'Unknown Specialization'}
                  </p>
                </div>
              </div>
              {appointment.status === 'scheduled' && (
                <button
                  onClick={() => handleCancelAppointment(appointment.id)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Booking
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {format(new Date(appointment.date), 'MMMM dd, yyyy')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-indigo-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {appointment.time}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  appointment.status === 'scheduled'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : appointment.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserAppointments; 