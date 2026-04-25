import { formatPhone } from './formatPhone';
import { formatDocument } from './formatDocument';

/**
 * Aplica uma máscara mantendo (na medida do possível) a posição do cursor.
 * @param input O elemento de entrada HTML
 * @param type O tipo de máscara ('phone' | 'document')
 * @returns O novo valor formatado
 */
export function applyMaskWithCursor(input: HTMLInputElement, type: 'phone' | 'document'): string {
  const value = input.value;
  const selectionStart = input.selectionStart || 0;
  
  // Conta quantos dígitos existem antes do cursor antes de formatar
  const digitsBeforeCursor = value.slice(0, selectionStart).replace(/\D/g, '').length;
  
  const formatted = type === 'phone' ? formatPhone(value) : formatDocument(value);
  
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
