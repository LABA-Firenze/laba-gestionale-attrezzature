import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import notificationService from '../utils/notificationService';

// Hook per gestire notifiche in tempo reale
export const useRealtimeNotifications = () => {
  const { api, isAdmin } = useAuth();
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    // Disabilitato per evitare notifiche continue
    return;
    if (!notificationService.isEnabled()) return;

    const checkForNotifications = async () => {
      try {
        if (isAdmin) {
          const requestsResponse = await api.get('/api/richieste?all=1');
          const requests = requestsResponse.data ?? [];
          const newRequests = (requests || []).filter(req =>
            req.stato === 'in_attesa' &&
            new Date(req.created_at).getTime() > lastCheckRef.current
          );
          for (const request of newRequests) {
            await notificationService.notifyNewRequest(request);
          }

          const reportsResponse = await api.get('/api/segnalazioni');
          const reports = reportsResponse.data ?? [];
          const newReports = (reports || []).filter(report =>
            report.stato === 'aperta' &&
            new Date(report.created_at).getTime() > lastCheckRef.current
          );
          for (const report of newReports) {
            await notificationService.notifyNewReport(report);
          }
        } else {
          const requestsResponse = await api.get('/api/richieste/mie');
          const requests = requestsResponse.data ?? [];
          const updatedRequests = (requests || []).filter(req =>
            new Date(req.updated_at || req.created_at).getTime() > lastCheckRef.current
          );
          for (const request of updatedRequests) {
            if (request.stato !== 'in_attesa') {
              await notificationService.notifyRequestStatus(request, request.stato);
            }
          }
        }

        lastCheckRef.current = Date.now();
      } catch (error) {
        console.warn('Errore nel controllo notifiche:', error);
      }
    };

    // Controlla ogni 30 secondi
    intervalRef.current = setInterval(checkForNotifications, 30000);

    // Controlla immediatamente
    checkForNotifications();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [api, isAdmin]);

  return {
    isEnabled: notificationService.isEnabled(),
    permissionStatus: notificationService.getPermissionStatus()
  };
};


