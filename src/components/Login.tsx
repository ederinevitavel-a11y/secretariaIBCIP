/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, Church, AlertCircle } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    // Configura o prompt para forçar a escolha da conta se necessário
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const authError = err as AuthError;
      console.error('Erro ao fazer login:', authError);
      
      if (authError.code === 'auth/popup-closed-by-user') {
        setError('O pop-up de login foi fechado antes da conclusão. Por favor, mantenha a janela aberta até o fim.');
      } else if (authError.code === 'auth/popup-blocked') {
        setError('O seu navegador bloqueou o pop-up de login. Por favor, habilite pop-ups para este site.');
      } else if (authError.code === 'auth/cancelled-by-user') {
        setError('O login foi cancelado.');
      } else {
        setError('Um erro inesperado ocorreu. Por favor, tente novamente em instantes.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100"
      >
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
          <Church size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secretaria IBCIP</h2>
        <p className="text-gray-500 mb-8">Acesso restrito apenas aos administradores do sistema.</p>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-600">{error}</p>
          </motion.div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-3.5 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          )}
          {loading ? 'Conectando...' : 'Entrar com Google'}
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
          <LogIn size={12} />
          <span>Somente para administradores autorizados</span>
        </div>
      </motion.div>
    </div>
  );
}
