import React from 'react';

const Footer = ({ onSystemClick }) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-3 lg:py-6 sticky bottom-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <img src="/logoSito.svg" alt="LABA Logo" className="h-8 w-auto" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Service Attrezzatura</h3>
              <p className="text-xs text-gray-600">Sistema di gestione inventario e prestiti</p>
            </div>
          </div>
          
          <div className="text-xs text-gray-600 flex flex-col items-end gap-1">
            <a href="https://www.laba.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy e Cookie Policy</a>
            <p>Versione 2.1 (build 2.1)</p>
            <p>© 2026 LABA Firenze</p>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/logoSito.svg" alt="LABA Logo" className="h-6 w-auto" />
            <div className="text-xs text-gray-600">
              <a href="https://www.laba.biz/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">Privacy</a>
              <p className="font-medium">v2.1</p>
              <p>© 2026 LABA</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              console.log('Footer click - onSystemClick:', !!onSystemClick);
              if (onSystemClick) {
                onSystemClick();
              } else {
                // Fallback to events
                const adminSidebar = document.querySelector('.sidebar');
                console.log('Footer click - adminSidebar found:', !!adminSidebar);
                
                if (adminSidebar) {
                  console.log('Dispatching navigateToSystemAdmin event');
                  const event = new CustomEvent('navigateToSystemAdmin');
                  window.dispatchEvent(event);
                } else {
                  console.log('Dispatching navigateToSystem event');
                  const event = new CustomEvent('navigateToSystem');
                  window.dispatchEvent(event);
                }
              }
            }}
            className="flex items-center space-x-1 text-xs text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Sistema</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;