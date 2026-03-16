import React from 'react';
import { useServiceUserStore } from '../store/serviceUserStore';

const DebugAuth: React.FC = () => {
  const { serviceUser, sessionKey, isAuthenticated } = useServiceUserStore();
  const sessionStorageKey = sessionStorage.getItem('service_session_key');

  return (
    <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">Debug Authentication State</h3>
      <div className="text-sm space-y-1">
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
        <div><strong>Service User:</strong> {serviceUser ? serviceUser.full_name : 'None'}</div>
        <div><strong>Session Key (Store):</strong> {sessionKey ? 'Present' : 'Missing'}</div>
        <div><strong>Session Key (Storage):</strong> {sessionStorageKey ? 'Present' : 'Missing'}</div>
        <div><strong>Company:</strong> {serviceUser?.company_name || 'None'}</div>
        <div><strong>Service Type:</strong> {serviceUser?.service_type || 'None'}</div>
      </div>
    </div>
  );
};

export default DebugAuth;