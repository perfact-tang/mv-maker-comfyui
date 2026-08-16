import React from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { AppLocale } from '../i18n/catalog';
import { useI18n } from '../i18n';

const OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
];

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useI18n();
  return (
    <div className="fixed right-4 top-4 z-[200] flex items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 py-2 shadow-xl backdrop-blur-md md:right-6 md:top-5">
      <Languages size={16} className="text-neon-cyan" aria-hidden="true" />
      <label htmlFor="app-language" className="sr-only">语言 / Language</label>
      <div className="relative">
        <select
          id="app-language"
          value={locale}
          onChange={(event) => setLocale(event.target.value as AppLocale)}
          className="appearance-none bg-transparent py-0.5 pl-0 pr-6 text-xs font-semibold text-gray-200 outline-none"
          aria-label="语言 / Language"
        >
          {OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-gray-950">{option.label}</option>)}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      </div>
    </div>
  );
};
