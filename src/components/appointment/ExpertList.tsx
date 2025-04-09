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
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <User className="h-6 w-6 mr-2 text-indigo-500" />
        Available Consultants
      </h2>
  
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search consultants..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
  
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="appearance-none pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {specializations.map((specialization) => (
              <option key={specialization} value={specialization}>
                {specialization === 'all' ? 'All specializations' : specialization}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
            </svg>
          </div>
        </div>
      </div>
  
      {/* Expert cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
        {filteredExperts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4 col-span-full">No results found</p>
        ) : (
          filteredExperts.map((expert: Expert) => (
            <div
              key={expert.id}
              onClick={() => handleExpertSelect(expert.id)}
              className={`group p-4 rounded-xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                selectedExpert?.id === expert.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {expert.photoURL ? (
                    <img
                      src={expert.photoURL}
                      alt={expert.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=6366F1&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-indigo-200 dark:bg-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-lg font-bold ring-2 ring-indigo-500">
                      {expert.name.charAt(0)}
                    </div>
                  )}
                </div>
  
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{expert.name}</h3>
                    {selectedExpert?.id === expert.id && (
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
  
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">{expert.specialization}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{expert.bio}</p>
  
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {expert.experience} yrs
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-500" />
                      {expert.rating}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {expert.availability?.length || 0} slots
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
  
};

export default ExpertList;
