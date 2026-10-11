/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { motion } from 'motion/react';
import {
  Users,
  Calendar,
  Heart,
  Briefcase,
  Search,
  Filter,
  Cake,
  Camera,
  Church,
  TrendingUp,
  UserCheck,
  X,
  Phone,
  Table as TableIcon,
  FileText,
  Sparkles,
  ArrowUpDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import { calculateAge, getEffectiveAge, getBirthMonthAndDay, formatAge } from '../lib/dateUtils';

export { calculateAge, getBirthMonthAndDay, getEffectiveAge, formatAge };

interface DashboardOverviewProps {
  members: Member[];
  onSelectMemberForEdit?: (member: Member) => void;
  onGoToMembersManagement?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DashboardOverview({
  members,
  onSelectMemberForEdit,
  onGoToMembersManagement,
}: DashboardOverviewProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedOccupation, setSelectedOccupation] = useState<string>('all');
  const [selectedOriginChurch, setSelectedOriginChurch] = useState<string>('all');
  const [hasPhotoFilter, setHasPhotoFilter] = useState<string>('all');
  const [birthdayFilterMode, setBirthdayFilterMode] = useState<'all' | 'current_month' | 'next_month' | 'today'>('all');

  // Active Tab inside Dashboard (Visão Geral vs Lista Detalhada Filtrada)
  const [activeView, setActiveView] = useState<'overview' | 'birthdays' | 'table'>('overview');

  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  // Distinct occupations and churches for dropdowns
  const { uniqueOccupations, uniqueChurches } = useMemo(() => {
    const occupationsSet = new Set<string>();
    const churchesSet = new Set<string>();

    members.forEach((m) => {
      if (m.profession && m.profession.trim()) {
        occupationsSet.add(m.profession.trim());
      }
      if (m.originChurch && m.originChurch.trim()) {
        churchesSet.add(m.originChurch.trim());
      }
    });

    return {
      uniqueOccupations: Array.from(occupationsSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      uniqueChurches: Array.from(churchesSet).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };
  }, [members]);

  // Overall General Stats (Unfiltered)
  const overallStats = useMemo(() => {
    const total = members.length;
    let totalAge = 0;
    let ageCount = 0;
    let withPhoto = 0;
    let lgpdAccepted = 0;

    const maritalCounts: Record<string, number> = {
      'Solteiro(a)': 0,
      'Casado(a)': 0,
      'Viúvo(a)': 0,
    };

    const ageGroups = {
      criancas: 0, // 0-12
      adolescentes: 0, // 13-17
      jovens: 0, // 18-29
      adultos: 0, // 30-49
      maduros: 0, // 50-59
      idosos: 0, // 60+
    };

    const currentMonthBirthdays: { member: Member; day: number; ageTurn: number | null }[] = [];
    const todayBirthdays: Member[] = [];

    const occupationFrequency: Record<string, number> = {};

    members.forEach((m) => {
      const age = getEffectiveAge(m);
      if (age !== null && age >= 0) {
        totalAge += age;
        ageCount++;

        if (age <= 12) ageGroups.criancas++;
        else if (age <= 17) ageGroups.adolescentes++;
        else if (age <= 29) ageGroups.jovens++;
        else if (age <= 49) ageGroups.adultos++;
        else if (age <= 59) ageGroups.maduros++;
        else ageGroups.idosos++;
      }

      if (m.photoUrl) withPhoto++;
      if (m.lgpdConsent) lgpdAccepted++;

      if (m.maritalStatus && maritalCounts[m.maritalStatus] !== undefined) {
        maritalCounts[m.maritalStatus]++;
      }

      if (m.profession && m.profession.trim()) {
        const occ = m.profession.trim();
        occupationFrequency[occ] = (occupationFrequency[occ] || 0) + 1;
      }

      const bInfo = getBirthMonthAndDay(m.dob);
      if (bInfo) {
        if (bInfo.month === currentMonth) {
          const ageTurn = age !== null ? age + (currentDay >= bInfo.day ? 0 : 1) : null;
          currentMonthBirthdays.push({ member: m, day: bInfo.day, ageTurn });
          if (bInfo.day === currentDay) {
            todayBirthdays.push(m);
          }
        }
      }
    });

    currentMonthBirthdays.sort((a, b) => a.day - b.day);

    const sortedOccupations = Object.entries(occupationFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

    return {
      total,
      avgAge,
      withPhoto,
      photoPercentage: total > 0 ? Math.round((withPhoto / total) * 100) : 0,
      lgpdAccepted,
      lgpdPercentage: total > 0 ? Math.round((lgpdAccepted / total) * 100) : 0,
      maritalCounts,
      ageGroups,
      currentMonthBirthdays,
      todayBirthdays,
      topOccupations: sortedOccupations,
      uniqueOccupationsCount: Object.keys(occupationFrequency).length,
    };
  }, [members, currentMonth, currentDay]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search term (name, email, phone, profession, church, address)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = member.name?.toLowerCase().includes(term);
        const matchesEmail = member.email?.toLowerCase().includes(term);
        const matchesPhone = member.phone?.toLowerCase().includes(term);
        const matchesProf = member.profession?.toLowerCase().includes(term);
        const matchesChurch = member.originChurch?.toLowerCase().includes(term);
        const matchesAddr = member.address?.toLowerCase().includes(term);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesProf && !matchesChurch && !matchesAddr) {
          return false;
        }
      }

      // Age Group Filter
      const age = getEffectiveAge(member);
      if (selectedAgeGroup !== 'all') {
        if (age === null) return false;
        if (selectedAgeGroup === '0-12' && (age < 0 || age > 12)) return false;
        if (selectedAgeGroup === '13-17' && (age < 13 || age > 17)) return false;
        if (selectedAgeGroup === '18-29' && (age < 18 || age > 29)) return false;
        if (selectedAgeGroup === '30-49' && (age < 30 || age > 49)) return false;
        if (selectedAgeGroup === '50-59' && (age < 50 || age > 59)) return false;
        if (selectedAgeGroup === '60+' && age < 60) return false;
      }

      // Marital Status Filter
      if (selectedMaritalStatus !== 'all' && member.maritalStatus !== selectedMaritalStatus) {
        return false;
      }

      // Month of Birth
      const bInfo = getBirthMonthAndDay(member.dob);
      if (selectedMonth !== 'all') {
        const mNum = parseInt(selectedMonth, 10);
        if (!bInfo || bInfo.month !== mNum) return false;
      }

      // Quick Birthday Filter Mode
      if (birthdayFilterMode !== 'all') {
        if (!bInfo) return false;
        if (birthdayFilterMode === 'current_month' && bInfo.month !== currentMonth) return false;
        if (birthdayFilterMode === 'next_month' && bInfo.month !== nextMonth) return false;
        if (birthdayFilterMode === 'today' && (bInfo.month !== currentMonth || bInfo.day !== currentDay)) return false;
      }

      // Occupation Filter
      if (selectedOccupation !== 'all') {
        if (selectedOccupation === '__none__') {
          if (member.profession && member.profession.trim()) return false;
        } else {
          if (member.profession?.trim() !== selectedOccupation) return false;
        }
      }

      // Origin Church Filter
      if (selectedOriginChurch !== 'all' && member.originChurch?.trim() !== selectedOriginChurch) {
        return false;
      }

      // Photo Filter
      if (hasPhotoFilter === 'yes' && !member.photoUrl) return false;
      if (hasPhotoFilter === 'no' && member.photoUrl) return false;

      return true;
    });
  }, [
    members,
    searchTerm,
    selectedAgeGroup,
    selectedMaritalStatus,
    selectedMonth,
    birthdayFilterMode,
    selectedOccupation,
    selectedOriginChurch,
    hasPhotoFilter,
    currentMonth,
    currentDay,
    nextMonth,
  ]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedAgeGroup !== 'all' ||
    selectedMaritalStatus !== 'all' ||
    selectedMonth !== 'all' ||
    selectedOccupation !== 'all' ||
    selectedOriginChurch !== 'all' ||
    hasPhotoFilter !== 'all' ||
    birthdayFilterMode !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedAgeGroup('all');
    setSelectedMaritalStatus('all');
    setSelectedMonth('all');
    setSelectedOccupation('all');
    setSelectedOriginChurch('all');
    setHasPhotoFilter('all');
    setBirthdayFilterMode('all');
  };

  // WhatsApp Birthday message generator
  const getWhatsAppBirthdayLink = (member: Member) => {
    const cleanPhone = member.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const firstName = member.name.split(' ')[0];
    const message = encodeURIComponent(
      `Graça e paz, ${firstName}! A família IBCIP deseja a você um feliz aniversário! Que Deus continue abençoando abundantemente a sua vida, seus caminhos e sua família. Parabéns!`
    );
    return `https://wa.me/${phoneWithCountry}?text=${message}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header of Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={26} />
            Panorama & Inteligência Pastoral
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Visão consolidada da IBCIP • Conheça o perfil, idades, vocações e aniversários dos membros
          </p>
        </div>

        {/* View Switcher inside Dashboard */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl text-xs font-semibold text-gray-600 self-start md:self-auto">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'overview'
                ? 'bg-white text-blue-700 shadow-sm font-bold'
                : 'hover:text-gray-900'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveView('birthdays')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'birthdays'
                ? 'bg-white text-purple-700 shadow-sm font-bold'
                : 'hover:text-gray-900'
            }`}
          >
            <Cake size={13} className="text-purple-600" />
            Aniversariantes ({overallStats.currentMonthBirthdays.length})
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeView === 'table'
                ? 'bg-white text-emerald-700 shadow-sm font-bold'
                : 'hover:text-gray-900'
            }`}
          >
            <TableIcon size={13} className="text-emerald-600" />
            Lista Filtrada ({filteredMembers.length})
          </button>
        </div>
      </div>

      {/* Highlights / Alert if anyone has a birthday today */}
      {overallStats.todayBirthdays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Cake size={24} className="text-yellow-300 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-yellow-400 text-yellow-950 text-xs font-black rounded-full uppercase tracking-wider mb-0.5">
                <Sparkles size={11} /> Aniversariante(s) de Hoje!
              </div>
              <p className="text-sm font-medium text-purple-100">
                Hoje celebramos:{' '}
                <span className="font-bold text-white">
                  {overallStats.todayBirthdays.map((b) => b.name).join(', ')}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {overallStats.todayBirthdays.map((b) => (
              <a
                key={b.id || b.name}
                href={getWhatsAppBirthdayLink(b)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-white text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Phone size={13} className="text-green-600" /> Parabéns {b.name.split(' ')[0]}
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* Total Membros */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Membros</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{overallStats.total}</div>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Cadastrados no total</p>
          </div>
        </div>

        {/* Média de Idade */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Média Idade</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{overallStats.avgAge} <span className="text-xs font-semibold text-gray-500">anos</span></div>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Média da igreja</p>
          </div>
        </div>

        {/* Aniversariantes do Mês */}
        <div 
          onClick={() => setActiveView('birthdays')}
          className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between cursor-pointer hover:border-purple-300 transition-all group"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Aniversários</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Cake size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">{overallStats.currentMonthBirthdays.length}</div>
            <p className="text-[11px] text-purple-600 mt-0.5 font-semibold flex items-center gap-0.5">
              Neste mês ({MONTH_NAMES[currentMonth - 1]})
            </p>
          </div>
        </div>

        {/* Casados */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Casados</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <Heart size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {overallStats.maritalCounts['Casado(a)']}
              <span className="text-xs font-semibold text-gray-500 ml-1">
                ({overallStats.total > 0 ? Math.round((overallStats.maritalCounts['Casado(a)'] / overallStats.total) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              {overallStats.maritalCounts['Solteiro(a)']} Solteiros
            </p>
          </div>
        </div>

        {/* Ocupações / Vocação */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ocupações</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Briefcase size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{overallStats.uniqueOccupationsCount}</div>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Áreas profissionais</p>
          </div>
        </div>

        {/* Com Foto */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Fotos</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <Camera size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {overallStats.photoPercentage}%
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              {overallStats.withPhoto} de {overallStats.total} com foto
            </p>
          </div>
        </div>
      </div>

      {/* FILTER BAR - Expandable / Always accessible */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm">Filtros Avançados de Membros</h3>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {filteredMembers.length} de {members.length} membros
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 self-start md:self-auto px-2.5 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X size={14} /> Limpar Todos os Filtros
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600 flex items-center gap-1">
              <Search size={12} /> Busca Rápida
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, e-mail, telefone..."
                className="w-full px-3 py-2 pl-8 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs text-gray-800"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Faixa Etária */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600">Faixa Etária</label>
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-800 bg-white"
            >
              <option value="all">Todas as faixas etárias</option>
              <option value="0-12">Crianças (0 a 12 anos)</option>
              <option value="13-17">Adolescentes (13 a 17 anos)</option>
              <option value="18-29">Jovens (18 a 29 anos)</option>
              <option value="30-49">Adultos (30 a 49 anos)</option>
              <option value="50-59">Adultos Maduros (50 a 59 anos)</option>
              <option value="60+">Melhor Idade (60+ anos)</option>
            </select>
          </div>

          {/* Estado Civil */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600">Estado Civil</label>
            <select
              value={selectedMaritalStatus}
              onChange={(e) => setSelectedMaritalStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-800 bg-white"
            >
              <option value="all">Todos os estados civis</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
            </select>
          </div>

          {/* Mês de Aniversário */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600 flex items-center gap-1">
              <Cake size={12} /> Mês de Aniversário
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setBirthdayFilterMode('all');
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-800 bg-white"
            >
              <option value="all">Qualquer mês</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={(idx + 1).toString()}>
                  {m} {idx + 1 === currentMonth ? '• (Mês Atual)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Ocupação */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600 flex items-center gap-1">
              <Briefcase size={12} /> Ocupação / Vocação
            </label>
            <select
              value={selectedOccupation}
              onChange={(e) => setSelectedOccupation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-800 bg-white"
            >
              <option value="all">Todas as ocupações</option>
              {uniqueOccupations.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
              <option value="__none__">Não informada / Em branco</option>
            </select>
          </div>

          {/* Igreja de Origem */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600 flex items-center gap-1">
              <Church size={12} /> Igreja de Origem
            </label>
            <select
              value={selectedOriginChurch}
              onChange={(e) => setSelectedOriginChurch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-800 bg-white"
            >
              <option value="all">Todas as igrejas de origem</option>
              {uniqueChurches.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {/* Foto Cadastrada */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600 flex items-center gap-1">
              <Camera size={12} /> Foto de Perfil
            </label>
            <select
              value={hasPhotoFilter}
              onChange={(e) => setHasPhotoFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-gray-800 bg-white"
            >
              <option value="all">Todos os cadastros</option>
              <option value="yes">Apenas com foto</option>
              <option value="no">Sem foto cadastrada</option>
            </select>
          </div>

          {/* Atalhos Rápidos de Aniversário */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-600">Atalho Pastoral</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setBirthdayFilterMode(birthdayFilterMode === 'current_month' ? 'all' : 'current_month');
                  setSelectedMonth('all');
                }}
                className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                  birthdayFilterMode === 'current_month'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Mês Atual
              </button>
              <button
                type="button"
                onClick={() => {
                  setBirthdayFilterMode(birthdayFilterMode === 'today' ? 'all' : 'today');
                  setSelectedMonth('all');
                }}
                className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                  birthdayFilterMode === 'today'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Hoje
              </button>
            </div>
          </div>
        </div>

        {/* Filter Summary Actions */}
        {hasActiveFilters && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="text-slate-600 font-medium">
              Filtro ativo: exibindo <strong className="text-slate-900">{filteredMembers.length}</strong> de {members.length} membros.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportToExcel(filteredMembers)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <TableIcon size={14} /> Exportar Excel Filtrado
              </button>
              <button
                onClick={() => exportToPDF(filteredMembers)}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <FileText size={14} /> Exportar PDF Filtrado
              </button>
              <button
                onClick={() => setActiveView('table')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                Ver na Tabela
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: PANORAMA GERAL COM GRÁFICOS E ESTATÍSTICAS */}
      {activeView === 'overview' && (
        <div className="space-y-8">
          {/* Main Panorama Grid: Faixa Etária & Estado Civil */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Faixa Etária Distribution */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Distribuição por Faixa Etária
                  </h3>
                  <p className="text-gray-500 text-xs">Composição geracional da congregação</p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {overallStats.total} pessoas
                </span>
              </div>

              {/* Progress bars for age groups */}
              <div className="space-y-3.5">
                {[
                  { label: 'Crianças (0 a 12 anos)', count: overallStats.ageGroups.criancas, color: 'bg-emerald-500', groupKey: '0-12' },
                  { label: 'Adolescentes (13 a 17 anos)', count: overallStats.ageGroups.adolescentes, color: 'bg-teal-500', groupKey: '13-17' },
                  { label: 'Jovens (18 a 29 anos)', count: overallStats.ageGroups.jovens, color: 'bg-blue-500', groupKey: '18-29' },
                  { label: 'Adultos (30 a 49 anos)', count: overallStats.ageGroups.adultos, color: 'bg-indigo-500', groupKey: '30-49' },
                  { label: 'Adultos Maduros (50 a 59 anos)', count: overallStats.ageGroups.maduros, color: 'bg-purple-500', groupKey: '50-59' },
                  { label: 'Melhor Idade (60+ anos)', count: overallStats.ageGroups.idosos, color: 'bg-amber-500', groupKey: '60+' },
                ].map((item) => {
                  const percentage = overallStats.total > 0 ? Math.round((item.count / overallStats.total) * 100) : 0;
                  return (
                    <div
                      key={item.label}
                      onClick={() => {
                        setSelectedAgeGroup(item.groupKey);
                        setActiveView('table');
                      }}
                      className="group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors"
                      title="Clique para ver os membros desta faixa etária"
                    >
                      <div className="flex justify-between text-xs font-medium text-gray-700 mb-1.5">
                        <span className="flex items-center gap-1.5 group-hover:text-blue-600 font-semibold">
                          {item.label}
                          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-gray-900 font-bold">
                          {item.count} <span className="text-gray-500 font-normal">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estado Civil & Perfis */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Estado Civil */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                      <Heart size={18} className="text-rose-500" />
                      Estado Civil
                    </h3>
                    <p className="text-gray-500 text-xs">Estrutura familiar da congregação</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Casados', count: overallStats.maritalCounts['Casado(a)'], color: 'from-rose-500 to-pink-600', key: 'Casado(a)' },
                    { label: 'Solteiros', count: overallStats.maritalCounts['Solteiro(a)'], color: 'from-blue-500 to-indigo-600', key: 'Solteiro(a)' },
                    { label: 'Viúvos', count: overallStats.maritalCounts['Viúvo(a)'], color: 'from-amber-500 to-orange-600', key: 'Viúvo(a)' },
                  ].map((stat) => {
                    const percentage = overallStats.total > 0 ? Math.round((stat.count / overallStats.total) * 100) : 0;
                    return (
                      <div
                        key={stat.label}
                        onClick={() => {
                          setSelectedMaritalStatus(stat.key);
                          setActiveView('table');
                        }}
                        className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl cursor-pointer text-center transition-all group border border-gray-100"
                        title="Clique para filtrar"
                      >
                        <div className="text-2xl font-black text-gray-900 group-hover:scale-105 transition-transform">
                          {stat.count}
                        </div>
                        <div className="text-xs font-bold text-gray-600 mt-0.5">{stat.label}</div>
                        <div className="text-[11px] text-gray-500 font-medium">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>

                {/* LGPD & Conformidade Mini Card */}
                <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="text-emerald-600" size={18} />
                    <div>
                      <div className="text-xs font-bold text-emerald-900">Termos LGPD Aceitos</div>
                      <div className="text-[11px] text-emerald-700">
                        {overallStats.lgpdAccepted} de {overallStats.total} ({overallStats.lgpdPercentage}%) em total conformidade
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aniversariantes do Mês Preview */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                      <Cake size={18} className="text-purple-600" />
                      Aniversariantes de {MONTH_NAMES[currentMonth - 1]}
                    </h3>
                    <p className="text-gray-500 text-xs">Acompanhamento pastoral mensal</p>
                  </div>
                  <button
                    onClick={() => setActiveView('birthdays')}
                    className="text-xs text-purple-700 font-bold hover:underline"
                  >
                    Ver Todos ({overallStats.currentMonthBirthdays.length})
                  </button>
                </div>

                {overallStats.currentMonthBirthdays.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-3 text-center">
                    Nenhum aniversariante cadastrado neste mês.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {overallStats.currentMonthBirthdays.slice(0, 4).map(({ member, day, ageTurn }) => (
                      <div
                        key={member.id || member.name}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover border border-purple-100 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{member.name}</p>
                            <p className="text-[10px] text-gray-500">
                              Dia {day} • {ageTurn !== null ? `fará ${ageTurn} anos` : ''}
                            </p>
                          </div>
                        </div>

                        <a
                          href={getWhatsAppBirthdayLink(member)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-white rounded-lg transition-colors shrink-0"
                          title="Felicitar no WhatsApp"
                        >
                          <Phone size={15} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panorama de Ocupações & Vocação dos Membros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ocupações */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Briefcase size={18} className="text-amber-600" />
                    Ocupações & Vocações na Igreja
                  </h3>
                  <p className="text-gray-500 text-xs">
                    Identifique talentos e profissionais para ministérios e apoio mútuo
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                  {overallStats.uniqueOccupationsCount} ocupações
                </span>
              </div>

              {overallStats.topOccupations.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  Nenhuma ocupação cadastrada ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {overallStats.topOccupations.map(([occ, count]) => (
                    <div
                      key={occ}
                      onClick={() => {
                        setSelectedOccupation(occ);
                        setActiveView('table');
                      }}
                      className="p-3 bg-amber-50/50 hover:bg-amber-100/70 rounded-2xl cursor-pointer transition-colors border border-amber-100 flex items-center justify-between group"
                      title={`Ver todos os ${occ}`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-gray-800 truncate group-hover:text-amber-800">{occ}</p>
                        <p className="text-[10px] text-gray-500">Membros ativos</p>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-black text-xs rounded-lg shrink-0">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Igrejas de Origem */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Church size={18} className="text-blue-600" />
                    Igrejas de Origem
                  </h3>
                  <p className="text-gray-500 text-xs">Histórico de comunhão e congregações anteriores</p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  {uniqueChurches.length} origens
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {uniqueChurches.slice(0, 8).map((churchName) => {
                  const count = members.filter((m) => m.originChurch === churchName).length;
                  return (
                    <div
                      key={churchName}
                      onClick={() => {
                        setSelectedOriginChurch(churchName);
                        setActiveView('table');
                      }}
                      className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors group"
                      title="Clique para filtrar"
                    >
                      <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-700">
                        {churchName}
                      </span>
                      <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                        {count} {count === 1 ? 'membro' : 'membros'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ANIVERSARIANTES COMPLETO */}
      {activeView === 'birthdays' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Cake className="text-purple-600" size={22} />
                Aniversariantes do Mês ({MONTH_NAMES[currentMonth - 1]})
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                Envie uma mensagem pastoral de bênção diretamente pelo WhatsApp com 1 clique
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-800 bg-purple-50 px-3 py-1 rounded-full">
                {overallStats.currentMonthBirthdays.length} aniversariantes neste mês
              </span>
            </div>
          </div>

          {overallStats.currentMonthBirthdays.length === 0 ? (
            <div className="text-center py-16 bg-purple-50/50 rounded-2xl border border-dashed border-purple-200">
              <Cake size={40} className="mx-auto text-purple-300 mb-2" />
              <p className="text-sm font-semibold text-purple-900">Nenhum aniversariante em {MONTH_NAMES[currentMonth - 1]}</p>
              <p className="text-xs text-purple-600 mt-1">Selecione outro mês nos filtros acima para consultar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overallStats.currentMonthBirthdays.map(({ member, day, ageTurn }) => {
                const isToday = day === currentDay;
                return (
                  <div
                    key={member.id || member.name}
                    className={`p-4 rounded-2xl border transition-all ${
                      isToday
                        ? 'bg-purple-50/80 border-purple-300 shadow-md ring-2 ring-purple-400'
                        : 'bg-white border-gray-100 hover:border-purple-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-purple-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 font-bold text-lg flex items-center justify-center">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{member.name}</h4>
                            {isToday && (
                              <span className="px-1.5 py-0.5 bg-yellow-400 text-yellow-950 font-black text-[9px] rounded-md uppercase">
                                Hoje!
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-purple-700 font-semibold mt-0.5">
                            Dia {day} de {MONTH_NAMES[currentMonth - 1]}
                          </p>
                          {ageTurn !== null && (
                            <p className="text-[11px] text-gray-500">Completando {ageTurn} anos</p>
                          )}
                        </div>
                      </div>

                      <a
                        href={getWhatsAppBirthdayLink(member)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs shrink-0"
                        title="Enviar parabéns no WhatsApp"
                      >
                        <Phone size={13} /> Parabéns
                      </a>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{member.maritalStatus}</span>
                      <span>{member.profession || 'Ocupação não informada'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TABELA DETALHADA DE RESULTADOS FILTRADOS */}
      {activeView === 'table' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <TableIcon size={18} className="text-emerald-600" />
                Membros Filtrados no Panorama
              </h3>
              <p className="text-gray-500 text-xs">
                Exibindo {filteredMembers.length} de {members.length} membros com base nos filtros selecionados
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportToExcel(filteredMembers)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <TableIcon size={14} /> Baixar Excel
              </button>
              <button
                onClick={() => exportToPDF(filteredMembers)}
                className="px-3 py-1.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <FileText size={14} /> Baixar PDF
              </button>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">Nenhum membro encontrado com estes filtros</p>
              <button
                onClick={resetFilters}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Membro</th>
                    <th className="py-3 px-3">Idade / Nasc.</th>
                    <th className="py-3 px-3">Estado Civil</th>
                    <th className="py-3 px-3">Ocupação</th>
                    <th className="py-3 px-3">Igreja de Origem</th>
                    <th className="py-3 px-3">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => {
                    const age = getEffectiveAge(member);
                    return (
                      <tr key={member.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                                {member.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-900">{member.name}</div>
                              <div className="text-[11px] text-gray-500 truncate max-w-[200px]">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-gray-800">
                            {age !== null ? `${age} anos` : 'N/A'}
                          </span>
                          <span className="block text-[11px] text-gray-400">
                            {member.dob.split('-').reverse().join('/')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[11px]">
                            {member.maritalStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-gray-800 font-medium">
                            {member.profession || <span className="text-gray-400 italic">Não informada</span>}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-700 font-medium">
                          {member.originChurch}
                        </td>
                        <td className="py-3 px-3">
                          <a
                            href={`https://wa.me/${member.phone.replace(/\D/g, '').startsWith('55') ? member.phone.replace(/\D/g, '') : '55' + member.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg font-semibold transition-colors"
                          >
                            <Phone size={12} /> {member.phone}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
