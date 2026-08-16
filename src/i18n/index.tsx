import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppLocale, PHRASES, TERMS } from './catalog';

const STORAGE_KEY = 'mv-maker-language';
const LOCALE_INDEX: Record<AppLocale, number> = { 'zh-CN': 0, en: 1, ja: 2, ko: 3 };
const exact = new Map(PHRASES.map((row) => [row[0], row]));
const terms = [...TERMS].sort((a, b) => b[0].length - a[0].length);
let activeLocale: AppLocale = 'zh-CN';

export const translateText = (input: unknown, locale = activeLocale): string => {
  const source = String(input ?? '');
  if (locale === 'zh-CN' || !/[\u3400-\u9fff]/u.test(source)) return source;
  const index = LOCALE_INDEX[locale];
  const direct = exact.get(source);
  if (direct) return direct[index];
  let output = source;
  for (const row of [...PHRASES, ...terms].sort((a, b) => b[0].length - a[0].length)) {
    if (output.includes(row[0])) output = output.split(row[0]).join(row[index]);
  }
  return output;
};

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (text: unknown) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const nodeState = new WeakMap<Node, { original: string; rendered: string }>();
const attrState = new WeakMap<Element, Map<string, { original: string; rendered: string }>>();
const LOCALIZED_ATTRIBUTES = ['title', 'placeholder', 'aria-label'];

const localizeDocument = (locale: AppLocale) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const current = node.nodeValue ?? '';
    const previous = nodeState.get(node);
    const original = previous && current === previous.rendered ? previous.original : current;
    const rendered = translateText(original, locale);
    nodeState.set(node, { original, rendered });
    if (current !== rendered) node.nodeValue = rendered;
    node = walker.nextNode();
  }
  document.querySelectorAll('*').forEach((element) => {
    const states = attrState.get(element) ?? new Map();
    for (const name of LOCALIZED_ATTRIBUTES) {
      const current = element.getAttribute(name);
      if (current === null) continue;
      const previous = states.get(name);
      const original = previous && current === previous.rendered ? previous.original : current;
      const rendered = translateText(original, locale);
      states.set(name, { original, rendered });
      if (current !== rendered) element.setAttribute(name, rendered);
    }
    attrState.set(element, states);
  });
};

export const I18nProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [locale, updateLocale] = useState<AppLocale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved in LOCALE_INDEX ? saved as AppLocale : 'zh-CN';
  });
  activeLocale = locale;

  const setLocale = useCallback((next: AppLocale) => {
    activeLocale = next;
    localStorage.setItem(STORAGE_KEY, next);
    updateLocale(next);
  }, []);

  useEffect(() => {
    activeLocale = locale;
    document.documentElement.lang = locale;
    localizeDocument(locale);
    const observer = new MutationObserver(() => queueMicrotask(() => localizeDocument(locale)));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: LOCALIZED_ATTRIBUTES });
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    window.alert = (message) => nativeAlert(translateText(message, locale));
    window.confirm = (message) => nativeConfirm(translateText(message, locale));
    return () => {
      observer.disconnect();
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
    };
  }, [locale]);

  const t = useCallback((text: unknown) => translateText(text, locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
};
