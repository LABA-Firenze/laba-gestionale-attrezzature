import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const NotificationManager = () => {
 const [permission, setPermission] = useState(Notification.permission);
 const isSupported = 'Notification' in window;
 const { isAdmin } = useAuth();

 useEffect(() => {
 if (!isSupported) return;

 // Richiedi permessi per le notifiche
 if (permission === 'default') {
 requestNotificationPermission();
 }

 // Ascolta eventi personalizzati per le notifiche
 const handleNotificationEvent = (event) => {
 const { type, data } = event.detail;
 showNotification(type, data);
 };

 window.addEventListener('showNotification', handleNotificationEvent);
 return () => window.removeEventListener('showNotification', handleNotificationEvent);
 }, [permission, isSupported]);

 const requestNotificationPermission = async () => {
 try {
 const result = await Notification.requestPermission();
 setPermission(result);
 
 if (result === 'granted') {
 showNotification('success', {
 title: 'Notifiche Attivate!',
 body: 'Riceverai notifiche per eventi importanti del sistema.',
 icon: '/favicon.ico'
 });
 }
 } catch (error) {
 console.error('Errore richiesta permessi notifiche:', error);
 }
 };

 const showNotification = (type, data) => {
 if (permission !== 'granted') return;

 const notificationConfig = {
 body: data.body,
 icon: data.icon || '/favicon.ico',
 badge: '/favicon.ico',
 tag: data.tag || 'laba-notification',
 requireInteraction: data.requireInteraction || false,
 silent: false,
 vibrate: [200, 100, 200],
 actions: data.actions || [],
 data: data.data || {}
 };

 // Aggiungi colori in base al tipo
 switch (type) {
 case 'success':
 notificationConfig.icon = '/favicon.ico';
 break;
 case 'error':
 notificationConfig.icon = '/favicon.ico';
 break;
 case 'warning':
 notificationConfig.icon = '/favicon.ico';
 break;
 case 'info':
 notificationConfig.icon = '/favicon.ico';
 break;
 }

 try {
 const notification = new Notification(data.title, notificationConfig);
 
 // Gestisci click sulla notifica
 notification.onclick = () => {
 window.focus();
 if (data.onClick) {
 data.onClick();
 }
 notification.close();
 };

 // Auto-close dopo 5 secondi (tranne per notifiche importanti)
 if (!data.requireInteraction) {
 setTimeout(() => {
 notification.close();
 }, 5000);
 }
 } catch (error) {
 console.error('Errore creazione notifica:', error);
 }
 };

 // Funzioni di utilità per inviare notifiche
 const notifySuccess = (title, body, options = {}) => {
 window.dispatchEvent(new CustomEvent('showNotification', {
 detail: {
 type: 'success',
 data: { title, body, ...options }
 }
 }));
 };

 const notifyError = (title, body, options = {}) => {
 window.dispatchEvent(new CustomEvent('showNotification', {
 detail: {
 type: 'error',
 data: { title, body, ...options }
 }
 }));
 };

 const notifyWarning = (title, body, options = {}) => {
 window.dispatchEvent(new CustomEvent('showNotification', {
 detail: {
 type: 'warning',
 data: { title, body, ...options }
 }
 }));
 };

 const notifyInfo = (title, body, options = {}) => {
 window.dispatchEvent(new CustomEvent('showNotification', {
 detail: {
 type: 'info',
 data: { title, body, ...options }
 }
 }));
 };

 // Esponi le funzioni globalmente per uso in altri componenti
 useEffect(() => {
 window.notifySuccess = notifySuccess;
 window.notifyError = notifyError;
 window.notifyWarning = notifyWarning;
 window.notifyInfo = notifyInfo;
 }, []);

 // Notifiche specifiche per admin
 useEffect(() => {
 if (!isAdmin || permission !== 'granted') return;

 // Simula notifiche per eventi admin
 const adminNotifications = [
 {
 type: 'info',
 title: 'Nuova Richiesta Password',
 body: 'Un utente ha richiesto il reset della password',
 requireInteraction: true,
 onClick: () => {
 // Naviga alla sezione utenti
 window.location.hash = '#utenti';
 }
 },
 {
 type: 'error',
 title: 'Prestito Scaduto',
 body: 'Un prestito è scaduto e deve essere restituito',
 requireInteraction: true
 }
 ];

 // Simula notifiche periodiche (solo per demo)
 const interval = setInterval(() => {
 const randomNotification = adminNotifications[Math.floor(Math.random() * adminNotifications.length)];
 showNotification(randomNotification.type, randomNotification);
 }, 30000); // Ogni 30 secondi per demo

 return () => clearInterval(interval);
 }, [isAdmin, permission]);

 // Notifiche specifiche per utenti
 useEffect(() => {
 if (isAdmin || permission !== 'granted') return;

 const userNotifications = [
 {
 type: 'success',
 title: 'Prestito Approvato',
 body: 'La tua richiesta di prestito è stata approvata',
 requireInteraction: false
 },
 {
 type: 'info',
 title: 'Password Resettata',
 body: 'La tua password è stata resettata dall\'amministratore',
 requireInteraction: true
 },
 {
 type: 'warning',
 title: 'Prestito in Scadenza',
 body: 'Il tuo prestito scadrà tra 2 giorni',
 requireInteraction: false
 }
 ];

 // Simula notifiche per utenti (solo per demo)
 const interval = setInterval(() => {
 const randomNotification = userNotifications[Math.floor(Math.random() * userNotifications.length)];
 showNotification(randomNotification.type, randomNotification);
 }, 45000); // Ogni 45 secondi per demo

 return () => clearInterval(interval);
 }, [isAdmin, permission]);

 if (!isSupported) {
 return null;
 }

 return (
 <div className="fixed bottom-4 right-4 z-50">
 {permission === 'default' && (
 <button
 onClick={requestNotificationPermission}
 className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
 >
 Attiva Notifiche
 </button>
 )}
 {permission === 'denied' && (
 <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full shadow-lg">
 Notifiche bloccate dal browser
 </div>
 )}
 </div>
 );
};

export default NotificationManager;



