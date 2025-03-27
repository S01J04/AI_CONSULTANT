import { 
import React from 'react';
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
interface AppointmentDetailsProps {
  appointment: {
    userName: string;
    expertName: string;
    expertSpecialization: string;
    date: string;
    time: string;
    notes?: string;
    status: string;
  };
  onClose: () => void;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsProps> = ({ appointment, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Appointment Details
        </h2>
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>User Name:</strong> {appointment.userName}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Expert Name:</strong> {appointment.expertName}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Specialization:</strong> {appointment.expertSpecialization}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Date:</strong> {appointment.date}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Time:</strong> {appointment.time}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Contact:</strong> {appointment.notes?.split(',')[0] || 'N/A'}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Status:</strong>{' '}
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                appointment.status === 'scheduled'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : appointment.status === 'completed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;