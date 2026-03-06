import React from 'react';
import BasicStats from './BasicStats';
import AdvancedStats from './AdvancedStats';
import PageHeader from './PageHeader';

const Statistics = () => {
  return (
    <div className="min-h-screen bg-gray-50 space-y-6">
      <PageHeader
        title="Statistiche"
        subtitle="Analisi e monitoraggio del sistema di gestione attrezzature"
      />

      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <BasicStats />
        <AdvancedStats />
      </div>
    </div>
  );
};

export default Statistics;

