import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationCircleIcon, SquaresPlusIcon, ArrowLeftIcon, ArrowRightIcon, ListBulletIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import WeekdayDateInput from './WeekdayDateInput';

const NewRequestModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Oggetto, 2: ID Univoco, 3: Tipo Utilizzo, 4: Date e Note
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  // Primo giorno utile = domani, ma mai sabato/domenica (se sabato → lunedì)
  const getMinStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  };
  const [dateRange, setDateRange] = useState({
    dal: (() => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6) { d.setDate(d.getDate() + 1); } return d.toISOString().split('T')[0]; })(),
    al: ''
  });
  const [note, setNote] = useState('');
  const [tipoUtilizzo, setTipoUtilizzo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { token, user } = useAuth();

  // Parsing YYYY-MM-DD in timezone locale (evita bug sabato/domenica)
  const getDayOfWeekLocal = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return -1;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  };
  // Funzione per slittare la domenica a lunedì
  const skipSunday = (dateStr) => {
    if (!dateStr) return dateStr;
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = domenica, 1 = lunedì, ..., 6 = sabato
    
    if (dayOfWeek === 0) { // Domenica
      // Slitta a lunedì
      date.setDate(date.getDate() + 1);
    }
    
    return date.toISOString().split('T')[0]; // Ritorna in formato YYYY-MM-DD
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      
      // Reset common state
      setSelectedUnit(null);
      setDateRange({
        dal: getMinStartDate(),
        al: ''
      });
      setNote('');
      setTipoUtilizzo('');
      setSearchTerm('');
      setError(null);
      
      // Se selectedItem è passato, saltare lo step 1 e andare direttamente allo step 2
      if (selectedItem) {
        setSelectedObject(selectedItem);
        setAvailableUnits([]); // Reset prima di caricare nuove unità
        fetchAvailableUnits(selectedItem.id);
        setStep(2);
      } else {
        // Reset all data when opening without selectedItem
        setStep(1);
        setSelectedObject(null);
        setAvailableUnits([]);
      }
    }
  }, [isOpen, selectedItem]);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Group items by name and show only items with available units
        const groupedInventory = data.reduce((acc, item) => {
          const existingItem = acc.find(group => group.nome === item.nome);
          if (existingItem) {
            existingItem.unita_disponibili += item.unita_disponibili || 0;
          } else if (item.unita_disponibili > 0) {
            acc.push({
              ...item,
              unita_disponibili: item.unita_disponibili || 0
            });
          }
          return acc;
        }, []);
        setInventory(groupedInventory);
      }
    } catch (err) {
      console.error('Errore caricamento inventario:', err);
    }
  };

  const fetchAvailableUnits = async (inventoryId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/${inventoryId}/disponibili`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data);
      } else {
        setAvailableUnits([]);
      }
    } catch (err) {
      console.error('Errore caricamento unità:', err);
      setAvailableUnits([]);
    }
  };

  const handleObjectSelect = (item) => {
    setSelectedObject(item);
    fetchAvailableUnits(item.id);
    setStep(2);
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    
    // Se l'oggetto è "entrambi", vai al step 3 (scelta tipo), altrimenti vai direttamente al step 4 (date)
    if (selectedObject.tipo_prestito === 'entrambi') {
      console.log('✅ Andando al Step 3 (scelta tipo)');
      setStep(3);
    } else {
      console.log('✅ Andando al Step 4 (date)');
      setStep(4);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validazione date frontend
    const dataInizio = new Date(dateRange.dal);
    let dataFine;
    
    if (selectedObject.tipo_prestito === 'solo_interno') {
      dataFine = new Date(dateRange.dal); // Stesso giorno per uso interno
    } else if (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno') {
      dataFine = new Date(dateRange.dal); // Stesso giorno se scelto interno
    } else {
      dataFine = new Date(dateRange.al); // Data normale per esterno
    }
    
    const domani = new Date();
    domani.setDate(domani.getDate() + 1);
    domani.setHours(0, 0, 0, 0);

    if (dataInizio < domani) {
      setError('Il noleggio può iniziare al più presto dal giorno successivo');
      setLoading(false);
      return;
    }
    const dayInizio = getDayOfWeekLocal(dateRange.dal);
    if (dayInizio === 0 || dayInizio === 6) {
      setError('Sabato e domenica non sono validi per iniziare un prestito. Solo giorni feriali (lun-ven).');
      setLoading(false);
      return;
    }

    if (dataFine < dataInizio) {
      setError('La data di fine deve essere successiva alla data di inizio');
      setLoading(false);
      return;
    }

    // Validazione speciale per uso interno
    if (selectedObject.tipo_prestito === 'solo_interno' || 
        (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) {
      const dataInizioDay = dataInizio.toDateString();
      const dataFineDay = dataFine.toDateString();
      
      if (dataInizioDay !== dataFineDay) {
        setError('Per utilizzo interno, la data di fine deve essere lo stesso giorno della data di inizio');
        setLoading(false);
        return;
      }
    } else {
      // Validazione limite massimo 3 giorni per prestiti esterni
      // Calcola la durata in giorni: dal giorno di inizio al giorno di fine (inclusi)
      // Es: dal 22 al 24 = 3 giorni (22, 23, 24)
      const diffTime = dataFine.getTime() - dataInizio.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere il giorno di inizio
      
      // Gestione speciale per slittamento domenica -> lunedì
      // Se la data di fine è lunedì e il giorno precedente era domenica, 
      // e la durata originale fino alla domenica era 3 giorni, allora è valido (4 giorni totali)
      const fineDayOfWeek = dataFine.getDay(); // 0 = domenica, 1 = lunedì
      let isValidDuration = diffDays <= 3;
      
      if (fineDayOfWeek === 1) { // Lunedì
        const previousDay = new Date(dataFine);
        previousDay.setDate(previousDay.getDate() - 1);
        const previousDayOfWeek = previousDay.getDay();
        
        if (previousDayOfWeek === 0) { // Se il giorno precedente era domenica
          // Calcola la durata originale fino alla domenica (il 3° giorno)
          const durataOriginale = Math.floor((previousDay.getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          // Se la durata originale era 3 giorni (es. Ven->Dom) e la fine è lunedì, è valido
          if (durataOriginale === 3 && diffDays === 4) {
            isValidDuration = true;
          }
        }
      }
      
      if (!isValidDuration) {
        setError('Il prestito massimo consentito è di 3 giorni dalla data di inizio (o 4 se include domenica)');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/richieste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          unit_id: selectedUnit.id,
          dal: dateRange.dal,
          al: dataFine.toISOString().split('T')[0],
          note: note,
          tipo_utilizzo: selectedObject.tipo_prestito === 'entrambi' ? tipoUtilizzo : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle user blocked error specially
        if (errorData.blocked) {
          setError(
            <div className="space-y-2">
              <div className="flex items-center">
                <ExclamationCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                <span className="font-semibold text-red-800">Account Bloccato</span>
              </div>
              <p className="text-red-700">{errorData.message}</p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                <p className="text-sm text-red-800">
                  <strong>Motivo:</strong> {errorData.reason}
                </p>
                <p className="text-sm text-red-800 mt-1">
                  <strong>Penalità accumulate:</strong> {errorData.strikes} strike
                </p>
                <p className="text-sm text-red-700 mt-2 font-medium">
                  {errorData.helpMessage}
                </p>
              </div>
            </div>
          );
        } else {
          throw new Error(errorData.error || 'Errore nella creazione della richiesta');
        }
        return;
      }

      // Show success notification
      window.dispatchEvent(new CustomEvent('showNotification', {
        detail: {
          type: 'success',
          data: { 
            title: 'Richiesta inviata con successo!', 
            body: 'La tua richiesta è stata inviata e sarà valutata dagli amministratori.',
            icon: '/favicon.ico'
          }
        }
      }));

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dal' || name === 'al') {
      setDateRange(prev => {
        const newValue = value;
        const newRange = { ...prev, [name]: newValue };
        
        // Validazione per data fine: max 3 giorni dalla data di inizio (o 4 se il 3° giorno è domenica)
        if (name === 'al' && newRange.dal) {
          const startDate = new Date(newRange.dal);
          const selectedEndDate = new Date(value);
          
          // Calcola la durata in giorni (inclusi inizio e fine)
          const diffTime = selectedEndDate.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere il giorno di inizio
          
          // Calcola la data massima (3 giorni dalla data di inizio)
          const maxDate = new Date(startDate);
          maxDate.setDate(maxDate.getDate() + 2); // +2 perché includiamo inizio e fine (es: 22->24 = 3 giorni)
          
          // Se il 3° giorno (maxDate) è domenica, il max diventa lunedì (4 giorni totali)
          if (maxDate.getDay() === 0) { // Domenica
            maxDate.setDate(maxDate.getDate() + 1); // Slitta a lunedì
          }
          
          const maxDateStr = maxDate.toISOString().split('T')[0];
          
          // Validazione: controlla se la durata è valida
          let isValidDuration = diffDays <= 3;
          
          // Gestione speciale per slittamento domenica -> lunedì
          const selectedDayOfWeek = selectedEndDate.getDay();
          if (selectedDayOfWeek === 1) { // Lunedì
            const previousDay = new Date(selectedEndDate);
            previousDay.setDate(previousDay.getDate() - 1);
            const previousDayOfWeek = previousDay.getDay();
            
            if (previousDayOfWeek === 0) { // Se il giorno precedente era domenica
              // Calcola la durata originale fino alla domenica (il 3° giorno)
              const durataOriginale = Math.floor((previousDay.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              
              // Se la durata originale era 3 giorni e la fine è lunedì, è valido (4 giorni totali)
              if (durataOriginale === 3 && diffDays === 4) {
                isValidDuration = true;
              }
            }
          }
          
          if (!isValidDuration || value > maxDateStr) {
            setError('Il noleggio può durare massimo 3 giorni dalla data di inizio (o 4 se include domenica)');
            return prev; // Non aggiornare se supera il limite
          }
          
          // Slitta automaticamente la domenica a lunedì
          if (selectedDayOfWeek === 0) { // Domenica
            const mondayDate = new Date(selectedEndDate);
            mondayDate.setDate(mondayDate.getDate() + 1);
            newRange.al = mondayDate.toISOString().split('T')[0];
          }
          
          // Pulisci errori se la validazione passa
          setError(null);
        }
        
        // Per uso interno, imposta automaticamente la data di fine = data di inizio (usa newValue, già corretta se weekend)
        if ((selectedObject?.tipo_prestito === 'solo_interno' || 
             (selectedObject?.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) && 
            name === 'dal') {
          newRange.al = newValue;
        }
        
        return newRange;
      });
    } else if (name === 'note') {
      setNote(value);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Seleziona Oggetto';
      case 2: return 'Seleziona ID Univoco';
      case 3: return 'Scegli Tipo Utilizzo';
      case 4: return 'Date e Note';
      default: return 'Nuova Richiesta';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} di 4</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Seleziona Oggetto */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Seleziona l'oggetto da richiedere</h3>
              
              {/* Campo di ricerca */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cerca oggetto</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca per nome, categoria o note..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {inventory
                  .filter((item) => {
                    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         item.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         item.note?.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  })
                  .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleObjectSelect(item)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col"
                  >
                    {/* Titolo e disponibilità */}
                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900 line-clamp-2 mb-2 leading-tight">
                        {item.nome}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                          {item.unita_disponibili} {item.unita_disponibili === 1 ? 'disponibile' : 'disponibili'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Categoria */}
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                      {item.categoria_nome}
                    </p>
                    
                    {/* Disclaimer uso interno */}
                    {item.tipo_prestito === 'solo_interno' && (
                      <div className="mt-auto pt-2 border-t border-gray-100">
                        <p className="text-xs text-orange-600">
                          ⚠️ Solo per uso interno<br />Da restituire a fine utilizzo
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {inventory.filter((item) => {
                const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     item.categoria_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     item.note?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <SquaresPlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>
                    {searchTerm 
                      ? 'Nessun oggetto trovato con i criteri di ricerca'
                      : 'Nessun oggetto disponibile per il tuo corso'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Seleziona ID Univoco */}
          {step === 2 && selectedObject && (
            <div className="space-y-4">
              <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona ID Univoco</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Oggetto:</span>{' '}
                    <span className="break-words">{selectedObject.nome}</span>
                  </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {availableUnits.map((unit) => (
                  <div
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm break-words">{unit.codice_univoco}</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                          Disponibile
                        </span>
                      </div>
                    </div>
                    {unit.note && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{unit.note}</p>
                    )}
                  </div>
                ))}
              </div>
              
              {availableUnits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessuna unità disponibile per questo oggetto</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center space-x-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Indietro
                </button>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Scegli Tipo Utilizzo (solo per oggetti "entrambi") */}
          {step === 3 && selectedObject && selectedUnit && selectedObject.tipo_prestito === 'entrambi' && (
            <div className="space-y-4">
              <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Scegli il tipo di utilizzo</h3>
                  <p className="text-sm text-gray-600">
                    Oggetto: <strong>{selectedObject.nome}</strong> - ID: <strong>{selectedUnit.codice_univoco}</strong>
                  </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <ListBulletIcon className="w-5 h-5 text-purple-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-purple-800">Come intendi utilizzare questo oggetto?</h4>
                    <p className="text-xs text-purple-700 mt-1">
                      Questo oggetto può essere utilizzato sia internamente che esternamente. Scegli come intendi utilizzarlo.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors">
                    <input
                      type="radio"
                      name="tipo_utilizzo"
                      value="interno"
                      checked={tipoUtilizzo === 'interno'}
                      onChange={(e) => {
                        setTipoUtilizzo(e.target.value);
                      }}
                      className="w-5 h-5 text-purple-600 border-purple-300 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🏠</span>
                        <span className="text-sm font-medium text-purple-900">Uso Interno</span>
                      </div>
                      <p className="text-xs text-purple-700 mt-1">
                        Utilizzo all'interno dell'accademia (stesso giorno di inizio e fine)
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors">
                    <input
                      type="radio"
                      name="tipo_utilizzo"
                      value="esterno"
                      checked={tipoUtilizzo === 'esterno'}
                      onChange={(e) => setTipoUtilizzo(e.target.value)}
                      className="w-5 h-5 text-purple-600 border-purple-300 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📅</span>
                        <span className="text-sm font-medium text-purple-900">Prestito Esterno</span>
                      </div>
                      <p className="text-xs text-purple-700 mt-1">
                        Prestito per più giorni, puoi portarlo fuori dall'accademia
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center space-x-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Indietro
                </button>
                <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={!tipoUtilizzo}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    Continua
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Date e Note */}
          {step === 4 && selectedObject && selectedUnit && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Date e Note</h3>
                  <p className="text-sm text-gray-600">
                    Oggetto: <strong>{selectedObject.nome}</strong> - ID: <strong>{selectedUnit.codice_univoco}</strong>
                  </p>
              </div>

              {/* Tipo Prestito Info */}
              {selectedObject.tipo_prestito === 'solo_interno' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-orange-800">Solo per uso interno</h4>
                      <p className="text-xs text-orange-700 mt-1">
                        Solo per uso interno<br />Da restituire a fine utilizzo
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Tipo Utilizzo per oggetti "entrambi" */}
              {selectedObject.tipo_prestito === 'entrambi' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <InformationCircleIcon className="w-5 h-5 text-purple-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-purple-800">
                        Tipo di utilizzo selezionato: {tipoUtilizzo === 'interno' ? '🏠 Uso Interno' : '📅 Prestito Esterno'}
                      </h4>
                      <p className="text-xs text-purple-700 mt-1">
                        {tipoUtilizzo === 'interno' 
                          ? 'Utilizzo all\'interno dell\'accademia (stesso giorno di inizio e fine)'
                          : 'Prestito per più giorni, puoi portarlo fuori dall\'accademia'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inizio *
                  </label>
                  <WeekdayDateInput
                    name="dal"
                    value={dateRange.dal}
                    onChange={(val) => handleInputChange({ target: { name: 'dal', value: val } })}
                    minDate={getMinStartDate()}
                    required
                    placeholder="Seleziona data inizio"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Fine *
                    {(selectedObject.tipo_prestito === 'solo_interno' || 
                      (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) && (
                      <span className="text-xs text-orange-600 ml-2">(Automatica per uso interno)</span>
                    )}
                  </label>
                  <WeekdayDateInput
                    name="al"
                    value={(selectedObject.tipo_prestito === 'solo_interno' || 
                           (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')) 
                          ? dateRange.dal : dateRange.al}
                    onChange={(val) => handleInputChange({ target: { name: 'al', value: val } })}
                    minDate={dateRange.dal || getMinStartDate()}
                    maxDate={dateRange.dal ? (() => {
                      const maxDate = new Date(dateRange.dal);
                      maxDate.setDate(maxDate.getDate() + 2);
                      return skipSunday(maxDate.toISOString().split('T')[0]);
                    })() : undefined}
                    disabledDays={[0]}
                    disabled={selectedObject.tipo_prestito === 'solo_interno' || 
                             (selectedObject.tipo_prestito === 'entrambi' && tipoUtilizzo === 'interno')}
                    required
                    placeholder="Seleziona data fine"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Aggiuntive
                </label>
                <textarea
                  name="note"
                  value={note}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Note aggiuntive (opzionale)"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center space-x-3 pt-4 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    // Se l'oggetto è "entrambi" e siamo al step 4, torna al step 3 (scelta tipo)
                    if (selectedObject.tipo_prestito === 'entrambi') {
                      setStep(3);
                    } else {
                      setStep(2);
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors flex items-center gap-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Indietro
                </button>
                <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading || (selectedObject.tipo_prestito === 'entrambi' && !tipoUtilizzo)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Creazione...
                    </>
                  ) : (
                    'Crea Richiesta'
                  )}
                </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewRequestModal;