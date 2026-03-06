import React, { useState } from 'react';

function NotificationsPanel({ isOpen, onClose, notifications = [], onMarkAsRead, onDelete, onClick }) {
 const unreadCount = notifications.filter(n => !n.isRead).length;

 return (
 <div className={`fixed inset-0 z-[9999] overflow-hidden transition-opacity duration-300 ${
 isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
 }`}>
 <div 
 className={`absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${
 isOpen ? 'opacity-100' : 'opacity-0'
 }`}
 onClick={onClose}
 ></div>
 <div className={`absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-all duration-300 ease-in-out ${
 isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
 }`}>
 <div className="flex flex-col h-full">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-gray-200 ">
 <div className="flex items-center">
 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
 <svg className="w-5 h-5 text-blue-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
 </svg>
 </div>
 <div>
 <h2 className="text-lg font-semibold text-gray-900 ">Notifiche</h2>
 <p className="text-sm text-gray-600 ">{unreadCount} non lette</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-full hover:bg-gray-100 transition-colors"
 >
 <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Notifications List */}
 <div className="flex-1 overflow-y-auto p-4 space-y-3">
 {notifications.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full text-center py-8">
 <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
 <svg className="w-8 h-8 text-gray-400 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
 </svg>
 </div>
 <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna notifica</h3>
 <p className="text-sm text-gray-500 ">Non ci sono notifiche da visualizzare</p>
 </div>
 ) : (
 notifications.map((notification, index) => (
                <div 
                  key={notification.id}
                  onClick={() => onClick && onClick(notification)}
                  className={`p-4 rounded-full border-l-4 transform transition-all duration-300 ease-out cursor-pointer hover:shadow-md ${
                    notification.type === 'password_reset' ? 'border-l-red-500 bg-red-50 hover:bg-red-100' :
                    notification.type === 'inventory' ? 'border-l-green-500 bg-green-50 hover:bg-green-100' :
                    notification.type === 'info' ? 'border-l-blue-500 bg-blue-50 hover:bg-blue-100' :
                    notification.type === 'warning' ? 'border-l-orange-500 bg-orange-50 hover:bg-orange-100' :
                    'border-l-gray-500 bg-gray-50 hover:bg-gray-100'
                  } ${!notification.isRead ? 'ring-2 ring-blue-200 ' : ''} ${
                    isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                  }`}
                  style={{
                    transitionDelay: `${index * 100}ms`
                  }}
                >
 <div className="flex items-start">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  notification.type === 'password_reset' ? 'bg-orange-100 ' :
                  notification.type === 'inventory' ? 'bg-green-100 ' :
                  notification.type === 'info' ? 'bg-blue-100 ' :
                  notification.type === 'warning' ? 'bg-orange-100 ' :
                  'bg-gray-100 '
                }`}>
                  {notification.type === 'password_reset' ? (
                    <svg className="w-4 h-4 text-orange-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : notification.type === 'inventory' ? (
                    <svg className="w-4 h-4 text-green-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  ) : notification.type === 'info' ? (
                    <svg className="w-4 h-4 text-blue-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : notification.type === 'warning' ? (
                    <svg className="w-4 h-4 text-orange-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
 </div>
 <div className="ml-3 flex-1">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-medium text-gray-900 ">{notification.title}</h3>
 <div className="flex items-center space-x-2">
 {!notification.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
 <button 
 onClick={() => onDelete(notification.id)}
 className="p-1 rounded hover:bg-gray-200 transition-colors"
 >
 <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
 </svg>
 </button>
 </div>
 </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message || notification.description}</p>
 <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
 {!notification.isRead && (
 <button 
 onClick={() => onMarkAsRead(notification.id)}
 className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
 >
 Segna come letta
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 );
}

export default NotificationsPanel;