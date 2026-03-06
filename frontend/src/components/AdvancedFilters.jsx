import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import IconFill from './IconFill.jsx';

const AdvancedFilters = ({ 
 isOpen, 
 onClose, 
 onApplyFilters, 
 categories = [], 
 courses = [],
 savedFilters = [],
 onSaveFilter,
 onLoadFilter,
 onDeleteFilter
}) => {
 const [filters, setFilters] = useState({
 search: '',
 category: '',
 course: '',
 status: 'all',
 dateFrom: '',
 dateTo: '',
 sortBy: 'nome',
 sortOrder: 'asc'
 });

 const [filterName, setFilterName] = useState('');
 const [showSaveDialog, setShowSaveDialog] = useState(false);

 useEffect(() => {
 if (isOpen) {
 setFilters({
 search: '',
 category: '',
 course: '',
 status: 'all',
 dateFrom: '',
 dateTo: '',
 sortBy: 'nome',
 sortOrder: 'asc'
 });
 }
 }, [isOpen]);

 const handleFilterChange = (key, value) => {
 setFilters(prev => ({ ...prev, [key]: value }));
 };

 const handleApply = () => {
 onApplyFilters(filters);
 onClose();
 };

 const handleReset = () => {
 setFilters({
 search: '',
 category: '',
 course: '',
 status: 'all',
 dateFrom: '',
 dateTo: '',
 sortBy: 'nome',
 sortOrder: 'asc'
 });
 };

 const handleSaveFilter = () => {
 if (filterName.trim()) {
 onSaveFilter(filterName, filters);
 setFilterName('');
 setShowSaveDialog(false);
 }
 };

 const handleLoadFilter = (savedFilter) => {
 setFilters(savedFilter.filters);
 onLoadFilter(savedFilter);
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999]">
 <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-semibold text-gray-900">Filtri Avanzati</h3>
 <button
 onClick={onClose}
 className="text-gray-400 hover:text-gray-600"
 >
 <IconFill as={X} className="w-6 h-6" />
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
 {/* Search */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Ricerca
 </label>
 <input
 type="text"
 value={filters.search}
 onChange={(e) => handleFilterChange('search', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 placeholder="Cerca per nome, seriale..."
 />
 </div>

 {/* Category */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Categoria
 </label>
 <select
 value={filters.category}
 onChange={(e) => handleFilterChange('category', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 >
 <option value="">Tutte le categorie</option>
 {categories.map(cat => (
 <option key={cat.id} value={cat.id}>{cat.nome}</option>
 ))}
 </select>
 </div>

 {/* Course */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Corso
 </label>
 <select
 value={filters.course}
 onChange={(e) => handleFilterChange('course', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 >
 <option value="">Tutti i corsi</option>
 {courses.map(course => (
 <option key={course.id} value={course.id}>{course.nome}</option>
 ))}
 </select>
 </div>

 {/* Status */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Stato
 </label>
 <select
 value={filters.status}
 onChange={(e) => handleFilterChange('status', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 >
 <option value="all">Tutti gli stati</option>
 <option value="disponibile">Disponibile</option>
 <option value="in_prestito">In prestito</option>
 <option value="in_riparazione">In riparazione</option>
 <option value="non_disponibile">Non disponibile</option>
 </select>
 </div>

 {/* Date From */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Data da
 </label>
 <input
 type="date"
 value={filters.dateFrom}
 onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 />
 </div>

 {/* Date To */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Data a
 </label>
 <input
 type="date"
 value={filters.dateTo}
 onChange={(e) => handleFilterChange('dateTo', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 />
 </div>

 {/* Sort By */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Ordina per
 </label>
 <select
 value={filters.sortBy}
 onChange={(e) => handleFilterChange('sortBy', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 >
 <option value="nome">Nome</option>
 <option value="seriale">Seriale</option>
 <option value="categoria">Categoria</option>
 <option value="data_aggiunta">Data aggiunta</option>
 </select>
 </div>

 {/* Sort Order */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Ordine
 </label>
 <select
 value={filters.sortOrder}
 onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
 >
 <option value="asc">Crescente</option>
 <option value="desc">Decrescente</option>
 </select>
 </div>
 </div>

 {/* Saved Filters */}
 {savedFilters.length > 0 && (
 <div className="mb-6">
 <h4 className="text-sm font-medium text-gray-700 mb-3">Filtri Salvati</h4>
 <div className="flex flex-wrap gap-2">
 {savedFilters.map((savedFilter, index) => (
 <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
 <button
 onClick={() => handleLoadFilter(savedFilter)}
 className="text-sm text-blue-600 hover:text-blue-800 mr-2"
 >
 {savedFilter.name}
 </button>
 <button
 onClick={() => onDeleteFilter(index)}
 className="text-red-500 hover:text-red-700"
 >
 <IconFill as={X} className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Actions */}
 <div className="flex justify-between items-center">
 <div className="flex space-x-2">
 <button
 onClick={() => setShowSaveDialog(true)}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
 >
 💾 Salva Filtro
 </button>
 <button
 onClick={handleReset}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
 >
 🔄 Reset
 </button>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
 >
 Annulla
 </button>
 <button
 onClick={handleApply}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
 >
 Applica Filtri
 </button>
 </div>
 </div>

 {/* Save Filter Dialog */}
 {showSaveDialog && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-60">
 <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
 <h4 className="text-lg font-semibold text-gray-900 mb-4">Salva Filtro</h4>
 <input
 type="text"
 value={filterName}
 onChange={(e) => setFilterName(e.target.value)}
 placeholder="Nome del filtro..."
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 mb-4"
 />
 <div className="flex justify-end space-x-2">
 <button
 onClick={() => setShowSaveDialog(false)}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
 >
 Annulla
 </button>
 <button
 onClick={handleSaveFilter}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
 >
 Salva
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
};

export default AdvancedFilters;
