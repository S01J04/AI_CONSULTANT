import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { setSelectedExpert } from '../../redux/slices/appointmentSlice';
import { Calendar, Clock, Star, Filter, Search } from 'lucide-react';

const ExpertList: React.FC = () => {
  const dispatch = useDispatch();
  const { experts, selectedExpert } = useSelector((state: RootState) => state.appointment);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');

  // Get unique specializations for filter
  const specializations = ['all', ...new Set(experts.map(expert => expert.specialization))];

  // Filter experts based on search and specialization
  const filteredExperts = experts.filter(expert => {
    const matchesSearch = expert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expert.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = selectedSpecialization === 'all' || expert.specialization === selectedSpecialization;
    return matchesSearch && matchesSpecialization;
  });

  const handleExpertSelect = (expertId: string) => {
    dispatch(setSelectedExpert(expertId));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Available Experts</h2>
      
      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search experts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            {specializations.map(spec => (
              <option key={spec} value={spec}>
                {spec === 'all' ? 'All Specializations' : spec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Experts List */}
      <div className="space-y-4">
        {filteredExperts.map((expert) => (
          <div
            key={expert.id}
            className={`p-4 rounded-lg border transition-all duration-200 ${
              selectedExpert?.id === expert.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
            }`}
          >
            <div className="flex items-start space-x-4">
              <img
                src={expert.photoURL}
                alt={expert.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {expert.name}
                  </h3>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm text-gray-600 dark:text-gray-300">
                      {expert.rating}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                  {expert.specialization}
                </p>
                
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {expert.experience} years experience
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    30 min session
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => handleExpertSelect(expert.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedExpert?.id === expert.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {selectedExpert?.id === expert.id ? 'Selected' : 'Select'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpertList;
