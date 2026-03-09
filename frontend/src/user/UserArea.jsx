import React, { useState, useEffect } from 'react';
import { Squares2X2Icon, ClockIcon, CubeIcon, ExclamationTriangleIcon, InformationCircleIcon, BellIcon, Bars3Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import UserDashboard from '../components/UserDashboard';
import MyLoans from '../components/MyLoans';
import AvailableItems from '../components/AvailableItems';
import ReportFault from '../components/ReportFault';
import SystemStatus from '../components/SystemStatus.jsx';
import Footer from '../components/Footer';
import MobileMenu from '../components/MobileMenu';
import NotificationsPanel from '../components/NotificationsPanel';
import InstructionsPage from '../components/InstructionsPage';
// UserBadge Component (simplified to avoid overlap)
function UserBadge() {
  const { user, logout, roleLabel } = useAuth();
  if (!user) return null;
  
  const initials = (user.name?.[0] || "?") + (user.surname?.[0] || "");
  
  return (
    <div className="p-4 border-t border-gray-200 user-badge">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-sm">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {user.name} {user.surname}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {roleLabel}
          </p>
        </div>
      </div>
      <button 
        onClick={logout}
        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-all duration-200 ease border border-gray-200"
      >
        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
        Esci
      </button>
    </div>
  );
}

const UserArea = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout } = useAuth();


  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Squares2X2Icon className="icon" /> },
    { id: 'my-loans', label: 'I Miei Prestiti', icon: <ClockIcon className="icon" /> },
    { id: 'available-items', label: 'Articoli Disponibili', icon: <CubeIcon className="icon" /> },
    { id: 'report-fault', label: 'Segnala Guasto', icon: <ExclamationTriangleIcon className="icon" /> },
    { id: 'istruzioni', label: 'Come si usa?', icon: <InformationCircleIcon className="icon" /> }
  ];

  // Navigation to system status removed - only admin can access

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <UserDashboard onOpenNotifications={() => setNotificationsOpen(true)} />;
      case 'my-loans':
        return <MyLoans />;
      case 'available-items':
        return <AvailableItems />;
      case 'report-fault':
        return <ReportFault />;
      case 'istruzioni':
        return <InstructionsPage />;
      default:
        return <UserDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-[100]">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveView('dashboard')}
            >
              <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
            </div>
            <div className="flex items-center space-x-2">
              {/* Notification Bell - sempre in header mobile, a destra accanto all'hamburger */}
              <button
                onClick={() => setNotificationsOpen(true)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors z-[101]"
                type="button"
                aria-label="Notifiche"
              >
                <BellIcon className="w-6 h-6 text-gray-600" />
              </button>
              {/* Hamburger Menu */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ease-in-out hover:scale-105 z-[101]"
                type="button"
              >
                <Bars3Icon className="w-6 h-6 transition-transform duration-200 ease-in-out" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Desktop - Completely hidden on mobile */}
        <div className="sidebar-desktop hidden lg:flex lg:flex-col lg:w-64 bg-white sidebar border-r border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div 
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveView('dashboard')}
            >
              <img src="/logoSito.svg" alt="LABA Logo" className="h-12 w-auto" />
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); }}
                className={`nav-button ${activeView === item.id ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          
          <UserBadge />
        </div>

        {/* Main Content Area with Footer */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 pt-16 lg:pt-0">
            {renderActiveView()}
          </main>
          
          {/* Footer - Hidden when mobile menu is open */}
          {!mobileMenuOpen && <Footer onSystemClick={() => setActiveView('sistema')} />}
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          sidebarItems={sidebarItems}
          activeView={activeView}
          onNavigate={(id) => { setActiveView(id); setMobileMenuOpen(false); }}
          user={user}
          logout={logout}
        />

        {/* Notifications Panel */}
        <NotificationsPanel
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
    </div>
  );
};

export default UserArea;