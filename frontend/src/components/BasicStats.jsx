import React, { useState, useEffect } from 'react';
import { CubeIcon, UsersIcon, ClipboardDocumentListIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';

const BasicStats = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUsers: 0,
    totalRequests: 0,
    totalLoans: 0
  });
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchBasicStats();
  }, []);

  const fetchBasicStats = async () => {
    try {
      setLoading(true);
      const [inventoryRes, usersRes, requestsRes, loansRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste?all=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/prestiti?all=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [inventory, users, requests, loans] = await Promise.all([
        inventoryRes.json(),
        usersRes.json(),
        requestsRes.json(),
        loansRes.json()
      ]);

      const activeLoans = loans.filter(l => l.stato === 'attivo').length;
      setStats({
        totalItems: inventory.length,
        totalUsers: users.length,
        totalRequests: requests.length,
        totalLoans: activeLoans
      });
    } catch (error) {
      console.error('Error fetching basic stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    { title: 'Totale Articoli', value: stats.totalItems, icon: CubeIcon, bg: 'bg-blue-100', text: 'text-blue-600' },
    { title: 'Utenti Registrati', value: stats.totalUsers, icon: UsersIcon, bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { title: 'Richieste Totali', value: stats.totalRequests, icon: ClipboardDocumentListIcon, bg: 'bg-amber-100', text: 'text-amber-600' },
    { title: 'Prestiti Attivi', value: stats.totalLoans, icon: ArrowsRightLeftIcon, bg: 'bg-violet-100', text: 'text-violet-600' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Panoramica</h2>
        <button
          onClick={fetchBasicStats}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
        >
          Aggiorna
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center p-2.5`}>
                  <Icon className={`w-6 h-6 ${stat.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BasicStats;

