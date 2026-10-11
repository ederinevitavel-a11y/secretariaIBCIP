/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calcula a idade atual precisamente a partir da data de nascimento (YYYY-MM-DD ou DD/MM/AAAA)
 * com base na data do sistema (hoje). Evita problemas de fuso horário UTC extraindo ano, mês e dia.
 */
export function calculateAge(dob?: string | null): number | null {
  if (!dob || typeof dob !== 'string') return null;
  const trimmed = dob.trim();
  if (!trimmed) return null;

  let birthYear: number;
  let birthMonth: number;
  let birthDay: number;

  if (trimmed.includes('-')) {
    // Formato padrão HTML date: YYYY-MM-DD
    const parts = trimmed.split('-');
    if (parts.length < 3) return null;
    birthYear = parseInt(parts[0], 10);
    birthMonth = parseInt(parts[1], 10);
    birthDay = parseInt(parts[2], 10);
  } else if (trimmed.includes('/')) {
    // Formato BR: DD/MM/AAAA
    const parts = trimmed.split('/');
    if (parts.length < 3) return null;
    birthDay = parseInt(parts[0], 10);
    birthMonth = parseInt(parts[1], 10);
    birthYear = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;
  if (birthYear < 1900 || birthYear > 2100) return null;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();

  let age = currentYear - birthYear;
  const monthDiff = currentMonth - birthMonth;

  if (monthDiff < 0 || (monthDiff === 0 && currentDay < birthDay)) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Retorna a idade efetiva do membro, sempre priorizando o cálculo dinâmico da data de nascimento
 * para que a idade se atualize automaticamente todos os anos sem defasagem.
 */
export function getEffectiveAge(member: { dob?: string | null; age?: number | null }): number | null {
  const dynamicAge = calculateAge(member.dob);
  if (dynamicAge !== null) return dynamicAge;
  if (typeof member.age === 'number' && member.age >= 0) return member.age;
  return null;
}

/**
 * Formata a idade com singular/plural ("1 ano", "35 anos" ou "-")
 */
export function formatAge(age: number | null | undefined): string {
  if (age === null || age === undefined || age < 0) return '-';
  return `${age} ${age === 1 ? 'ano' : 'anos'}`;
}

/**
 * Extrai mês e dia do aniversário (1 a 12 para mês, 1 a 31 para dia)
 */
export function getBirthMonthAndDay(dob?: string | null): { month: number; day: number } | null {
  if (!dob || typeof dob !== 'string') return null;
  const trimmed = dob.trim();
  let month = 0;
  let day = 0;

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length < 3) return null;
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length < 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  }

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}
