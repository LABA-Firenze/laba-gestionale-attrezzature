import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { TableSkeleton } from './SkeletonLoader';

const Repairs = () => {
 const [repairs, setRepairs] = useState([]);
 const [inventory, setInventory] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [editingRepair, setEditingRepair] = useState(null);
 const [activeTab, setActiveTab] = useState('in_corso');
 const [searchTerm, setSearchTerm] = useState('');
 const [step, setStep] = useState(1); // 1: Oggetto, 2: ID Specifico, 3: Dettagli
 const [selectedObject, setSelectedObject] = useState(null);
 const [selectedUnit, setSelectedUnit] = useState(null);
 const [formData, setFormData] = useState({
 descrizione: '',
 note_tecniche: '',
 priorita: 'media',
 stato: 'in_corso'
 });
 const [availableUnits, setAvailableUnits] = useState([]);
 const [showDetailsModal, setShowDetailsModal] = useState(false);
 const [selectedRepair, setSelectedRepair] = useState(null);
 const { token } = useAuth();

 // Handle object selection
 const handleObjectSelect = (object) => {
   setSelectedObject(object);
   fetchAvailableUnits(object.id);
   setStep(2);
 };

 // Handle unit selection
 const handleUnitSelect = (unit) => {
   setSelectedUnit(unit);
   setStep(3);
 };

 // Get step title
 const getStepTitle = () => {
   switch (step) {
     case 1: return 'Seleziona Oggetto';
     case 2: return 'Seleziona ID Specifico';
     case 3: return 'Dettagli Riparazione';
     default: return 'Nuova Riparazione';
   }
 };

 // Reset modal when opening
 const resetModal = () => {
   setStep(1);
   setSelectedObject(null);
   setSelectedUnit(null);
   setFormData({
     descrizione: '',
     note_tecniche: '',
     priorita: 'media',
     stato: 'in_corso'
   });
   setAvailableUnits([]);
   setError(null);
 };

 // Fetch available units for selected object
 const fetchAvailableUnits = async (objectId) => {
   if (!objectId) {
     setAvailableUnits([]);
     return;
   }
   
   try {
     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${objectId}/units`, {
       headers: { 'Authorization': `Bearer ${token}` }
     });
     
     if (response.ok) {
       const units = await response.json();
       setAvailableUnits(units);
     }
   } catch (err) {
     console.error('Errore caricamento unità:', err);
   }
 };

// Handle repair completion
const handleCompleteRepair = async (repairId) => {
  try {
    // Get current repair data
    const repair = repairs.find(r => r.id === repairId);
    if (!repair) {
      throw new Error('Riparazione non trovata');
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/riparazioni/${repairId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        stato: 'completata'
      })
    });

    if (!response.ok) {
      throw new Error('Errore nel completamento riparazione');
    }

    await fetchData(); // Refresh the list
    setShowDetailsModal(false);
  } catch (err) {
    setError(err.message);
  }
};

// Handle repair cancellation
const handleCancelRepair = async (repairId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/riparazioni/${repairId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ stato: 'annullata' })
    });

    if (!response.ok) throw new Error('Errore nell\'annullamento riparazione');

    await fetchData();
    setShowDetailsModal(false);
  } catch (error) {
    setError(error.message);
  }
};

 // Handle form submission
 const handleSubmit = async (e) => {
 e.preventDefault();
 
 if (!selectedObject || !selectedUnit) {
   setError('Seleziona oggetto e ID specifico');
   return;
 }
 
 try {
 const url = editingRepair ? `/api/riparazioni/${editingRepair.id}` : '/api/riparazioni';
 const method = editingRepair ? 'PUT' : 'POST';

 const submitData = {
   inventario_id: selectedObject.id,
   unit_id: selectedUnit.id,
   descrizione: formData.descrizione,
   note_tecniche: formData.note_tecniche,
   priorita: formData.priorita,
   stato: formData.stato
 };

 const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
 method,
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(submitData)
 });

 if (!response.ok) {
 throw new Error('Errore nel salvataggio');
 }

 await fetchData();
 setShowAddModal(false);
 resetModal();
 } catch (err) {
 setError(err.message);
 }
 };

 // Fetch data
 const fetchData = async () => {
 try {
 setLoading(true);
 const [repairsRes, inventoryRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/riparazioni`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
 ]);

 if (!repairsRes.ok) throw new Error('Errore nel caricamento riparazioni');
 if (!inventoryRes.ok) throw new Error('Errore nel caricamento inventario');

 const [repairsData, inventoryData] = await Promise.all([
 repairsRes.json(),
 inventoryRes.json()
 ]);

 setRepairs(repairsData);
 setInventory(inventoryData);
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 // Filter repairs based on active tab
 const getFilteredRepairs = () => {
 let filtered = repairs;
 
 // Filter by tab
 switch (activeTab) {
 case 'in_corso':
 filtered = repairs.filter(r => r.stato === 'in_corso');
 break;
 case 'completate':
 filtered = repairs.filter(r => r.stato === 'completata');
 break;
 case 'annullate':
 filtered = repairs.filter(r => r.stato === 'annullata');
 break;
 default:
 filtered = repairs;
 }
 
 // Apply search filter
 if (searchTerm) {
 filtered = filtered.filter(repair => 
 repair.articolo_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 repair.note?.toLowerCase().includes(searchTerm.toLowerCase())
 );
 }
 
 return filtered;
 };
 
 const filteredRepairs = getFilteredRepairs();

 // Get status badge
 const getStatusBadge = (status) => {
 const statusConfig = {
 'in_corso': { 
 className: 'alert-warning', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'In Corso' 
 },
 'completata': { 
 className: 'status-available', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Completata' 
 },
 'annullata': { 
 className: 'status-unavailable', 
 icon: (
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 ), 
 label: 'Annullata' 
 }
 };
 
 const config = statusConfig[status] || statusConfig['in_corso'];
 
 return (
 <span className={`status-badge ${config.className}`}>
 {config.icon}
 {config.label}
 </span>
 );
 };

 if (loading) {
 return <TableSkeleton rows={8} cols={6} />;
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="card">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-primary">Gestione Riparazioni</h1>
 <p className="text-secondary mt-1">Gestisci le riparazioni delle attrezzature</p>
 </div>
 <div className="flex items-center">
        <button
          onClick={() => {
            setShowAddModal(true);
            resetModal();
          }}
          className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center"
        >
          <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuova Riparazione</span>
        </button>
 </div>
 </div>
 </div>

    {/* Tabs for Repairs */}
    <div className="border-b border-gray-200">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex space-x-8">
        <button
          onClick={() => setActiveTab('in_corso')}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'in_corso'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          In Corso
          <span className="ml-2 bg-orange-100 text-orange-900 text-xs px-2 py-1 rounded-full">
            {repairs.filter(r => r.stato === 'in_corso').length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('completate')}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'completate'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Completate
          <span className="ml-2 bg-green-100 text-green-900 text-xs px-2 py-1 rounded-full">
            {repairs.filter(r => r.stato === 'completata').length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('annullate')}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'annullate'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Annullate
          <span className="ml-2 bg-red-100 text-red-900 text-xs px-2 py-1 rounded-full">
            {repairs.filter(r => r.stato === 'annullata').length}
          </span>
        </button>
        </nav>
        
        {/* Search - Desktop only */}
        <div className="hidden lg:block mt-4 lg:mt-0">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca riparazioni..."
              className="w-64 px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    {/* Search - Mobile only */}
    <div className="lg:hidden">
      <div className="card">
        <div className="form-group">
          <label className="form-label">Cerca riparazioni</label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca per oggetto o descrizione..."
              className="input-field pl-10"
            />
            <svg className="search-icon icon-sm text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

 {/* Repairs Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {filteredRepairs.length === 0 ? (
 <div className="lg:col-span-2">
 <div className="card text-center py-12">
 <svg className="icon-lg mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 </svg>
 <p className="text-secondary">
 {searchTerm 
 ? 'Nessuna riparazione trovata con i filtri selezionati' 
 : `Nessuna riparazione ${
 activeTab === 'in_corso' ? 'in corso' :
 activeTab === 'completate' ? 'completata' :
 activeTab === 'annullate' ? 'annullata' : ''
 }`
 }
 </p>
 </div>
 </div>
 ) : (
 filteredRepairs.map(repair => (
 <div
 key={repair.id}
 className="card card-clickable"
 onClick={() => {
   setSelectedRepair(repair);
   setShowDetailsModal(true);
 }}
 >
 <div className="flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold text-primary">{repair.articolo_nome}</h3>
 {getStatusBadge(repair.stato)}
 </div>
 
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <span className="text-tertiary">Descrizione:</span>
 <span className="text-primary ml-1 font-medium">
   {(() => {
     if (!repair.note) return 'N/A';
     // Estrai la prima riga come descrizione
     const firstLine = repair.note.split('\n')[0];
     return firstLine || 'N/A';
   })()}
 </span>
 </div>
 <div>
 <span className="text-tertiary">Creata:</span>
 <span className="text-primary ml-1">{new Date(repair.created_at).toLocaleDateString('it-IT')}</span>
 </div>
 {repair.data_inizio && (
 <div>
 <span className="text-tertiary">Inizio:</span>
 <span className="text-primary ml-1">{new Date(repair.data_inizio).toLocaleDateString('it-IT')}</span>
 </div>
 )}
 {repair.data_fine && (
 <div>
 <span className="text-tertiary">Fine:</span>
 <span className="text-primary ml-1">{new Date(repair.data_fine).toLocaleDateString('it-IT')}</span>
 </div>
 )}
 </div>
 
 {repair.descrizione && (
 <p className="text-sm text-tertiary">{repair.descrizione}</p>
 )}

 <div className="flex justify-end items-center">
 {repair.stato === 'in_corso' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleCompleteRepair(repair.id);
 }}
 className="btn-success btn-small"
 >
 <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
 </svg>
 Completa
 </button>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Error Message */}
 {error && (
 <div className="alert-card alert-danger">
 <div className="flex items-center">
 <svg className="icon text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <p className="text-red-800 ">{error}</p>
 </div>
 </div>
 )}

 {/* Add/Edit Repair Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <div>
   <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
   <p className="text-sm text-gray-600 mt-1">Step {step} di 3</p>
 </div>
 <button
 onClick={() => {
   setShowAddModal(false);
   resetModal();
 }}
 className="text-gray-400 hover:text-gray-600 transition-colors"
 >
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <div className="p-6">
          {/* Step 1: Seleziona Oggetto */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seleziona l'oggetto da riparare</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleObjectSelect(item)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.nome}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.stato_effettivo === 'disponibile' ? 'bg-green-100 text-green-800' :
                        item.stato_effettivo === 'non_disponibile' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.stato_effettivo === 'disponibile' ? 'Disponibile' :
                         item.stato_effettivo === 'non_disponibile' ? 'Non Disponibile' :
                         item.stato_effettivo}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Scaffale: {item.posizione || item.scaffale || 'N/A'}</p>
                      <p>Categoria: {item.categoria_nome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Seleziona ID Specifico */}
          {step === 2 && selectedObject && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Seleziona ID Specifico</h3>
                  <p className="text-sm text-gray-600">Oggetto: <strong>{selectedObject.nome}</strong></p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Cambia oggetto
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {availableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="text-center">
                      <div className="font-medium text-gray-900 mb-1">{unit.codice_univoco}</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        unit.stato === 'disponibile' ? 'bg-green-100 text-green-800' :
                        unit.stato === 'prestato' ? 'bg-blue-100 text-blue-800' :
                        unit.stato === 'riservato' ? 'bg-yellow-100 text-yellow-800' :
                        unit.stato === 'in_riparazione' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.stato === 'disponibile' ? 'Disponibile' :
                         unit.stato === 'prestato' ? 'In Prestito' :
                         unit.stato === 'riservato' ? 'Riservato' :
                         unit.stato === 'in_riparazione' ? 'In Riparazione' :
                         unit.stato}
                      </span>
                      {unit.note && (
                        <p className="text-xs text-gray-500 mt-1">{unit.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {availableUnits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessuna unità trovata per questo oggetto</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Dettagli Riparazione */}
          {step === 3 && selectedObject && selectedUnit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Dettagli Riparazione</h3>
                  <p className="text-sm text-gray-600">
                    Oggetto: <strong>{selectedObject.nome}</strong> - ID: <strong>{selectedUnit.codice_univoco}</strong>
                  </p>
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione Problema *
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({...formData, descrizione: e.target.value})}
                  className="input-field"
                  rows="3"
                  placeholder="Descrivi il problema riscontrato"
                  required
                />
              </div>

              {/* Note Tecniche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Tecniche
                </label>
                <textarea
                  value={formData.note_tecniche}
                  onChange={(e) => setFormData({...formData, note_tecniche: e.target.value})}
                  className="input-field"
                  rows="2"
                  placeholder="Note aggiuntive per il tecnico"
                />
              </div>

              {/* Priorità e Stato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorità
                  </label>
                  <select
                    value={formData.priorita}
                    onChange={(e) => setFormData({...formData, priorita: e.target.value})}
                    className="select-field"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stato
                  </label>
                  <select
                    value={formData.stato}
                    onChange={(e) => setFormData({...formData, stato: e.target.value})}
                    className="select-field"
                  >
                    <option value="in_corso">In Corso</option>
                    <option value="completata">Completata</option>
                    <option value="annullata">Annullata</option>
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center space-x-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Indietro
                </button>
                <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRepair ? 'Aggiorna' : 'Crea Riparazione'}
                </button>
                </div>
              </div>
            </form>
          )}
 </div>
 </div>
 </div>
 )}

 {/* Repair Details Modal */}
 {showDetailsModal && selectedRepair && (
   <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
     <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
       <div className="flex items-center justify-between p-6 border-b border-gray-200">
         <h2 className="text-xl font-semibold text-gray-900">Dettagli Riparazione</h2>
         <button
           onClick={() => {
             setShowDetailsModal(false);
             setSelectedRepair(null);
           }}
           className="text-gray-400 hover:text-gray-600 transition-colors"
         >
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
           </svg>
         </button>
       </div>
       
       <div className="p-6">
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700">Oggetto</label>
             <p className="text-lg font-semibold text-gray-900">{selectedRepair.articolo_nome}</p>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700">Stato</label>
             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
               selectedRepair.stato === 'in_corso' ? 'bg-yellow-100 text-yellow-800' :
               selectedRepair.stato === 'completata' ? 'bg-green-100 text-green-800' :
               'bg-gray-100 text-gray-800'
             }`}>
               {selectedRepair.stato === 'in_corso' ? 'In Corso' :
                selectedRepair.stato === 'completata' ? 'Completata' :
                selectedRepair.stato}
             </span>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700">Data Creazione</label>
             <p className="text-gray-900">{new Date(selectedRepair.created_at).toLocaleDateString('it-IT')}</p>
           </div>
           
           {selectedRepair.note && (
             <div>
               <label className="block text-sm font-medium text-gray-700">Dettagli Completi</label>
               <div className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg text-sm">
                 {selectedRepair.note}
               </div>
             </div>
           )}
           
           <div>
             <label className="block text-sm font-medium text-gray-700">Priorità</label>
             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
               selectedRepair.priorita === 'critica' ? 'bg-red-100 text-red-800' :
               selectedRepair.priorita === 'alta' ? 'bg-orange-100 text-orange-800' :
               selectedRepair.priorita === 'media' ? 'bg-yellow-100 text-yellow-800' :
               'bg-green-100 text-green-800'
             }`}>
               {selectedRepair.priorita === 'critica' ? 'Critica' :
                selectedRepair.priorita === 'alta' ? 'Alta' :
                selectedRepair.priorita === 'media' ? 'Media' :
                selectedRepair.priorita === 'bassa' ? 'Bassa' :
                'Media'}
             </span>
           </div>
           
         </div>
       </div>
       
       {/* Action Buttons */}
       {selectedRepair.stato === 'in_corso' && (
         <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
           <button
             onClick={() => handleCancelRepair(selectedRepair.id)}
             className="btn-secondary"
           >
             <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             Annulla
           </button>
           <button
             onClick={() => handleCompleteRepair(selectedRepair.id)}
             className="btn-success"
           >
             <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
             </svg>
             Completa
           </button>
         </div>
       )}
     </div>
   </div>
 )}
 </div>
 );
};

export default Repairs;