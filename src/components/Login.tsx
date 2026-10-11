/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, AuthError } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, Church, AlertCircle, Copy, Check, ExternalLink, ShieldAlert, RotateCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const handleCopyHostname = async () => {
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement('textarea');
      textArea.value = currentHostname;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setIsUnauthorizedDomain(false);
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
      } else if (authError.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomain(true);
        setError(`O domínio "${currentHostname}" não está autorizado no Firebase Console.`);
      } else {
        setError(`Erro: ${authError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center border border-gray-100"
      >
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
          <Church size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secretaria IBCIP</h2>
        <p className="text-gray-500 mb-6 text-sm sm:text-base">Acesso restrito apenas aos administradores do sistema.</p>
        
        {isUnauthorizedDomain ? (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-4"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={22} />
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">Autorização de Domínio Necessária</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Por segurança, o Firebase exige que o link da versão online seja adicionado à lista de domínios autorizados do seu projeto.
                </p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200/70 space-y-2">
              <div className="text-xs font-medium text-gray-500 flex justify-between items-center">
                <span>Domínio a ser adicionado:</span>
                <span className="text-[11px] text-amber-700 font-mono">1 clique para copiar</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-mono text-xs text-gray-800 break-all">
                <span className="select-all">{currentHostname}</span>
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-sans font-medium transition-colors shadow-sm"
                  title="Copiar domínio"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-300" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-amber-900">
              <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                <span>Como resolver em 2 minutos:</span>
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-amber-800">
                <li>
                  Copie o domínio acima clicando no botão azul <strong>Copiar</strong>.
                </li>
                <li>
                  Abra o painel do Firebase pelo botão abaixo.
                </li>
                <li>
                  Na seção <strong>Domínios autorizados</strong>, clique em <strong>Adicionar domínio</strong>.
                </li>
                <li>
                  Cole o domínio e clique em <strong>Salvar</strong>.
                </li>
              </ol>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <a
                href={firebaseSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-3 rounded-xl font-medium text-xs transition-colors shadow-sm text-center"
              >
                <span>Abrir Firebase Console</span>
                <ExternalLink size={14} />
              </a>

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 py-2.5 px-3 rounded-xl font-medium text-xs transition-colors text-center disabled:opacity-50"
              >
                <RotateCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Tentar de novo</span>
              </button>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-600 leading-relaxed">{error}</p>
          </motion.div>
        ) : null}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-3.5 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
