import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, NoSymbolIcon, ClockIcon, CheckCircleIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import { TableSkeleton } from './SkeletonLoader';
import PageHeader from './PageHeader';
import SectionTabs, { Tab } from './SectionTabs';

const Penalties = () => {
  const [users, setUsers] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPenalties, setUserPenalties] = useState([]);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState(null);
  const [editStrikes, setEditStrikes] = useState(1);
  const [editMotivo, setEditMotivo] = useState('');
  const { token } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users with penalties
      const usersRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!usersRes.ok) throw new Error('Errore nel caricamento utenti');

      const usersData = await usersRes.json();
      
      // Filter only users with penalties or blocked
      const usersWithPenalties = usersData.filter(user => 
        (user.penalty_strikes && user.penalty_strikes > 0) || user.is_blocked
      );

      setUsers(usersWithPenalties);
      
      // Fetch penalties stats
      const statsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/penalties/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setPenalties(statsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPenalties = async (userId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/penalties/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserPenalties(data.penalties || []);
      }
    } catch (err) {
      console.error('Errore nel caricamento penalità utente:', err);
    }
  };

  const handleDeletePenalty = async (penaltyId) => {
    if (!confirm('Sei sicuro di voler eliminare questa penalità? Gli strike verranno sottratti dal totale.')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/penalties/${penaltyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Errore nell\'eliminazione');
      await fetchData();
      if (selectedUser) await fetchUserPenalties(selectedUser.id);
      setEditingPenalty(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditPenalty = (penalty) => {
    setEditingPenalty(penalty);
    setEditStrikes(penalty.strike_assegnati || 1);
    setEditMotivo(penalty.motivo || '');
  };

  const handleSavePenaltyEdit = async () => {
    if (!editingPenalty) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/penalties/${editingPenalty.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          strike_assegnati: editStrikes,
          motivo: editMotivo || undefined
        })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'aggiornamento');
      }
      await fetchData();
      if (selectedUser) await fetchUserPenalties(selectedUser.id);
      setEditingPenalty(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnblockUser = async (userId, resetStrikes = false) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/penalties/unblock-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, resetStrikes })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nello sblocco utente');
      }

      await fetchData();
      setShowPenaltyModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const openPenaltyModal = async (user) => {
    setSelectedUser(user);
    setShowPenaltyModal(true);
    await fetchUserPenalties(user.id);
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Filter users based on active tab
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.name} ${user.surname} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'blocked') {
      return matchesSearch && user.is_blocked;
    } else if (activeTab === 'with-penalties') {
      return matchesSearch && user.penalty_strikes > 0 && !user.is_blocked;
    }
    return matchesSearch;
  });

  // Calculate stats
  const blockedCount = users.filter(u => u.is_blocked).length;
  const withPenaltiesCount = users.filter(u => u.penalty_strikes > 0 && !u.is_blocked).length;
  const totalPenalties = users.reduce((sum, u) => sum + (u.penalty_strikes || 0), 0);

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 space-y-6">
      <PageHeader
        title="Gestione Penalità"
        subtitle="Visualizza e gestisci le penalità degli utenti"
      />

      <div className="px-4 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Utenti con Penalità</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-500">Totale utenti penalizzati</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center p-2.5">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Utenti Bloccati</p>
                <p className="text-3xl font-bold text-red-900">{blockedCount}</p>
                <p className="text-sm text-gray-500">Bloccati per 3+ strike</p>
              </div>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center p-2.5">
                <NoSymbolIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Strike Totali</p>
                <p className="text-3xl font-bold text-orange-900">{totalPenalties}</p>
                <p className="text-sm text-gray-500">Penalità assegnate</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center p-2.5">
                <ClockIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <SectionTabs
          rightContent={
            <input
              type="text"
              placeholder="Cerca utenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 sm:w-64 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          }
        >
          <Tab isActive={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            Tutti ({users.length})
          </Tab>
          <Tab isActive={activeTab === 'blocked'} onClick={() => setActiveTab('blocked')}>
            Bloccati ({blockedCount})
          </Tab>
          <Tab isActive={activeTab === 'with-penalties'} onClick={() => setActiveTab('with-penalties')}>
            Con Penalità ({withPenaltiesCount})
          </Tab>
        </SectionTabs>

        {/* Users Table - Desktop */}
        <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Strike
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <CheckCircleIcon className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          Nessun utente trovato
                        </h3>
                        <p className="text-gray-500">
                          {activeTab === 'blocked' 
                            ? 'Non ci sono utenti bloccati.' 
                            : activeTab === 'with-penalties'
                              ? 'Non ci sono utenti con penalità.'
                              : 'Non ci sono utenti con penalità nel sistema.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {user.name.charAt(0)}{user.surname.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name} {user.surname}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_blocked ? 'bg-red-100 text-red-800' :
                          user.penalty_strikes >= 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.penalty_strikes || 0} / 3
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {user.is_blocked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            BLOCCATO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ATTIVO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => openPenaltyModal(user)}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                          Dettagli
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Cards - Mobile */}
        <div className="lg:hidden space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun utente trovato</h3>
              <p className="text-gray-500">
                {activeTab === 'blocked' 
                  ? 'Non ci sono utenti bloccati.' 
                  : activeTab === 'with-penalties'
                    ? 'Non ci sono utenti con penalità.'
                    : 'Non ci sono utenti con penalità nel sistema.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => openPenaltyModal(user)}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {user.name.charAt(0)}{user.surname.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name} {user.surname}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_blocked ? 'bg-red-100 text-red-800' :
                      user.penalty_strikes >= 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.penalty_strikes || 0} / 3
                    </span>
                    {user.is_blocked ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">BLOCCATO</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">ATTIVO</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="inline-flex items-center px-3 py-2 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                    Tocca per dettagli
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Penalty Details Modal */}
      {showPenaltyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Dettagli Penalità</h3>
                  <p className="text-sm text-gray-600">{selectedUser.name} {selectedUser.surname}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPenaltyModal(false)}
                className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* User Status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Stato Attuale:</span>
                  <div className="flex items-center gap-2">
                    {selectedUser.penalty_strikes > 0 && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.is_blocked ? 'bg-red-100 text-red-800' :
                        selectedUser.penalty_strikes >= 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedUser.penalty_strikes} Strike
                      </span>
                    )}
                    {selectedUser.is_blocked && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        BLOCCATO
                      </span>
                    )}
                  </div>
                </div>
                {selectedUser.is_blocked && (
                  <p className="text-sm text-gray-600">
                    <strong>Motivo blocco:</strong> {selectedUser.blocked_reason || 'Non specificato'}
                  </p>
                )}
              </div>

              {/* Penalties History */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Storico Penalità</h4>
                {userPenalties.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                    <p className="text-gray-500">Nessuna penalità registrata</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {userPenalties.map((penalty) => (
                      <div key={penalty.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              {penalty.articolo_nome || (penalty.tipo === 'manuale' ? 'Penalità Manuale' : 'Penalità')}
                            </p>
                            <p className="text-sm text-gray-600">{penalty.motivo || 'Nessun motivo specificato'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              penalty.strike_assegnati >= 2 ? 'bg-red-100 text-red-800' :
                              penalty.strike_assegnati === 1 ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {penalty.strike_assegnati} Strike
                            </span>
                            <button
                              onClick={() => handleEditPenalty(penalty)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title="Modifica"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePenalty(penalty.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Elimina"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center justify-between">
                          <span>
                            {penalty.tipo === 'manuale' ? 'Penalità Manuale' : `Ritardo: ${penalty.giorni_ritardo} giorni`}
                          </span>
                          <span>{new Date(penalty.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                        {penalty.created_by_name && (
                          <div className="text-xs text-gray-500 mt-1">
                            Assegnata da: {penalty.created_by_name} {penalty.created_by_surname}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedUser.is_blocked && (
                <div className="bg-red-50 border border-red-200 rounded-full p-4">
                  <h4 className="text-md font-semibold text-red-900 mb-3">Azioni di Sblocco</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleUnblockUser(selectedUser.id, false)}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
                    >
                      Sblocca Utente (Mantieni Strike)
                    </button>
                    <button
                      onClick={() => handleUnblockUser(selectedUser.id, true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                    >
                      Sblocca Utente e Azzera Strike
                    </button>
                  </div>
                  <p className="text-xs text-red-700 mt-2">
                    ⚠️ Dopo lo sblocco, l'utente potrà nuovamente effettuare richieste di noleggio.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowPenaltyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Penalty Modal */}
      {editingPenalty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Modifica penalità</h3>
              <button onClick={() => setEditingPenalty(null)} className="p-2 -m-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Strike assegnati</label>
                <select
                  value={editStrikes}
                  onChange={(e) => setEditStrikes(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                <textarea
                  value={editMotivo}
                  onChange={(e) => setEditMotivo(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Motivo della penalità"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setEditingPenalty(null)}
                className="px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSavePenaltyEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Penalties;
