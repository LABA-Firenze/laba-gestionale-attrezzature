import React, { createContext, useContext } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';

const NotificationPanelContext = createContext(null);

export function NotificationPanelProvider({ children, openNotifications, unreadCount = 0 }) {
  return (
    <NotificationPanelContext.Provider value={{ openNotifications, unreadCount }}>
      {children}
    </NotificationPanelContext.Provider>
  );
}

export function useNotificationPanel() {
  const ctx = useContext(NotificationPanelContext);
  return ctx;
}

export function NotificationBell({ className = '' }) {
  const ctx = useNotificationPanel();
  if (!ctx) return null;
  const { openNotifications, unreadCount } = ctx;
  return (
    <button
      onClick={openNotifications}
      className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
      type="button"
      aria-label="Notifiche"
    >
      <BellIcon className="w-6 h-6 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
