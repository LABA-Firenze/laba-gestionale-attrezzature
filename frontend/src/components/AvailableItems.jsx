import React, { useState, useEffect } from 'react';
import { CubeIcon, MapPinIcon, TagIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';
import NewRequestModal from './NewRequestModal';
import { ItemListSkeleton } from './SkeletonLoader';

const AvailableItems = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { token, user } = useAuth();

  // Fetch available items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventario/disponibili`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Errore nel caricamento articoli');

      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories - filter by user's course
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categorie-semplici`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Show all categories for now - can add course filtering later if needed
        setCategories(data);
      }
    } catch (err) {
      console.error('Errore caricamento categorie:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [user?.corso_accademico]);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.posizione?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
                           item.categoria_nome?.toLowerCase().includes(selectedCategory.toLowerCase());
    
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'disponibile': return 'bg-green-100 text-green-800';
      case 'in_prestito': return 'bg-blue-100 text-blue-800';
      case 'in_riparazione': return 'bg-orange-100 text-orange-800';
      case 'non_disponibile': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'disponibile': return 'Disponibile';
      case 'in_prestito': return 'In Prestito';
      case 'in_riparazione': return 'In Riparazione';
      case 'non_disponibile': return 'Non Disponibile';
      default: return status;
    }
  };

  const handleRequestItem = (item) => {
    setSelectedItem(item);
    setShowNewRequestModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <ItemListSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Articoli Disponibili</h1>
            <p className="text-gray-600">Sfoglia e richiedi articoli per il tuo corso: {user?.corso_accademico}</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredItems.length} articoli trovati
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cerca articoli</label>
            <input
              type="text"
              placeholder="Nome, posizione, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtra per categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="select-field"
            >
              <option value="">Tutte le categorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.nome}>
                  {category.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun articolo trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory 
              ? 'Prova a modificare i filtri di ricerca'
              : 'Non ci sono articoli disponibili per il tuo corso'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CubeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{item.nome}</h3>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.stato_effettivo)}`}>
                      {getStatusText(item.stato_effettivo)}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.note}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <CubeIcon className="w-3.5 h-3.5" />
                      {item.unita_disponibili || 0} {(item.unita_disponibili || 0) === 1 ? 'disponibile' : 'disponibili'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <TagIcon className="w-3.5 h-3.5" />
                      {item.categoria_nome ? (item.categoria_nome.includes(' - ') ? item.categoria_nome.split(' - ')[1] : item.categoria_nome) : 'N/A'}
                    </span>
                    {item.posizione && item.posizione.trim() && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5" />
                          {item.posizione}
                        </span>
                      </>
                    )}
                    {item.immagine_url && (
                      <>
                        <span>•</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(item.immagine_url, '_blank'); }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          title="Visualizza immagine"
                        >
                          <PhotoIcon className="w-3.5 h-3.5" /> Immagine
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleRequestItem(item)}
                      disabled={item.stato_effettivo !== 'disponibile'}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                        item.stato_effettivo === 'disponibile'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {item.stato_effettivo === 'disponibile' ? 'Richiedi' : 'Non disponibile'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Request Modal */}
      {showNewRequestModal && (
        <NewRequestModal
          isOpen={showNewRequestModal}
          onClose={() => {
            setShowNewRequestModal(false);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            setShowNewRequestModal(false);
            setSelectedItem(null);
          }}
          selectedItem={selectedItem}
        />
      )}
    </div>
  );
};

export default AvailableItems;
