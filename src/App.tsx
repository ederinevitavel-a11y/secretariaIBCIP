/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import { motion, AnimatePresence } from 'motion/react';
import { Church, LayoutDashboard, LogOut, UserPlus } from 'lucide-react';

const ADMIN_EMAILS = ['eloltronica@gmail.com', 'elaine.rsn@hotmail.com'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'public' | 'admin'>('public');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  const handleLogout = async () => {
    await signOut(auth);
    setView('public');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView('public')}
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
              <Church size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">IBCIP</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setView('public')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                view === 'public' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Cadastro</span>
            </button>
            
            <button
              onClick={() => setView('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                view === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Painel Admin</span>
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-20">
        <AnimatePresence mode="wait">
          {view === 'public' ? (
            <motion.div
              key="public"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RegistrationForm isAdmin={isAdmin} />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {!user ? (
                <Login />
              ) : isAdmin ? (
                <AdminDashboard />
              ) : (
                <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl text-center">
                  <h2 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h2>
                  <p className="text-slate-500 mb-6">Você não tem permissão para acessar esta área.</p>
                  <button 
                    onClick={handleLogout}
                    className="px-6 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Trocar de conta
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-200 bg-white">
        <p>© 2026 IBCIP • Sistema de Cadastro de Membros</p>
      </footer>
    </div>
  );
}
