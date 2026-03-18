import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  const role = (user?.ruolo || user?.role || '').toLowerCase();
  const isSupervisor = role === 'supervisor';
  const isAdmin = !!(user && (role === 'admin' || isSupervisor));
  const roleLabel = user?.id === -1 || role === 'admin'
    ? 'Amministratore'
    : isSupervisor
      ? 'Supervisore'
      : 'Utente';

  // Axios: invia sempre i cookie (credentials), niente header Authorization
  const api = useMemo(() => {
    const inst = axios.create({
      baseURL: API_BASE,
      withCredentials: true
    });
    return inst;
  }, []);

  // Bootstrap: alla mount verifica sessione via cookie (GET /me)
  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const { data } = await api.get('/api/auth/me');
        const u = data?.user ?? data ?? null;
        if (!cancelled) setUser(u);
      } catch (e) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMe();
    return () => { cancelled = true; };
  }, [api]);

  const login = async (identifier, password) => {
    try {
      const { data } = await api.post('/api/auth/login', {
        email: identifier,
        username: identifier,
        password
      });
      const u = data?.user ?? null;
      if (!u) throw new Error("Risposta login non valida");
      setUser(u);
      return true;
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Errore durante il login";
      throw new Error(msg);
    }
  };

  const register = async ({ name, surname, email, password, matricola, phone, ruolo, corso_accademico }) => {
    try {
      const payload = { name, surname, email, password, matricola, phone, ruolo, corso_accademico };
      const { data } = await api.post('/api/auth/register', payload);
      const u = data?.user ?? null;
      if (!u) throw new Error("Risposta registrazione non valida");
      setUser(u);
      return true;
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Errore durante la registrazione";
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (_) { /* ignora errori di rete */ }
    setUser(null);
  };

  // fetch con cookie (credentials); usare al posto di fetch + Authorization per le chiamate API
  const authFetch = useMemo(() => {
    return (url, options = {}) => {
      const urlFull = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
      return fetch(urlFull, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.headers || {}),
          // non inviare Authorization: il cookie httpOnly viene inviato dal browser
        }
      });
    };
  }, []);

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isSupervisor,
    role,
    roleLabel,
    api,
    authFetch,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
