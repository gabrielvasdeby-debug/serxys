import { formatPhone } from './formatPhone';
import { formatDocument } from './formatDocument';

/**
 * Formata uma string como data DD/MM/AAAA
 */
export function formatDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Aplica uma máscara mantendo (na medida do possível) a posição do cursor.
 * @param input O elemento de entrada HTML
 * @param type O tipo de máscara ('phone' | 'document' | 'date')
 * @returns O novo valor formatado
 */
export function applyMaskWithCursor(input: HTMLInputElement, type: 'phone' | 'document' | 'date'): string {
  const value = input.value;
  const selectionStart = input.selectionStart || 0;
  
  // Conta quantos dígitos existem antes do cursor antes de formatar
  const digitsBeforeCursor = value.slice(0, selectionStart).replace(/\D/g, '').length;
  
  let formatted = '';
  if (type === 'phone') formatted = formatPhone(value);
  else if (type === 'document') formatted = formatDocument(value);
  else if (type === 'date') formatted = formatDate(value);
  
  // Encontra a nova posição do cursor baseada na contagem de dígitos
  let newPosition = 0;
  let digitsFound = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (digitsFound >= digitsBeforeCursor) break;
    if (/\d/.test(formatted[i])) {
      digitsFound++;
    }
    newPosition = i + 1;
  }
  
  // Agenda a restauração da posição do cursor para o próximo frame (após o render do React)
  setTimeout(() => {
    input.setSelectionRange(newPosition, newPosition);
  }, 0);
  
  return formatted;
}
