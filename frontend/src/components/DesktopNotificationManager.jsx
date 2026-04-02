import React, { useState, useEffect } from 'react';
import notificationService from '../utils/notificationService';

const DesktopNotificationManager = ({ children }) => {
 const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

 useEffect(() => {
 const status = notificationService.getPermissionStatus();

 if (!status.enabled && status.supported) {
 setShowPermissionPrompt(true);
 }

 if (status.supported) {
 notificationService.registerServiceWorker().catch(console.error);
 }
 }, []);

 const handleEnableNotifications = async () => {
 try {
 const granted = await notificationService.requestPermission();
 if (granted) {
 setShowPermissionPrompt(false);

 await notificationService.notifyGeneric(
 'Notifiche Abilitate!',
 'Ora riceverai notifiche per le attività importanti del sistema LABA.',
 'success'
 );
 }
 } catch (error) {
 console.error('Errore nell\'abilitazione delle notifiche:', error);
 alert('Errore nell\'abilitazione delle notifiche: ' + error.message);
 }
 };

 return (
 <>
 {children}
 
 {/* Prompt per abilitare le notifiche */}
 {showPermissionPrompt && (
 <div className="fixed bottom-4 right-4 z-50 max-w-sm">
 <div className="bg-white rounded-xl shadow-lg border p-4">
 <div className="flex items-start">
 <div className="flex-shrink-0">
 <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 1v6h6V1h-6z" />
 </svg>
 </div>
 <div className="ml-3 flex-1">
 <h3 className="text-sm font-medium text-gray-900">
 Abilita Notifiche Desktop
 </h3>
 <p className="text-sm text-gray-500 mt-1">
 Ricevi notifiche per nuove richieste, approvazioni e aggiornamenti importanti.
 </p>
 <div className="mt-3 flex space-x-2">
 <button
 onClick={handleEnableNotifications}
 className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
 >
 Abilita
 </button>
 <button
 onClick={() => setShowPermissionPrompt(false)}
 className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
 >
 Non ora
 </button>
 </div>
 </div>
 <button
 onClick={() => setShowPermissionPrompt(false)}
 className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 </div>
 </div>
 )}

 </>
 );
};

export default DesktopNotificationManager;
