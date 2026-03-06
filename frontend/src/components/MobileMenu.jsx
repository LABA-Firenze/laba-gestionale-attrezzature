import React from 'react';
import { XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const MobileMenu = ({ isOpen, onClose, sidebarItems, activeView, onNavigate, user, logout }) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-40 lg:hidden overflow-hidden transition-opacity duration-300 ease-in-out ${
      isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}
    style={{ display: isOpen ? 'block' : 'none' }}>
      {/* Overlay with smooth fade animation like notifications */}
      <div 
        className={`absolute inset-0 bg-black transition-all duration-300 ease-in-out ${
          isOpen ? 'bg-opacity-50 opacity-100' : 'bg-opacity-0 opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Mobile Menu - Smooth slide from bottom with fade and shadow */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}
      style={{
        filter: isOpen ? 'blur(0px)' : 'blur(2px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                onNavigate('dashboard');
                onClose();
              }}
            >
              <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105"
            >
              <XMarkIcon className="w-6 h-6 transition-transform duration-200 ease-in-out" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="px-6 py-4">
          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center px-4 py-3 rounded-full text-left transition-colors ${
                  activeView === item.id 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center w-10 h-10 mr-3">
                  {item.icon}
                </div>
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        
        {/* User Section */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {(user?.name?.[0] || "?") + (user?.surname?.[0] || "")}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user?.name} {user?.surname}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {(() => {
                  const role = (user?.ruolo || user?.role || '').toLowerCase();
                  if (user?.id === -1 || role === 'admin') return 'Amministratore';
                  if (role === 'supervisor') return 'Supervisore';
                  return 'Utente';
                })()}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
            Esci
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
