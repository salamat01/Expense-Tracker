import React from 'react';
import CloudOfflineIcon from './icons/CloudOfflineIcon';
import SyncIcon from './icons/SyncIcon';

interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isOnline, isSyncing }) => {
  if (isSyncing) {
    return (
      <div className="relative group flex items-center" title="Syncing offline changes...">
        <SyncIcon />
        <div className="absolute bottom-full right-0 mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Syncing changes...
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="relative group flex items-center" title="You are offline. Changes will be synced later.">
        <CloudOfflineIcon />
        <div className="absolute bottom-full right-0 mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          You are offline
        </div>
      </div>
    );
  }

  return null;
};

export default SyncStatus;
