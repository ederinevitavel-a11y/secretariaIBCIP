/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Member } from '../types';

export const exportToExcel = (members: Member[]) => {
  const data = members.map(m => {
    const [year, month, day] = m.dob.split('-');
    return {
      Nome: m.name,
      'Data de Nascimento': `${day}/${month}/${year}`,
      Idade: m.age || '',
      Email: m.email,
      Telefone: m.phone,
      Endereço: m.address,
      'Estado Civil': m.maritalStatus,
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
    const [year, month, day] = m.dob.split('-');
    return [
      m.name,
      `${day}/${month}/${year}`,
      m.age || '',
      m.email,
      m.phone,
      m.maritalStatus,
      m.originChurch,
      m.lgpdConsent ? 'Sim' : 'Não'
    ];
  });

  autoTable(doc, {
    head: [['Nome', 'Nasc.', 'Idade', 'Email', 'Tel.', 'Est. Civil', 'Igreja', 'LGPD']],
    body: tableData,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save('membros_igreja.pdf');
};
