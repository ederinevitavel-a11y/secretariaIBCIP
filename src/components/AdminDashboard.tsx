/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Member, OperationType } from '../types';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Download, FileText, Table as TableIcon, Users, Calendar, Mail, Phone, MapPin, Edit2, X, Camera, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import RegistrationForm from './RegistrationForm';

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete(null);
    setDeletingId(id);
    setError(null);
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(`Erro ao excluir ${name}. Verifique suas permissões.`);
      try {
        handleFirestoreError(err, OperationType.DELETE, `members/${id}`);
      } catch (e) {}
    } finally {
      setDeletingId(null);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {editingMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl my-8"
            >
              <RegistrationForm 
                memberToEdit={editingMember} 
                onCancel={() => setEditingMember(null)}
                onSuccess={() => setEditingMember(null)}
                isAdmin={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Cadastro?</h3>
              <p className="text-gray-500 mb-8">
                Tem certeza que deseja excluir o cadastro de <span className="font-bold text-gray-800">{confirmDelete.name}</span>? 
                Esta ação é irreversível.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete.id, confirmDelete.name)}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-blue-600" />
            Gestão de Membros
          </h1>
          <p className="text-gray-500 mt-1">Total de {members.length} membros cadastrados</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(members)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
          >
            <TableIcon size={18} /> Excel
          </button>
          <button
            onClick={() => exportToPDF(members)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm font-medium"
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {member.photoUrl ? (
                    <div className="relative group/photo cursor-pointer" onClick={() => window.open(member.photoUrl, '_blank')}>
                      <img 
                        src={member.photoUrl} 
                        alt={member.name} 
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100 shadow-sm group-hover/photo:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                        <Camera className="text-white" size={20} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-2xl border-2 border-blue-100">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  <div className="pt-1">
                    <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{member.name}</h3>
                    <div className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
                      {member.maritalStatus}
                    </div>
                    {member.lgpdConsent && (
                      <div className="inline-flex items-center gap-1 mt-1 block px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-md" title={`Ciente em: ${member.lgpdConsentDate ? new Date(member.lgpdConsentDate).toLocaleDateString('pt-BR') : 'N/A'}`}>
                        <CheckCircle2 size={10} /> LGPD OK
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                    disabled={deletingId === member.id}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: member.id!, name: member.name })}
                    className={`p-2 rounded-lg transition-colors ${
                      deletingId === member.id 
                        ? 'bg-red-50 text-red-600 cursor-not-allowed' 
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Excluir"
                    disabled={deletingId === member.id}
                  >
                    {deletingId === member.id ? (
                      <div className="w-4.5 h-4.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="shrink-0" />
                    <span>{member.dob.split('-').reverse().join('/')}</span>
                  </div>
                  { (member.age || calculateAge(member.dob)) !== null && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {member.age || calculateAge(member.dob)} anos
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} className="shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                <a 
                  href={`https://wa.me/${member.phone.replace(/\D/g, '').startsWith('55') ? member.phone.replace(/\D/g, '') : '55' + member.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors group/phone"
                  title="Abrir no WhatsApp"
                >
                  <Phone size={14} className="shrink-0 group-hover/phone:scale-110 transition-transform" />
                  <span>{member.phone}</span>
                </a>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={14} className="shrink-0" />
                  <span className="line-clamp-1">{member.address}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400">Igreja de Origem:</p>
                    <p className="text-sm font-medium text-gray-700">{member.originChurch}</p>
                  </div>
                  
                  {member.lgpdMetadata && (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Log de Auditoria LGPD
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 text-[10px] text-gray-500">
                        <div className="flex justify-between border-b border-gray-200/50 pb-1">
                          <span className="font-medium">Data/Hora:</span>
                          <span className="text-gray-900">{new Date(member.lgpdMetadata.acceptedAt).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200/50 pb-1">
                          <span className="font-medium">Plataforma:</span>
                          <span className="text-gray-900">{member.lgpdMetadata.platform}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200/50 pb-1">
                          <span className="font-medium">Resolução:</span>
                          <span className="text-gray-900">{member.lgpdMetadata.screenResolution}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200/50 pb-1">
                          <span className="font-medium">Idioma:</span>
                          <span className="text-gray-900">{member.lgpdMetadata.language}</span>
                        </div>
                        <div className="pt-1">
                          <span className="font-medium block mb-0.5">Navegador:</span>
                          <span className="text-gray-700 leading-tight italic block bg-white p-1 rounded border border-gray-100 text-[9px]">
                            {member.lgpdMetadata.userAgent}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhum membro cadastrado até o momento.</p>
        </div>
      )}
    </div>
  );
}
