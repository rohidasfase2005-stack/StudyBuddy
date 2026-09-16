import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { User, Settings as SettingsIcon, Bell, Shield } from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-indigo-600 bg-indigo-50">
            <User className="w-5 h-5 mr-3" /> Profile
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 hover:bg-gray-50">
            <SettingsIcon className="w-5 h-5 mr-3" /> Preferences
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 hover:bg-gray-50">
            <Bell className="w-5 h-5 mr-3" /> Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 hover:bg-gray-50">
            <Shield className="w-5 h-5 mr-3" /> Security
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold border-b pb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border text-gray-900">
                  {user?.name || 'User'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border text-gray-900">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline">Edit Profile</Button>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold border-b pb-4">Account Actions</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Log out of your account on this device.
              </p>
              <Button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white">
                Logout
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;

