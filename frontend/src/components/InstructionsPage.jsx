import React from 'react';
import { BuildingOffice2Icon, CheckCircleIcon, CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const InstructionsPage = () => {
  const steps = [
    { n: 1, title: 'Sfoglia gli articoli', desc: 'Vai in "Articoli Disponibili" e scegli l\'attrezzatura che ti serve' },
    { n: 2, title: 'Seleziona l\'unità', desc: 'Scegli l\'unità specifica (es. Fotocamera #3) se richiesto' },
    { n: 3, title: 'Tipo di utilizzo', desc: 'Uso interno solo in accademia, oppure Prestito esterno per portarlo fuori' },
    { n: 4, title: 'Date', desc: 'Data inizio: solo giorni feriali (lun-ven), mai sabato/domenica. Riconsegna: possibile anche sabato, la domenica non è mai valida. Esterno: max 3 giorni (o 4 se include domenica)' },
    { n: 5, title: 'Attendi l\'approvazione', desc: 'Invia la richiesta e attendi conferma dal Service' },
    { n: 6, title: 'Ritira e restituisci', desc: 'Ritira l\'attrezzatura nel giorno concordato e restituiscila in orario' }
  ];

  const features = [
    'Richiedere in prestito attrezzature per progetti e lavori',
    'Consultare i tuoi prestiti attivi e lo storico',
    'Segnalare guasti o malfunzionamenti',
    'Ricevere notifiche su approvazioni, scadenze e ritardi'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 mb-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">📖</div>
          <div>
            <h1 className="text-2xl font-bold">Come si usa</h1>
            <p className="text-blue-100 text-sm">Guida al Service Attrezzatura LABA</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Cos'è */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Cos'è questo sistema</h2>
              <p className="text-gray-700 leading-relaxed">
                Il Service Attrezzatura LABA è il sistema per prenotare e noleggiare attrezzature 
                (fotocamere, luci, reflex, ecc.) messe a disposizione dall'accademia per studenti e docenti.
              </p>
            </div>
          </div>
        </div>

        {/* A cosa serve */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">A cosa serve</h2>
              <ul className="space-y-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Come fare un noleggio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Come fare un noleggio</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-4 p-4 rounded-full bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-0.5">{s.title}</h3>
                  <p className="text-sm text-gray-600">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strike e penalità */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 bg-red-50/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Strike, ritardi e penalità</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span><strong>Ritardi nella restituzione</strong> — accumuli 1 strike per ogni giorno di ritardo</li>
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span><strong>3 o più strike</strong> — l'account viene bloccato</li>
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span><strong>Sblocco</strong> — devi recarti di persona al Service Attrezzatura</li>
                <li className="flex gap-2"><span className="text-red-500 font-bold">•</span>Restituisci sempre in orario e in buone condizioni</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPage;
