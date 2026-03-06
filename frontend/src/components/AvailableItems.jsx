import React, { useState, useEffect } from 'react';
import { MapPinIcon, PhotoIcon, CubeIcon, ArrowRightIcon, TagIcon } from '@heroicons/react/24/outline';
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
      case 'disponibile': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'in_prestito': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'in_riparazione': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'non_disponibile': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
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

      {/* Items Grid - card compatte, pulsante discreto */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-medium text-gray-900">Nessun articolo trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory 
              ? 'Prova a modificare i filtri di ricerca'
              : 'Non ci sono articoli disponibili per il tuo corso'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const isAvailable = item.stato_effettivo === 'disponibile';
            const categoriaLabel = item.categoria_nome ? (item.categoria_nome.includes(' - ') ? item.categoria_nome.split(' - ')[1] : item.categoria_nome) : '—';
            return (
            <article
              key={item.id}
              className={`group relative overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:shadow-lg ${
                isAvailable ? 'border-gray-200 shadow-sm' : 'border-gray-100 shadow-sm opacity-90'
              }`}
            >
              <div className={`h-1 ${
                isAvailable ? 'bg-emerald-500' : item.stato_effettivo === 'in_riparazione' ? 'bg-amber-500' : item.stato_effettivo === 'non_disponibile' ? 'bg-red-300' : 'bg-gray-200'
              }`} />
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isAvailable ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <CubeIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.nome}</h3>
                    <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(item.stato_effettivo)}`}>
                      {getStatusText(item.stato_effettivo)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className="tabular-nums font-medium text-gray-600">{item.unita_disponibili ?? 0}</span>
                  <span>{(item.unita_disponibili ?? 0) === 1 ? 'disponibile' : 'disponibili'}</span>
                  {categoriaLabel !== '—' && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 truncate">
                        <TagIcon className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{categoriaLabel}</span>
                      </span>
                    </>
                  )}
                </div>

                {item.posizione?.trim() && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 truncate">
                    <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{item.posizione}</span>
                  </p>
                )}

                {item.note && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.note}</p>
                )}

                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  {item.immagine_url && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); window.open(item.immagine_url, '_blank'); }}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      title="Visualizza immagine"
                    >
                      <PhotoIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => handleRequestItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Richiedi
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Non disponibile</span>
                  )}
                </div>
              </div>
            </article>
          );})}
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
