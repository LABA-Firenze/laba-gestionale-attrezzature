import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import PageHeader from './PageHeader';

const SystemStatus = () => {
  const [systemData, setSystemData] = useState({
    overall: 'healthy',
    services: {
      database: { status: 'healthy', responseTime: 0, uptime: '99.9%' },
      api: { status: 'healthy', responseTime: 0, uptime: '99.8%' },
      auth: { status: 'healthy', responseTime: 0, uptime: '99.9%' }
    },
    metrics: {
      totalRequests: 0,
      activeUsers: 0,
      totalInventory: 0,
      activeLoans: 0
    },
    apiEndpoints: [],
    recentIncidents: []
  });

  const [expandedSections, setExpandedSections] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token, isAdmin } = useAuth();

  // Controllo accesso admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600 mb-4">
            Questa sezione è riservata agli amministratori.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            Torna alla Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Carica dati reali del sistema
  const fetchSystemStatus = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Carica stato sistema
      const statusRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/stats/system-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemData(prev => ({
          ...prev,
          overall: statusData.overall,
          services: statusData.services,
          metrics: statusData.metrics
        }));
      }

      // Testa endpoint API reali
      const endpoints = [
        { name: '/api/auth/login', method: 'POST', url: '/api/auth/login' },
        { name: '/api/inventario', method: 'GET', url: '/api/inventario' },
        { name: '/api/prestiti', method: 'GET', url: '/api/prestiti?all=1' },
        { name: '/api/richieste', method: 'GET', url: '/api/richieste?all=1' },
        { name: '/api/segnalazioni', method: 'GET', url: '/api/segnalazioni' },
        { name: '/api/stats', method: 'GET', url: '/api/stats' }
      ];

      const endpointTests = await Promise.all(
        endpoints.map(async (endpoint) => {
          const startTime = Date.now();
          try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${endpoint.url}`, {
              method: endpoint.method === 'POST' ? 'POST' : 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
              signal: AbortSignal.timeout(5000) // 5 secondi timeout
            });
            const responseTime = Date.now() - startTime;
            return {
              endpoint: endpoint.name,
              method: endpoint.method,
              status: response.ok ? 'healthy' : 'error',
              responseTime: responseTime
            };
          } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
              endpoint: endpoint.name,
              method: endpoint.method,
              status: 'error',
              responseTime: responseTime
            };
          }
        })
      );

      setSystemData(prev => ({
        ...prev,
        apiEndpoints: endpointTests
      }));

      setLoading(false);
    } catch (error) {
      console.error('Errore caricamento stato sistema:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAdmin) {
      fetchSystemStatus();
      // Aggiorna ogni 30 secondi
      const interval = setInterval(fetchSystemStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [token, isAdmin]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchSystemStatus();
    setIsRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100';
      case 'warning': return 'bg-yellow-100';
      case 'error': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getPulseAnimation = (status) => {
    if (status === 'error') return 'animate-pulse';
    if (status === 'warning') return 'animate-ping';
    return '';
  };

  const getSonarEffect = (status) => {
    if (status === 'error') {
      return (
        <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></div>
      );
    }
    if (status === 'warning') {
      return (
        <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-pulse opacity-50"></div>
      );
    }
    return null;
  };

  if (loading && systemData.metrics.totalRequests === 0 && systemData.metrics.activeUsers === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento stato del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={systemData.overall === 'healthy' ? 'Sistema Online' : 'Sistema con Avvisi'}
          subtitle="Monitoraggio in tempo reale dello stato del sistema"
          meta={
            <span className="flex items-center gap-4">
              <span>Build: 498</span>
              <span>•</span>
              <span>Versione: 2.1</span>
              <span>•</span>
              <span>Ultimo aggiornamento: {new Date().toLocaleTimeString('it-IT')}</span>
            </span>
          }
          action={
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="btn-primary hover-lift flex items-center space-x-2 disabled:opacity-50"
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? 'Aggiornamento...' : 'Aggiorna'}</span>
            </button>
          }
        />

        {/* Overall Status */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Stato Generale</h2>
            <div className="flex items-center space-x-3">
              <div className={`relative w-4 h-4 rounded-full ${getStatusBg(systemData.overall)} ${getPulseAnimation(systemData.overall)}`}>
                <div className={`w-full h-full rounded-full ${systemData.overall === 'healthy' ? 'bg-green-500' : systemData.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                {getSonarEffect(systemData.overall)}
              </div>
              <span className={`text-lg font-semibold ${getStatusColor(systemData.overall)}`}>
                {systemData.overall === 'healthy' ? 'Tutto Operativo' : 
                 systemData.overall === 'warning' ? 'Attenzione' : 'Problemi Rilevati'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{systemData.metrics.totalRequests.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Richieste in Attesa</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{systemData.metrics.activeUsers}</div>
              <div className="text-sm text-gray-600">Utenti Attivi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">{systemData.metrics.totalInventory}</div>
              <div className="text-sm text-gray-600">Elementi Inventario</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">{systemData.metrics.activeLoans}</div>
              <div className="text-sm text-gray-600">Prestiti Attivi</div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Services List */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Servizi</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.entries(systemData.services).map(([service, data]) => (
                <div key={service} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`relative w-3 h-3 rounded-full ${getStatusBg(data.status)} ${getPulseAnimation(data.status)}`}>
                        <div className={`w-full h-full rounded-full ${data.status === 'healthy' ? 'bg-green-500' : data.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        {getSonarEffect(data.status)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 capitalize">{service}</h4>
                        <p className="text-sm text-gray-600">Uptime: {data.uptime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(data.status)}`}>
                        {data.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">Response Time</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Incidenti Recenti</h3>
            </div>
            <div className="p-6">
              {systemData.recentIncidents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Nessun incidente rilevato</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {systemData.recentIncidents.map((incident) => (
                    <div key={incident.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-full">
                      <div className={`w-2 h-2 rounded-full mt-2 ${incident.severity === 'error' ? 'bg-red-500' : 'bg-yellow-500'} ${getPulseAnimation(incident.severity)}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{incident.service}</h4>
                          <span className="text-xs text-gray-500">{incident.time}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{incident.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => toggleSection('metrics')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-xl font-bold text-gray-900">Metriche Dettagliate</h3>
              <svg className={`w-6 h-6 text-gray-500 transition-transform ${expandedSections.metrics ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {expandedSections.metrics && (
            <div className="p-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Requests */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-full p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Richieste Totali</h4>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{systemData.metrics.totalRequests}</div>
                  <p className="text-sm text-gray-600 mt-2">Richieste in attesa</p>
                </div>

                {/* Active Users */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-full p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Utenti Attivi</h4>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{systemData.metrics.activeUsers}</div>
                  <p className="text-sm text-gray-600 mt-2">Utenti registrati</p>
                </div>

                {/* Total Inventory */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-full p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Inventario</h4>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{systemData.metrics.totalInventory}</div>
                  <p className="text-sm text-gray-600 mt-2">Elementi totali</p>
                </div>

                {/* Active Loans */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-full p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Prestiti Attivi</h4>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{systemData.metrics.activeLoans}</div>
                  <p className="text-sm text-gray-600 mt-2">Prestiti in corso</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API Endpoints Status */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 mt-8">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => toggleSection('api')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-xl font-bold text-gray-900">Stato API Endpoints</h3>
              <svg className={`w-6 h-6 text-gray-500 transition-transform ${expandedSections.api ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {expandedSections.api && (
            <div className="p-6 border-t border-gray-200">
              <div className="space-y-4">
                {loading && systemData.apiEndpoints.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Caricamento endpoint...</p>
                  </div>
                ) : systemData.apiEndpoints.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nessun endpoint testato
                  </div>
                ) : (
                  systemData.apiEndpoints.map((api, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-full">
                    <div className="flex items-center space-x-4">
                      <div className={`relative w-3 h-3 rounded-full ${getStatusBg(api.status)} ${getPulseAnimation(api.status)}`}>
                        <div className={`w-full h-full rounded-full ${api.status === 'healthy' ? 'bg-green-500' : api.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        {getSonarEffect(api.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${api.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {api.method}
                          </span>
                          <span className="font-mono text-sm text-gray-900">{api.endpoint}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(api.status)}`}>
                        {api.responseTime}ms
                      </div>
                      <div className="text-xs text-gray-500">Response Time</div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Email Test Section */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 mt-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Test Configurazione Email</h3>
            <p className="text-sm text-gray-600 mt-2">Testa la connessione SMTP e invia email di prova</p>
          </div>
          
          <div className="p-6">
            <EmailTestSection token={token} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente per test email
const EmailTestSection = ({ token }) => {
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    
    // Timeout di 30 secondi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/debug/test-email`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        setResult({ success: false, error: errorData.error || `Errore ${response.status}`, data: errorData });
        return;
      }
      
      const data = await response.json();
      setResult({ success: true, data });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        setResult({ success: false, error: 'Timeout: la richiesta ha impiegato troppo tempo (oltre 30 secondi)' });
      } else {
        setResult({ success: false, error: error.message || 'Errore di connessione' });
      }
    } finally {
      setTesting(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, error: 'Inserisci un indirizzo email valido' });
      return;
    }

    setTesting(true);
    setResult(null);
    
    // Timeout di 60 secondi per l'invio email
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/debug/send-test-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to: testEmail }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        setResult({ success: false, error: errorData.error || `Errore ${response.status}`, data: errorData });
        return;
      }
      
      const data = await response.json();
      setResult({ success: true, data });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        setResult({ success: false, error: 'Timeout: l\'invio email ha impiegato troppo tempo (oltre 60 secondi)' });
      } else {
        setResult({ success: false, error: error.message || 'Errore di connessione' });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? 'Test in corso...' : 'Test Connessione SMTP'}
        </button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Invia Email di Test
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="tua-email@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendTestEmail}
            disabled={testing || !testEmail}
            className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Invio...' : 'Invia Test'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`mt-4 p-4 rounded-full ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.success ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h4 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Successo!' : 'Errore'}
              </h4>
              <div className="mt-2 text-sm">
                {result.data && (
                  <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
                {result.error && (
                  <p className="text-red-700">{result.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
