import { useEffect } from 'react';
import notificationService from '../utils/notificationService';

/**
 * Hook per notifiche in tempo reale.
 * Polling disattivato: lasciare useEffect vuoto evita codice irraggiungibile (CodeQL).
 * Per riattivare: ripristinare interval + checkForNotifications e dipendenze [api, isAdmin].
 */
export const useRealtimeNotifications = () => {
  useEffect(() => {
    // Disabilitato per evitare notifiche continue
  }, []);

  return {
    isEnabled: notificationService.isEnabled(),
    permissionStatus: notificationService.getPermissionStatus()
  };
};


