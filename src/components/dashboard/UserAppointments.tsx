import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { cancelAppointment } from '../../redux/slices/appointmentSlice';
import { Calendar, Clock, User, X } from 'lucide-react';
import { format } from 'date-fns';
import usePlanAccess from '../../hooks/usePlanAccess';
import PayPerServiceCard from './PayPerServiceCard';

interface UserAppointmentsProps {
  onPayPerServicePurchase?: () => void;
}

const UserAppointments: React.FC<UserAppointmentsProps> = ({ onPayPerServicePurchase }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { userAppointments } = useSelector((state: RootState) => state.appointment);
  const { user } = useSelector((state: RootState) => state.auth);
  const { remainingAppointments, planFeatures } = usePlanAccess();

  // No need to fetch appointments here as they're already fetched in UserDashboard
  // Just use the appointments from the Redux store

  const handleCancelAppointment = async (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await dispatch(cancelAppointment({
          appointmentId,
          reason: 'Cancelled by user',
          cancelledBy: 'user'
        }));
      } catch (error) {
        console.error('Failed to cancel appointment:', error);
      }
    }
  };

  // Only show appointments created by the user, regardless of role
  // This ensures that even if the user is an admin/consultant, they only see appointments they booked
  const currentUserAppointments = userAppointments.filter(appointment => {
    return appointment.userId === user?.uid;
  });

  // Get only scheduled appointments (not cancelled or completed)
  const scheduledAppointments = currentUserAppointments.filter(
    appointment => appointment.status === 'scheduled'
  );

  console.log('Filtered scheduled appointments:', scheduledAppointments);

  // Show pay-per-service option if user has no appointments left and can book appointments
  const showPayPerServiceOption = planFeatures.canBookAppointments && remainingAppointments === 0;

  if (scheduledAppointments.length === 0) {
    return (
      <div className="space-y-6">
        {/* Show pay-per-service option if applicable */}
        {showPayPerServiceOption && (
          <PayPerServiceCard onPurchase={onPayPerServicePurchase} />
        )}

        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-gray-500 dark:text-gray-400">No upcoming appointments found.</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Check your appointment history for past or cancelled appointments.</p>
          {planFeatures.canBookAppointments && remainingAppointments > 0 && (
            <p className="mt-4 text-sm text-indigo-600 dark:text-indigo-400">
              You have {remainingAppointments} appointment(s) available to book.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show pay-per-service option if applicable */}
      {/* {showPayPerServiceOption && (
        // <PayPerServiceCard onPurchase={onPayPerServicePurchase} />
      )} */}

      <div className="space-y-4">
        {scheduledAppointments.map((appointment) => (
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
      ))}
      </div>
    </div>
  );
};

export default UserAppointments;