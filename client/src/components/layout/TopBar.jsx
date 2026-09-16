import React, { useState } from 'react';
import { Menu, Search, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TopBar = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/questions?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10">
      <div className="flex items-center flex-1">
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700 focus:outline-none lg:hidden mr-4"
        >
          <Menu size={24} />
        </button>
        
        <h1 className="text-xl font-bold text-gray-900 lg:hidden mr-4">
          StudyBuddy
        </h1>

        <form onSubmit={handleSearch} className="hidden sm:flex max-w-md w-full ml-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center ml-4 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </button>

        {isDropdownOpen && (
          <div className="origin-top-right absolute right-0 top-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-50">
            <div className="py-1">
              <button 
                onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <User size={16} className="mr-3 text-gray-400 group-hover:text-gray-500" />
                Profile
              </button>
              <button 
                onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                className="group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <SettingsIcon size={16} className="mr-3 text-gray-400 group-hover:text-gray-500" />
                Settings
              </button>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setIsDropdownOpen(false); logout(); }}
                className="group flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <LogOut size={16} className="mr-3 text-red-400 group-hover:text-red-500" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
