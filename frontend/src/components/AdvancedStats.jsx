import React, { useState, useEffect } from 'react';
import { UsersIcon, CubeIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../auth/AuthContext';

const COLORS = {
  gold: 'bg-amber-400 text-amber-900',
  silver: 'bg-slate-300 text-slate-800',
  bronze: 'bg-amber-600 text-white',
  default: 'bg-blue-100 text-blue-700'
};

const getRankStyle = (rank) => {
  if (rank === 1) return COLORS.gold;
  if (rank === 2) return COLORS.silver;
  if (rank === 3) return COLORS.bronze;
  return COLORS.default;
};

const AdvancedStats = () => {
 const [stats, setStats] = useState({
 topUsers: [],
 topItems: [],
 topDepartments: [],
 monthlyData: []
 });
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [selectedPeriod, setSelectedPeriod] = useState('30'); // 30, 90, 365 giorni
 const { api } = useAuth();

 useEffect(() => {
 fetchStats();
 }, [selectedPeriod]);

 const fetchStats = async () => {
 try {
 setLoading(true);
 const [usersRes, itemsRes, departmentsRes, monthlyRes] = await Promise.all([
 api.get(`/api/stats/top-users?period=${selectedPeriod}`),
 api.get(`/api/stats/top-items?period=${selectedPeriod}`),
 api.get(`/api/stats/top-departments?period=${selectedPeriod}`),
 api.get(`/api/stats/monthly-requests?period=${selectedPeriod}`)
 ]);
 const statsData = {
 topUsers: usersRes.data ?? [],
 topItems: itemsRes.data ?? [],
 topDepartments: departmentsRes.data ?? [],
 monthlyData: monthlyRes.data ?? []
 };
 setStats(statsData);
 } catch (err) {
 setError('Errore nel caricamento delle statistiche');
 console.error('Error fetching stats:', err);
 } finally {
 setLoading(false);
 }
 };

 const StatCard = ({ title, children, icon: Icon, accent = 'blue' }) => {
   const accentMap = {
     blue: 'border-l-blue-500 bg-blue-50/30',
     emerald: 'border-l-emerald-500 bg-emerald-50/30',
     violet: 'border-l-violet-500 bg-violet-50/30',
     amber: 'border-l-amber-500 bg-amber-50/30'
   };
   const iconMap = {
     blue: 'bg-blue-100 text-blue-600',
     emerald: 'bg-emerald-100 text-emerald-600',
     violet: 'bg-violet-100 text-violet-600',
     amber: 'bg-amber-100 text-amber-600'
   };
   return (
     <div className={`rounded-xl border border-gray-200 border-l-4 overflow-hidden ${accentMap[accent] || accentMap.blue}`}>
       <div className="p-4 bg-white/80 border-b border-gray-100">
         <div className="flex items-center gap-3">
           {Icon && (
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconMap[accent] || iconMap.blue}`}>
               <Icon className="w-5 h-5" />
             </div>
           )}
           <h3 className="text-base font-semibold text-gray-900">{title}</h3>
         </div>
       </div>
       <div className="p-4">{children}</div>
     </div>
   );
 };

 const TopUserItem = ({ user, rank, count }) => (
   <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/60 transition-colors">
     <div className="flex items-center gap-3">
       <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getRankStyle(rank)}`}>
         {rank}
       </div>
       <div className="min-w-0">
         <p className="font-medium text-gray-900 truncate">{user.name} {user.surname}</p>
         <p className="text-xs text-gray-500 truncate">{user.corso_accademico}</p>
       </div>
     </div>
     <div className="text-right shrink-0">
       <p className="font-bold text-blue-600 text-lg">{count}</p>
       <p className="text-xs text-gray-500">richieste</p>
     </div>
   </div>
 );

 const TopItemCard = ({ item, rank, count }) => (
   <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/60 transition-colors">
     <div className="flex items-center gap-3">
       <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getRankStyle(rank)}`}>
         {rank}
       </div>
       <div className="min-w-0">
         <p className="font-medium text-gray-900 truncate">{item.nome}</p>
         <p className="text-xs text-gray-500 truncate">{item.categoria_figlia || item.categoria_madre || '–'}</p>
       </div>
     </div>
     <div className="text-right shrink-0">
       <p className="font-bold text-emerald-600 text-lg">{count}</p>
       <p className="text-xs text-gray-500">richieste</p>
     </div>
   </div>
 );

 const DepartmentItem = ({ department, rank, count }) => (
   <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/60 transition-colors">
     <div className="flex items-center gap-3">
       <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getRankStyle(rank)}`}>
         {rank}
       </div>
       <div className="min-w-0">
         <p className="font-medium text-gray-900 truncate">{department.corso_accademico}</p>
         <p className="text-xs text-gray-500">{department.count} studenti</p>
       </div>
     </div>
     <div className="text-right shrink-0">
       <p className="font-bold text-violet-600 text-lg">{count}</p>
       <p className="text-xs text-gray-500">richieste</p>
     </div>
   </div>
 );

 const SimpleChart = ({ data, title }) => {
   const maxValue = data.length > 0 ? Math.max(...data.map(d => d.count), 1) : 1;
 
 const barColors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600'];
   return (
     <div className="space-y-3">
       <h4 className="text-sm font-medium text-gray-700">{title}</h4>
       <div className="space-y-3">
         {data.length === 0 ? (
           <p className="text-sm text-gray-500 py-4 text-center">Nessun dato nel periodo selezionato</p>
         ) : (
           data.map((item, index) => (
             <div key={index} className="flex items-center gap-4">
               <div className="w-16 text-xs font-medium text-gray-600 shrink-0">
                 {item.month || item.week || item.day}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-500 ${barColors[index % barColors.length]}`}
                     style={{ width: `${(item.count / maxValue) * 100}%` }}
                   />
                 </div>
               </div>
               <div className="w-8 text-sm font-bold text-gray-700 text-right shrink-0">{item.count}</div>
             </div>
           ))
         )}
       </div>
     </div>
   );
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 <span className="ml-2 text-gray-600">Caricamento statistiche...</span>
 </div>
 );
 }

 return (
 <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
 <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
   <div className="flex justify-between items-center flex-wrap gap-4">
     <div>
       <h2 className="text-lg font-semibold text-gray-900">Analisi dettagliate</h2>
       <p className="text-sm text-gray-500">Top utenti, oggetti e dipartimenti per periodo</p>
     </div>
     <select
       value={selectedPeriod}
       onChange={(e) => setSelectedPeriod(e.target.value)}
       className="px-4 py-2 border border-gray-300 rounded-full text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
     >
       <option value="30">Ultimi 30 giorni</option>
       <option value="90">Ultimi 90 giorni</option>
       <option value="365">Ultimo anno</option>
     </select>
   </div>
 </div>
 <div className="p-6 lg:p-8 space-y-6">

 {/* Error */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full">
 {error}
 </div>
 )}

 {/* Charts Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <StatCard title="Andamento Richieste" accent="blue">
 <SimpleChart 
 data={stats.monthlyData} 
 title="Richieste per periodo"
 />
 </StatCard>
 
 <StatCard title="Distribuzione per Categoria" accent="emerald">
 <div className="space-y-3">
 {stats.topItems.slice(0, 5).length === 0 ? (
 <p className="text-sm text-gray-500 py-4 text-center">Nessun dato nel periodo selezionato</p>
 ) : (
 (() => {
   const items = stats.topItems.slice(0, 5);
   const maxCat = Math.max(...items.map(i => i.count), 1);
   return items.map((item, index) => (
     <div key={index} className="flex items-center gap-4">
       <span className="w-40 text-sm font-medium text-gray-700 truncate shrink-0" title={item.categoria_figlia ? `${item.categoria_madre} – ${item.categoria_figlia}` : item.categoria_madre}>
            {item.categoria_figlia ? item.categoria_figlia : item.categoria_madre}
          </span>
       <div className="flex-1 min-w-0">
         <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
           <div 
             className="h-full rounded-full bg-emerald-600 transition-all duration-500"
             style={{ width: `${(item.count / maxCat) * 100}%` }}
           />
         </div>
       </div>
       <span className="text-sm font-bold text-emerald-600 w-8 text-right shrink-0">{item.count}</span>
     </div>
   ));
 })()
 )}
 </div>
 </StatCard>
 </div>

 {/* Top Lists Row */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <StatCard title="Top 5 Utenti" icon={UsersIcon} accent="blue">
 <div className="space-y-0.5">
 {stats.topUsers.length > 0 ? (
 stats.topUsers.map((user, index) => (
 <TopUserItem key={user.id} user={user} rank={index + 1} count={user.count} />
 ))
 ) : (
 <div className="text-center py-10 text-gray-500">
 <UsersIcon className="mx-auto h-12 w-12 text-gray-300" />
 <p className="mt-2 text-sm">Nessun dato disponibile</p>
 </div>
 )}
 </div>
 </StatCard>

 <StatCard title="Top 5 Oggetti" icon={CubeIcon} accent="emerald">
 <div className="space-y-0.5">
 {stats.topItems.length > 0 ? (
 stats.topItems.map((item, index) => (
 <TopItemCard key={item.id} item={item} rank={index + 1} count={item.count} />
 ))
 ) : (
 <div className="text-center py-10 text-gray-500">
 <CubeIcon className="mx-auto h-12 w-12 text-gray-300" />
 <p className="mt-2 text-sm">Nessun dato disponibile</p>
 </div>
 )}
 </div>
 </StatCard>

 <StatCard title="Top 5 Dipartimenti" icon={BuildingOffice2Icon} accent="violet">
 <div className="space-y-0.5">
 {stats.topDepartments.length > 0 ? (
 stats.topDepartments.map((department, index) => (
 <DepartmentItem
 key={department.corso_accademico}
 department={department}
 rank={index + 1}
 count={department.count}
 />
 ))
 ) : (
 <div className="text-center py-10 text-gray-500">
 <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-300" />
 <p className="mt-2 text-sm">Nessun dato disponibile</p>
 </div>
 )}
 </div>
 </StatCard>
 </div>
 </div>
 </div>
 );
};

export default AdvancedStats;