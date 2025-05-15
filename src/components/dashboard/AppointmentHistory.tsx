import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { Calendar, Clock, User, Search, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';

interface AppointmentHistoryProps {
  className?: string;
}

const AppointmentHistory: React.FC<AppointmentHistoryProps> = ({ className = '' }) => {
  const { userAppointments, loading } = useSelector((state: RootState) => state.appointment);
  const { user } = useSelector((state: RootState) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // No need to fetch appointments here as they're already fetched in UserDashboard
  // Only show appointments created by the user, regardless of role
  // This ensures that even if the user is an admin/consultant, they only see appointments they booked
  const currentUserAppointments = userAppointments.filter(appointment => {
    return appointment.userId === user?.uid;
  });

  // Filter and sort appointments
  const filteredAppointments = currentUserAppointments
    .filter(appointment => {
      // Search filter
      const matchesSearch =
        appointment.expertName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.expertSpecialization?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const appointmentDate = parseISO(appointment.date);
        const today = new Date();

        if (dateFilter === 'upcoming') {
          matchesDate = isAfter(appointmentDate, today) || isToday(appointmentDate);
        } else if (dateFilter === 'past') {
          matchesDate = isBefore(appointmentDate, today) && !isToday(appointmentDate);
        } else if (dateFilter === 'today') {
          matchesDate = isToday(appointmentDate);
        } else if (dateFilter === 'thisWeek') {
          const oneWeekFromNow = new Date();
          oneWeekFromNow.setDate(today.getDate() + 7);
          matchesDate = (isAfter(appointmentDate, today) || isToday(appointmentDate)) &&
                        isBefore(appointmentDate, oneWeekFromNow);
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      // If dates are the same, sort by time
      if (dateA === dateB) {
        return sortOrder === 'asc'
          ? a.time.localeCompare(b.time)
          : b.time.localeCompare(a.time);
      }

      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const formatAppointmentDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Appointment History</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0 md:space-x-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by expert name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
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

          {/* Date Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
            </select>
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span>Date</span>
            {sortOrder === 'asc' ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p>No appointments found</p>
          {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' ? (
            <p className="mt-2 text-sm">Try adjusting your filters</p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expert
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
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <User className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {appointment.expertName || 'Unknown Expert'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {appointment.expertSpecialization || 'Unknown Specialization'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatAppointmentDate(appointment.date)}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {appointment.time}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center ${getStatusBadgeClass(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span className="ml-1">
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </span>
                    {appointment.status === 'cancelled' && appointment.cancellationReason && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Reason: {appointment.cancellationReason}
                      </div>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AppointmentHistory;
