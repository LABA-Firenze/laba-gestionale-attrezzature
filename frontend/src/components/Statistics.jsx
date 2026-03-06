import React, { useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import BasicStats from './BasicStats';
import AdvancedStats from './AdvancedStats';

const Statistics = () => {
 const [activeTab, setActiveTab] = useState('basic');

 return (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 mx-4 sm:mx-6 lg:mx-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistiche</h1>
          <p className="text-gray-600 text-lg">Analisi e monitoraggio del sistema di gestione attrezzature</p>
        </div>
      </div>
    </div>

    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5" />
                <span>Statistiche Base</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5" />
                <span>Statistiche Avanzate</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        {activeTab === 'basic' && (
          <div className="p-8">
            <BasicStats />
          </div>
        )}
        
        {activeTab === 'advanced' && (
          <div className="p-8">
            <AdvancedStats />
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Statistics;

