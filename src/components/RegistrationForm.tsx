/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, setDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { db, storage, handleFirestoreError } from '../lib/firebase';
import { OperationType, Member } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Phone, MapPin, Calendar, Heart, Church, Camera, CheckCircle2, X, AlertCircle, Search, RefreshCw, Laptop } from 'lucide-react';
import Webcam from 'react-webcam';
import { PRE_DEFINED_MEMBERS } from '../data/memberNames';

interface RegistrationFormProps {
  memberToEdit?: Member;
  onCancel?: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export default function RegistrationForm({ memberToEdit, onCancel, onSuccess, isAdmin }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: memberToEdit?.name || '',
    dob: memberToEdit?.dob || '',
    email: memberToEdit?.email || '',
    phone: memberToEdit?.phone || '',
    address: memberToEdit?.address || '',
    maritalStatus: memberToEdit?.maritalStatus || 'Solteiro(a)',
    originChurch: memberToEdit?.originChurch || '',
    lgpdConsent: memberToEdit?.lgpdConsent || false,
  });
  const [photo, setPhoto] = useState<File | string | null>(null); // Can be File or base64 string
  const [photoPreview, setPhotoPreview] = useState<string | null>(memberToEdit?.photoUrl || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<string>('');
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredMembers = PRE_DEFINED_MEMBERS.filter(name => 
    name.toLowerCase().includes(formData.name.toLowerCase()) && 
    formData.name.length > 0 &&
    name !== formData.name
  );

  useEffect(() => {
    if (memberToEdit) {
      setFormData({
        name: memberToEdit.name,
        dob: memberToEdit.dob,
        email: memberToEdit.email,
        phone: memberToEdit.phone,
        address: memberToEdit.address,
        maritalStatus: memberToEdit.maritalStatus,
        originChurch: memberToEdit.originChurch,
        lgpdConsent: memberToEdit.lgpdConsent || false,
      });
    }
  }, [memberToEdit]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (photo instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(photo);
    } else if (typeof photo === 'string') {
      setPhotoPreview(photo);
    }
  }, [photo]);

  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(memberToEdit?.id || null);

  const isEditing = !!selectedMemberId || !!memberToEdit;

  // Search Firestore for members as user types
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      // Only search Firestore if user is admin
      if (isAdmin && formData.name.length >= 3 && !selectedMemberId && !memberToEdit) {
        setSearching(true);
        try {
          const q = query(
            collection(db, 'members'), 
            where('name', '>=', formData.name),
            where('name', '<=', formData.name + '\uffff')
          );
          const querySnapshot = await getDocs(q);
          const members: Member[] = [];
          querySnapshot.forEach((doc) => {
            members.push({ id: doc.id, ...doc.data() } as Member);
          });
          setDbMembers(members);
        } catch (err) {
          console.warn('Silent search permission error expected for non-admins:', err);
          setDbMembers([]);
        } finally {
          setSearching(false);
        }
      } else {
        setDbMembers([]);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [formData.name, selectedMemberId, memberToEdit, isAdmin]);

  const selectMember = (member: Member) => {
    setSelectedMemberId(member.id);
    setFormData({
      name: member.name,
      dob: member.dob || '',
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      maritalStatus: member.maritalStatus || 'Solteiro(a)',
      originChurch: member.originChurch || '',
      lgpdConsent: member.lgpdConsent || false,
    });
    setPhotoPreview(member.photoUrl || null);
    setShowSuggestions(false);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhoto(imageSrc);
      setIsCameraOpen(false);
    }
  }, [webcamRef]);

  const compressImage = (fileSource: File | string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = typeof fileSource === 'string' ? fileSource : URL.createObjectURL(fileSource);
      
      img.crossOrigin = "anonymous"; // Prevents tainted canvas if source is external
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Usamos um tamanho menor (200x200) para salvar diretamente no banco com segurança
        const MAX_SIZE = 200; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Retorna Base64 de alta compressão (qualidade 0.5)
        const base64 = canvas.toDataURL('image/jpeg', 0.5);
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Erro ao processar imagem.'));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.lgpdConsent) {
      setError('Você precisa concordar com o termo de consentimento da LGPD para continuar.');
      return;
    }

    setLoading(true);
    setError(null);
    setSubmissionStatus('Iniciando processamento...');

    try {
      const currentMember = memberToEdit || dbMembers.find(m => m.id === selectedMemberId);
      const memberId = selectedMemberId || memberToEdit?.id || doc(collection(db, 'members')).id;
      
      console.log('Iniciando submissão para ID:', memberId);

      // Prioridade: Foto enviada agora > Foto existente > Fallback
      let finalPhotoUrl = currentMember?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name)}`;

      // Se houver uma nova foto (arquivo), processamos para Base64
      if (photo) {
        setSubmissionStatus('Otimizando foto...');
        try {
          const base64Photo = await compressImage(photo);
          finalPhotoUrl = base64Photo; // Agora salvamos o Base64 direto
        } catch (photoErr) {
          console.error('Erro ao processar foto, seguindo com o padrão:', photoErr);
        }
      }

      setSubmissionStatus('Salvando cadastro...');
      
      const lgpdMetadata = formData.lgpdConsent ? {
        acceptedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: (navigator as any).platform || 'unknown',
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      } : (currentMember?.lgpdMetadata || null);

      const dataToSave = {
        ...formData,
        age: age || 0,
        photoUrl: finalPhotoUrl,
        lgpdConsentDate: formData.lgpdConsent ? (currentMember?.lgpdConsentDate || new Date().toISOString()) : null,
        lgpdMetadata,
        updatedAt: serverTimestamp(),
      };

      if (selectedMemberId || memberToEdit) {
        await updateDoc(doc(db, 'members', memberId), dataToSave);
      } else {
        await setDoc(doc(db, 'members', memberId), {
          ...dataToSave,
          id: memberId,
          createdAt: serverTimestamp(),
        });
      }

      // Tentativa de upload em background para o Storage (opcional, para redundância)
      if (photo) {
        (async () => {
          try {
            const storageRef = ref(storage, `members/${memberId}/photo`);
            if (typeof photo === 'string') {
              await uploadString(storageRef, photo, 'data_url');
            } else {
              await uploadBytes(storageRef, photo);
            }
            console.log('Backup da foto enviado ao Storage com sucesso.');
          } catch (stgErr) {
            console.warn('Backup no Storage falhou, mas a foto foi salva no banco (Base64).');
          }
        })();
      }

      if (selectedMemberId || memberToEdit) {
        setSubmissionStatus('Alterações salvas!');
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1500);
      } else {
        setSubmissionStatus('Cadastro finalizado!');
        setSubmitted(true);
      }
    } catch (err: any) {
      console.error('Detailed submission error:', err);
      let errorMessage = 'Falha ao finalizar o cadastro.';
      if (err.code === 'permission-denied') {
        errorMessage = 'Erro de permissão no servidor. Verifique se todos os campos obrigatórios estão preenchidos corretamente.';
      } else {
        errorMessage = `Erro: ${err.message || 'Desconhecido'}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setSubmissionStatus('');
    }
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    
    if (e.target.name === 'phone') {
      value = formatPhoneNumber(value);
    }

    setFormData(prev => ({ ...prev, [e.target.name]: value }));
    
    if (e.target.name === 'name' && !isEditing) {
      setShowSuggestions(true);
    }
  };

  const selectName = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    setShowSuggestions(false);
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

  const age = calculateAge(formData.dob);

  if (submitted && !isEditing) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl text-center"
      >
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h2>
        <p className="text-gray-600 mb-6">Seus dados foram enviados com sucesso para a secretaria da igreja.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Fazer novo cadastro
        </button>
      </motion.div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto ${isEditing ? 'py-0' : 'py-12'} px-4`}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-white flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{isEditing ? 'Editar Membro' : 'Cadastro IBCIP'}</h1>
            <p className="opacity-90">
              {isEditing ? 'Atualize as informações do membro.' : 'Por favor, preencha os dados abaixo para o registro de membro.'}
            </p>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 p-4 border-l-4 border-red-500 text-red-700 text-sm flex items-start gap-3 rounded-lg"
            >
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Nome */}
            <div className="space-y-2 relative md:col-span-3" ref={suggestionsRef}>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User size={16} /> Nome Completo
              </label>
              <div className="relative">
                <input
                  required
                  name="name"
                  autoComplete="off"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => !isEditing && setShowSuggestions(true)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-10"
                  placeholder={isEditing ? '' : "Pesquise seu nome aqui..."}
                />
                {!isEditing && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-2">
                    {searching && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
                    <Search size={18} className="text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {!isEditing && (
                <AnimatePresence>
                  {showSuggestions && (filteredMembers.length > 0 || dbMembers.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full bg-white mt-1 border border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                    >
                      {dbMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => selectMember(member)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <User size={14} className="text-blue-600" />
                            <span className="font-bold text-sm text-blue-900">{member.name}</span>
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">REGISTRADO</span>
                        </button>
                      ))}
                      {filteredMembers.map((name, idx) => (
                        <button
                          key={`local-${idx}`}
                          type="button"
                          onClick={() => selectName(name)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                        >
                          <User size={14} className="text-gray-400" />
                          <span className="font-medium text-sm">{name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              {selectedMemberId && (
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedMemberId(null);
                    setFormData(prev => ({ ...prev, name: '' }));
                    setPhotoPreview(null);
                  }}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1 mt-1"
                >
                  <X size={12} /> Limpar seleção e começar novo cadastro
                </button>
              )}
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar size={16} /> Data de Nascimento
              </label>
              <input
                required
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {age !== null && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg mt-1"
                >
                  <Calendar size={12} />
                  {age} {age === 1 ? 'ano' : 'anos'}
                </motion.div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2 md:col-span-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail size={16} /> E-mail
              </label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone size={16} /> Telefone
              </label>
              <input
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="(00) 000000000"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin size={16} /> Endereço Completo
            </label>
            <input
              required
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Rua, Número, Bairro, Cidade - UF"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Estado Civil */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Heart size={16} /> Estado Civil
              </label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
              </select>
            </div>

            {/* Igreja de Origem */}
            <div className="space-y-2 md:col-span-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Church size={16} /> Igreja de Origem (Batismo)
              </label>
              <input
                required
                name="originChurch"
                value={formData.originChurch}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Nome da igreja onde foi batizado"
              />
            </div>
          </div>

          {/* Foto */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Camera size={16} /> Foto de Perfil
            </label>
            
            <AnimatePresence>
              {isCameraOpen ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[300px] mx-auto shadow-2xl border-4 border-white">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user" }}
                      className="w-full h-full object-cover"
                      mirrored={false}
                      imageSmoothing={true}
                      disablePictureInPicture={true}
                      forceScreenshotSourceSize={true}
                      onUserMedia={() => {}}
                      onUserMediaError={() => {}}
                      screenshotQuality={0.92}
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button
                        type="button"
                        onClick={capture}
                        className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                        title="Tirar Foto"
                      >
                        <Camera size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(false)}
                        className="bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                        title="Cancelar"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <div className="shrink-0">
                    {photoPreview ? (
                      <div className="relative group">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhoto(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-400">
                        <Camera size={32} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label 
                        htmlFor="photo-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all shadow-sm"
                      >
                        <RefreshCw size={14} /> Selecionar Arquivo
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all shadow-sm"
                      >
                        <Laptop size={14} /> Usar Câmera
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 italic">
                      Se você não enviar uma foto, um avatar automático será gerado com base no seu nome.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* LGPD Consent */}
          <div className="space-y-6">
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex gap-4 items-start">
              <div className="pt-1">
                <input
                  required
                  type="checkbox"
                  id="lgpdConsent"
                  name="lgpdConsent"
                  checked={formData.lgpdConsent}
                  onChange={(e: any) => setFormData(prev => ({ ...prev, lgpdConsent: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <label htmlFor="lgpdConsent" className="text-xs sm:text-sm text-gray-700 leading-relaxed cursor-pointer select-none">
                <span className="font-bold text-blue-800 block mb-1">Termo de Consentimento - LGPD</span>
                Declaro estar ciente e de acordo com o tratamento de meus dados pessoais e de imagem pela Igreja, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Autorizo também o uso de imagem e dados de meus dependentes menores de 18 anos, sob minha responsabilidade, para fins exclusivos de registros internos e comunicações institucionais.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                <span>{submissionStatus || 'Enviando...'}</span>
              </>
            ) : (
              'Finalizar Cadastro'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
