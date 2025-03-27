import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { setSelectedExpert, Expert } from '../../redux/slices/appointmentSlice';
import { Search, Filter, User, Star, Clock, Calendar } from 'lucide-react';

interface AppointmentStateWithExperts {
  experts?: Expert[];
  selectedExpert?: Expert | null;
  loading: boolean;
  error: string | null;
}

const ExpertList: React.FC = () => {
  const dispatch = useDispatch();
  const { experts = [], selectedExpert, loading } = useSelector<RootState, AppointmentStateWithExperts>((state: RootState) => state.appointment);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');

  // Get unique specializations for filter - safely handle experts being undefined
  const specializations = ['all', ...new Set(experts?.map((expert: Expert) => expert.specialization) || [])];

  // Filter experts based on search and specialization - safely handle experts being undefined
  const filteredExperts = experts?.filter((expert: Expert) => {
    const matchesSearch = expert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expert.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = selectedSpecialization === 'all' || expert.specialization === selectedSpecialization;
    return matchesSearch && matchesSpecialization;
  }) || [];

  const handleExpertSelect = (expertId: string) => {
    dispatch(setSelectedExpert(expertId));
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <User className="h-5 w-5 mr-2 text-indigo-500" />
          Available Consultants
        </h2>
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  // No experts state
  if (!experts || experts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <User className="h-5 w-5 mr-2 text-indigo-500" />
          Available Consultants
        </h2>
        <div className="text-center p-4">
          <p className="text-gray-600 dark:text-gray-400">No consultants available at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
        <User className="h-5 w-5 mr-2 text-indigo-500" />
        Available Consultants
      </h2>
      
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search consultants..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="appearance-none pl-9 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {specializations.map((specialization) => (
              <option key={specialization} value={specialization}>
                {specialization === 'all' ? 'All specializations' : specialization}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Expert cards */}
      <div className="space-y-2">
        {filteredExperts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">No results found</p>
        ) : (
          filteredExperts.map((expert: Expert) => (
            <div
              key={expert.id}
              onClick={() => handleExpertSelect(expert.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedExpert?.id === expert.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Expert photo */}
                <div className="flex-shrink-0">
                  {expert.photoURL ? (
                    <img
                      src={expert.photoURL}
                      alt={expert.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=6366F1&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg">
                      {expert.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* Expert details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{expert.name}</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{expert.specialization}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-1">
                    {/* Experience */}
                    <div className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{expert.experience} years</span>
                    </div>
                    
                    {/* Rating */}
                    <div className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Star className="h-3 w-3 mr-1 text-yellow-500" />
                      <span>{expert.rating}</span>
                    </div>
                    
                    {/* Availability count */}
                    <div className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{expert.availability?.length || 0} days</span>
                    </div>
                  </div>
                </div>
                
                {/* Selection indicator */}
                {selectedExpert?.id === expert.id && (
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpertList;
