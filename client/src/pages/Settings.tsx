import React from 'react';

const Settings = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">System Settings</h1>
            <div className="grid grid-cols-1 gap-6 max-w-2xl">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
                    <div className="flex items-center justify-between py-2 border-b border-gray-700">
                        <span className="text-gray-300">Email Alerts</span>
                        <div className="w-10 h-6 bg-blue-600 rounded-full cursor-pointer relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
