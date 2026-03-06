import React, { useState } from 'react';
import { AlertCircle, Loader2, ArrowRight, Info, ChevronRight } from 'lucide-react';
import IconFill from '../components/IconFill.jsx';
import { useAuth } from './AuthContext';
import ForgotPassword from './ForgotPassword';
import InstructionsModal from '../components/InstructionsModal';

const Login = ({ branding = "LABA Gestione" }) => {
 const [isLogin, setIsLogin] = useState(true);
 const [formData, setFormData] = useState({
 email: '',
 username: '',
 password: '',
 name: '',
 surname: '',
 matricola: '',
 corso_accademico: ''
 });
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [showForgotPassword, setShowForgotPassword] = useState(false);
 const [showInstructions, setShowInstructions] = useState(false);
 const { login, register } = useAuth();

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 if (isLogin) {
 // Per admin usa username, per utenti usa email
 const identifier = formData.username || formData.email;
 await login(identifier, formData.password);
 } else {
 await register(formData);
 }
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleForgotPassword = () => {
 setShowForgotPassword(true);
 };

 const handleInputChange = (e) => {
 setFormData({
 ...formData,
 [e.target.name]: e.target.value
 });
 };

 if (showForgotPassword) {
 return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
 }

 return (
 <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
   {/* Background con pattern sottile */}
   <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/50" />
   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent" />
   <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23033357\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

 <div className="relative max-w-md w-full space-y-6">
 {/* Header */}
 <div className="text-center pt-6 pb-2">
   <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-white/95 shadow-xl shadow-blue-900/5 border border-white/80 p-5 mb-8">
     <img src="/logoSito.svg" alt="LABA Logo" className="h-14 w-auto" />
   </div>
 <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
   {isLogin ? 'Accedi' : 'Registrati'}
 </h2>
 <p className="mt-2 text-sm text-gray-600">
   {isLogin 
     ? 'Accedi al Service LABA e gestisci i tuoi prestiti'
     : 'Crea un nuovo account per accedere al sistema'
   }
 </p>
 </div>

 {/* Form */}
 <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100/80 py-8 px-6 sm:px-10">
 <form className="space-y-6" onSubmit={handleSubmit}>
 {/* Username/Email */}
 <div>
 <label htmlFor={isLogin ? "username" : "email"} className="block text-sm font-medium text-gray-700 ">
 {isLogin ? "Username o Email *" : "Email *"}
 </label>
 <div className="mt-1">
 <input
 id={isLogin ? "username" : "email"}
 name={isLogin ? "username" : "email"}
 type={isLogin ? "text" : "email"}
 autoComplete={isLogin ? "username" : "email"}
 required
 value={isLogin ? formData.username : formData.email}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder={isLogin ? "Inserisci username o email" : "Inserisci email"}
 />
 </div>
 </div>

 {/* Password */}
 <div>
 <label htmlFor="password" className="block text-sm font-medium text-gray-700 ">
 Password *
 </label>
 <div className="mt-1">
 <input
 id="password"
 name="password"
 type="password"
 autoComplete={isLogin ? "current-password" : "new-password"}
 required
 value={formData.password}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Inserisci la password"
 />
 </div>
 </div>

 {/* Registration Fields */}
 {!isLogin && (
 <>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="name" className="block text-sm font-medium text-gray-700 ">
 Nome *
 </label>
 <div className="mt-1">
 <input
 id="name"
 name="name"
 type="text"
 autoComplete="given-name"
 required
 value={formData.name}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Nome"
 />
 </div>
 </div>
 <div>
 <label htmlFor="surname" className="block text-sm font-medium text-gray-700 ">
 Cognome *
 </label>
 <div className="mt-1">
 <input
 id="surname"
 name="surname"
 type="text"
 autoComplete="family-name"
 required
 value={formData.surname}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Cognome"
 />
 </div>
 </div>
 </div>

 <div>
 <label htmlFor="matricola" className="block text-sm font-medium text-gray-700 ">
 Matricola *
 </label>
 <div className="mt-1">
 <input
 id="matricola"
 name="matricola"
 type="text"
 required
 value={formData.matricola}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 placeholder="Numero di matricola"
 />
 </div>
 </div>

 <div>
 <label htmlFor="corso_accademico" className="block text-sm font-medium text-gray-700 ">
 Corso Accademico *
 </label>
 <div className="mt-1">
 <select
 id="corso_accademico"
 name="corso_accademico"
 required
 value={formData.corso_accademico}
 onChange={handleInputChange}
 className="appearance-none block w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all duration-200"
 >
 <option value="">Seleziona corso</option>
 <option value="Cinema e Audiovisivi">Cinema e Audiovisivi</option>
 <option value="Design">Design</option>
 <option value="Fashion Design">Fashion Design</option>
 <option value="Fotografia">Fotografia</option>
 <option value="Graphic Design & Multimedia">Graphic Design & Multimedia</option>
 <option value="Interior Design">Interior Design</option>
 <option value="Pittura">Pittura</option>
 <option value="Regia e Videomaking">Regia e Videomaking</option>
 </select>
 </div>
 </div>
 </>
 )}

 {/* Error Message */}
 {error && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <div className="flex">
 <IconFill as={AlertCircle} className="w-5 h-5 text-red-400 mr-2" />
 <p className="text-red-800 text-sm">{error}</p>
 </div>
 </div>
 )}

 {/* Submit Button */}
 <div>
 <button
 type="submit"
 disabled={loading}
 className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
 >
 {loading ? (
 <div className="flex items-center">
 <IconFill as={Loader2} className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" />
 {isLogin ? 'Accesso in corso...' : 'Registrazione in corso...'}
 </div>
 ) : (
 <div className="flex items-center">
 <span className="mr-2">{isLogin ? 'Accedi' : 'Registrati'}</span>
 <IconFill as={ArrowRight} className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
 </div>
 )}
 </button>
 </div>

 <div className="flex flex-col items-center gap-3 pt-2">
   {isLogin && (
     <button
       type="button"
       onClick={handleForgotPassword}
       className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
     >
       Password dimenticata?
     </button>
   )}
   <button
     type="button"
     onClick={() => {
       setIsLogin(!isLogin);
       setError(null);
       setFormData({ email: '', password: '', name: '', surname: '', matricola: '', corso_accademico: '' });
     }}
     className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 border border-gray-200/80 transition-colors"
   >
     {isLogin ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
   </button>
 </div>
 </form>
 </div>

 {/* Istruzioni - pulsante che apre modale */}
 <button
   type="button"
   onClick={() => setShowInstructions(true)}
   className="flex w-full items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-sm px-5 py-4 text-left border border-gray-100/80 shadow-lg shadow-blue-900/5 hover:bg-gray-50/80 transition-colors"
 >
   <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
     <IconFill as={Info} className="w-5 h-5 text-blue-600" />
   </div>
   <div>
     <h3 className="font-semibold text-gray-900">Istruzioni</h3>
     <p className="text-xs text-gray-500">Cos'è, come noleggiare, strike e penalità</p>
   </div>
   <IconFill as={ChevronRight} className="w-5 h-5 text-gray-400 ml-auto" />
 </button>

 <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

 {/* Footer */}
 <div className="text-center pt-2">
   <p className="text-xs text-gray-500">
     © 2026 {branding}. Tutti i diritti riservati.
   </p>
 </div>
 </div>
 </div>
 );
};

export default Login;