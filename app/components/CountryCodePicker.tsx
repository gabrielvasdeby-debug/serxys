import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface Country {
  code: string;
  flag: string;
  name: string;
  dialCode: string;
}

export const countries: Country[] = [
  { code: 'BR', flag: '🇧🇷', name: 'Brasil', dialCode: '+55' },
  { code: 'US', flag: '🇺🇸', name: 'United States', dialCode: '+1' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dialCode: '+351' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', dialCode: '+54' },
  { code: 'ES', flag: '🇪🇸', name: 'España', dialCode: '+34' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dialCode: '+33' },
  { code: 'IT', flag: '🇮🇹', name: 'Italia', dialCode: '+39' },
  { code: 'DE', flag: '🇩🇪', name: 'Deutschland', dialCode: '+49' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dialCode: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dialCode: '+1' },
  { code: 'UY', flag: '🇺🇾', name: 'Uruguay', dialCode: '+598' },
  { code: 'PY', flag: '🇵🇾', name: 'Paraguay', dialCode: '+595' },
  { code: 'CL', flag: '🇨🇱', name: 'Chile', dialCode: '+56' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia', dialCode: '+57' },
  { code: 'MX', flag: '🇲🇽', name: 'México', dialCode: '+52' },
];

interface CountryCodePickerProps {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  disabled?: boolean;
}

export default function CountryCodePicker({ selectedCountry, onSelect, disabled }: CountryCodePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-sm hover:border-zinc-700 transition-colors focus:outline-none focus:border-[#00E676] disabled:opacity-50 h-full min-w-[90px] justify-center shrink-0"
      >
        <span className="text-xl leading-none shrink-0">{selectedCountry.flag}</span>
        <span className="text-sm font-bold text-zinc-300 whitespace-nowrap shrink-0">{selectedCountry.dialCode}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-[#141414] border border-zinc-800 rounded-md shadow-2xl z-[100] custom-scrollbar">
          <div className="p-1">
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onSelect(country);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm transition-colors hover:bg-white/5 ${
                  selectedCountry.code === country.code ? 'bg-[#00E676]/10 text-[#00E676]' : 'text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{country.flag}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold uppercase tracking-wider">{country.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{country.dialCode}</span>
                  </div>
                </div>
                {selectedCountry.code === country.code && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
