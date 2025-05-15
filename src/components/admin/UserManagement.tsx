import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { fetchUsers, updateUserRole } from '../../redux/slices/authSlice';
import { toast } from 'react-toastify';

const UserManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: currentUser, users, usersLoading } = useSelector((state: RootState) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  // Can only promote/demote users if you're a superadmin
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const handleUpdateRole = async (uid: string, newRole: 'user' | 'admin') => {
    try {
      // Only allow promoting to admin or demoting to user roles
      // SuperAdmin must be set directly in Firebase
      await dispatch(updateUserRole({ uid, role: newRole }));

      // Show success toast based on the action performed
      if (newRole === 'admin') {
        toast.success("User has been promoted to Admin successfully", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.success("Admin privileges have been removed successfully", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error: any) {
      console.error('Failed to update user role:', error);

      // Show error toast
      toast.error(`Failed to update user role: ${error.message || 'Unknown error'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          User Management
        </h2>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5">
              <svg
                className="h-5 w-5 text-gray-400 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Users table */}
        {usersLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  {isSuperAdmin && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {userItem.photoURL ? (
                          <div className="relative h-10 w-10 mr-3">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={userItem.photoURL}
                              alt={userItem.displayName || 'User'}
                              onError={(e) => {
                                // If image fails to load, replace with initials
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement as HTMLElement;
                                const fallback = parent.querySelector('.fallback-initials');
                                if (fallback) {
                                  fallback.classList.remove('hidden');
                                }
                              }}
                            />
                            {/* Fallback for when image fails to load */}
                            <div className="fallback-initials hidden absolute inset-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                              <span className="text-indigo-800 dark:text-indigo-200 font-medium text-sm">
                                {userItem.displayName?.charAt(0).toUpperCase() || userItem.email?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mr-3">
                            <span className="text-indigo-800 dark:text-indigo-200 font-medium text-sm">
                              {userItem.displayName?.charAt(0).toUpperCase() || userItem.email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {userItem.displayName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Joined: {new Date(userItem.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {userItem.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userItem.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : userItem.role === 'admin'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {userItem.role === 'superadmin'
                          ? 'Super Admin'
                          : userItem.role === 'admin'
                          ? 'Admin'
                          : 'User'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {userItem.uid !== currentUser?.uid && ( // Don't allow changing your own role
                          <div className="flex space-x-2">
                            {userItem.role !== 'admin' && userItem.role !== 'superadmin' && (
                              <button
                                onClick={() => handleUpdateRole(userItem.uid, 'admin')}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                Make Admin
                              </button>
                            )}
                            {userItem.role === 'admin' && (
                              <button
                                onClick={() => handleUpdateRole(userItem.uid, 'user')}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove Admin
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;