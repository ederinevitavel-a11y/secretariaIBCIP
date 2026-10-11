/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Member } from '../types';
import { getEffectiveAge } from './dateUtils';

export const exportToExcel = (members: Member[]) => {
  const data = members.map(m => {
    let formattedDob = m.dob || '';
    if (m.dob && m.dob.includes('-')) {
      const parts = m.dob.split('-');
      if (parts.length === 3) {
        formattedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const effectiveAge = getEffectiveAge(m);

    return {
      Nome: m.name,
      'Data de Nascimento': formattedDob,
      Idade: effectiveAge !== null ? effectiveAge : '',
      Email: m.email,
      Telefone: m.phone,
      Endereço: m.address,
      'Estado Civil': m.maritalStatus,
      Ocupação: m.profession || 'Não informado',
      'Igreja de Origem': m.originChurch,
      LGPD: m.lgpdConsent ? 'Sim' : 'Não',
      'Log LGPD': m.lgpdMetadata ? `Sim (${new Date(m.lgpdMetadata.acceptedAt).toLocaleString('pt-BR')})` : 'Não',
      'Data LGPD': m.lgpdConsentDate ? new Date(m.lgpdConsentDate).toLocaleDateString('pt-BR') : '',
      'Data de Cadastro': new Date(m.createdAt?.seconds * 1000).toLocaleDateString(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Membros');
  XLSX.writeFile(workbook, 'membros_igreja.xlsx');
};

export const exportToPDF = (members: Member[]) => {
  const doc = new jsPDF();
  
  doc.text('Relatório de Membros IBCIP', 14, 15);
  
  const tableData = members.map(m => {
    let formattedDob = m.dob || '';
    if (m.dob && m.dob.includes('-')) {
      const parts = m.dob.split('-');
      if (parts.length === 3) {
        formattedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const effectiveAge = getEffectiveAge(m);

    return [
      m.name,
      formattedDob,
      effectiveAge !== null ? `${effectiveAge}` : '',
      m.email,
      m.phone,
      m.maritalStatus,
      m.profession || '-',
      m.originChurch,
      m.lgpdConsent ? 'Sim' : 'Não'
    ];
  });

  autoTable(doc, {
    head: [['Nome', 'Nasc.', 'Idade', 'Email', 'Tel.', 'Est. Civil', 'Ocupação', 'Igreja', 'LGPD']],
    body: tableData,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save('membros_igreja.pdf');
};
