import React, { useState, useEffect } from 'react';
import { CubeIcon, MapPinIcon, TagIcon, PhotoIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import PageHeader from './PageHeader';
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Articoli Disponibili"
        subtitle={`Sfoglia e richiedi articoli per il tuo corso: ${user?.corso_accademico || ''}`}
        meta={`${filteredItems.length} articoli trovati`}
      />

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
            <article
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-200 flex flex-col text-left"
            >
              {/* Accent bar + header */}
              <div className="flex items-start gap-3 px-5 pt-5 pb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CubeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2 pr-2">
                    {item.nome}
                  </h3>
                  <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.stato_effettivo)}`}>
                    {getStatusText(item.stato_effettivo)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {item.note && (
                <p className="px-5 py-1 text-sm text-gray-600 line-clamp-2 leading-snug">
                  {item.note}
                </p>
              )}

              {/* Meta: quantity + category in a clean grid */}
              <div className="px-5 py-3 mt-auto flex flex-col gap-2">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Squares2X2Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{item.unita_disponibili || 0} {(item.unita_disponibili || 0) === 1 ? 'disponibile' : 'disponibili'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <TagIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="truncate">{item.categoria_nome ? (item.categoria_nome.includes(' - ') ? item.categoria_nome.split(' - ')[1] : item.categoria_nome) : 'N/A'}</span>
                  </span>
                </div>
                {item.posizione && item.posizione.trim() && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPinIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="truncate">{item.posizione}</span>
                  </div>
                )}
                {item.immagine_url && (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(item.immagine_url, '_blank'); }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 w-fit"
                    title="Visualizza immagine"
                  >
                    <PhotoIcon className="w-4 h-4 text-blue-600" /> Immagine
                  </button>
                )}

                {/* CTA */}
                <button
                  onClick={() => handleRequestItem(item)}
                  disabled={item.stato_effettivo !== 'disponibile'}
                  className={`mt-3 w-full py-2.5 text-sm font-medium rounded-full transition-colors ${
                    item.stato_effettivo === 'disponibile'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {item.stato_effettivo === 'disponibile' ? 'Richiedi' : 'Non disponibile'}
                </button>
              </div>
            </article>
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
