import React, { useState, useRef, useEffect } from 'react';

const OperationsDropdown = ({ onExport, onTemplate, onImport }) => {
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef(null);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
 setIsOpen(false);
 }
 };

 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="flex items-center justify-center h-12 px-4 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer"
 >
 <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
 </svg>
 <span className="text-gray-700 font-medium">Altre Operazioni</span>
 <svg className={`w-5 h-5 ml-2 text-gray-600 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </button>

 {isOpen && (
 <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
 <button
 onClick={() => {
 onExport();
 setIsOpen(false);
 }}
 className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors flex items-center border-b border-gray-100 cursor-pointer"
 >
 <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
 <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 </div>
 <div>
 <p className="font-semibold text-gray-900">Esporta</p>
 <p className="text-sm text-gray-500">Esporta inventario in formato .xlsx</p>
 </div>
 </button>
 
 <button
 onClick={() => {
 onTemplate();
 setIsOpen(false);
 }}
 className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors flex items-center border-b border-gray-100 cursor-pointer"
 >
 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
 <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 </div>
 <div>
 <p className="font-semibold text-gray-900">Scarica template</p>
 <p className="text-sm text-gray-500">Scarica modello per importazione</p>
 </div>
 </button>
 
 <label className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors flex items-center cursor-pointer">
 <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
 <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
 </svg>
 </div>
 <div>
 <p className="font-semibold text-gray-900">Importa</p>
 <p className="text-sm text-gray-500">Importa oggetti da file .xlsx</p>
 </div>
 <input
 type="file"
 accept=".xlsx,.xls"
 onChange={(e) => {
 const file = e.target.files[0];
 if (file) {
   onImport(file);
 }
 setIsOpen(false);
 }}
 className="hidden"
 />
 </label>
 </div>
 )}
 </div>
 );
};

export default OperationsDropdown;
