import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
 const context = useContext(NotificationContext);
 if (!context) {
 throw new Error('useNotifications must be used within a NotificationProvider');
 }
 return context;
};

export const NotificationProvider = ({ children }) => {
 const [notifications, setNotifications] = useState([]);

 const addNotification = useCallback((notification) => {
 const id = Date.now() + Math.random();
 const newNotification = {
 id,
 type: 'info',
 duration: 5000,
 ...notification
 };

 setNotifications(prev => [...prev, newNotification]);

 // Auto remove after duration
 if (newNotification.duration > 0) {
 setTimeout(() => {
 removeNotification(id);
 }, newNotification.duration);
 }

 return id;
 }, []);

 const removeNotification = useCallback((id) => {
 setNotifications(prev => prev.filter(n => n.id !== id));
 }, []);

 const clearAll = useCallback(() => {
 setNotifications([]);
 }, []);

 // Convenience methods
 const success = useCallback((message, options = {}) => {
 return addNotification({ type: 'success', message, ...options });
 }, [addNotification]);

 const error = useCallback((message, options = {}) => {
 return addNotification({ type: 'error', message, duration: 0, ...options });
 }, [addNotification]);

 const warning = useCallback((message, options = {}) => {
 return addNotification({ type: 'warning', message, ...options });
 }, [addNotification]);

 const info = useCallback((message, options = {}) => {
 return addNotification({ type: 'info', message, ...options });
 }, [addNotification]);

 const value = {
 notifications,
 addNotification,
 removeNotification,
 clearAll,
 success,
 error,
 warning,
 info
 };

 return (
 <NotificationContext.Provider value={value}>
 {children}
 <NotificationContainer />
 </NotificationContext.Provider>
 );
};

const NotificationContainer = () => {
 const { notifications, removeNotification } = useNotifications();

 if (notifications.length === 0) return null;

 return (
 <div className="fixed top-4 right-4 z-50 space-y-2">
 {notifications.map(notification => (
 <NotificationItem
 key={notification.id}
 notification={notification}
 onRemove={removeNotification}
 />
 ))}
 </div>
 );
};

const NotificationItem = ({ notification, onRemove }) => {
 const { id, type, message, title, duration } = notification;

 const getTypeStyles = () => {
 switch (type) {
 case 'success':
 return 'bg-green-50 border-green-200 text-green-800';
 case 'error':
 return 'bg-red-50 border-red-200 text-red-800';
 case 'warning':
 return 'bg-yellow-50 border-yellow-200 text-yellow-800';
 default:
 return 'bg-blue-50 border-blue-200 text-blue-800';
 }
 };

 const getIcon = () => {
 switch (type) {
 case 'success':
 return (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 );
 case 'error':
 return (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 );
 case 'warning':
 return (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
 </svg>
 );
 default:
 return (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 );
 }
 };

 return (
 <div
 className={`max-w-sm w-full shadow-lg rounded-xl border p-4 ${getTypeStyles()} transform transition-all duration-300 ease-in-out`}
 style={{
 animation: 'slideInRight 0.3s ease-out'
 }}
 >
 <div className="flex items-start">
 <div className="flex-shrink-0">
 {getIcon()}
 </div>
 <div className="ml-3 w-0 flex-1">
 {title && (
 <p className="text-sm font-medium">{title}</p>
 )}
 <p className="text-sm">{message}</p>
 </div>
 <div className="ml-4 flex-shrink-0 flex">
 <button
 onClick={() => onRemove(id)}
 className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 </div>
 </div>
 );
};

// CSS Animation
const style = document.createElement('style');
style.textContent = `
 @keyframes slideInRight {
 from {
 transform: translateX(100%);
 opacity: 0;
 }
 to {
 transform: translateX(0);
 opacity: 1;
 }
 }
`;
document.head.appendChild(style);


