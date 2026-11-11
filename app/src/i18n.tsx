import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations as englishTranslations } from './locales/en'
import { translations as frenchTranslations } from './locales/fr'
import { translations as russianTranslations } from './locales/ru'
import type { Language, TranslationCatalog } from './locales/types'

export type { Language, TranslationCatalog } from './locales/types'

const STORAGE_KEY = 'opennvr.language'

const translations: Record<Language, TranslationCatalog> = {
  en: englishTranslations,
  fr: frenchTranslations,
  ru: russianTranslations,
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'fr' || stored === 'ru') return stored
  } catch {
    // Storage may be unavailable in private browsing.
  }

  const browserLanguage = navigator.language.toLowerCase()
  if (browserLanguage.startsWith('ru')) return 'ru'
  return browserLanguage.startsWith('fr') ? 'fr' : 'en'
}

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)
  const setLanguage = (next: Language) => setLanguageState(next)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Storage may be unavailable in private browsing.
    }
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values) => {
      const text = translations[language][key] ?? translations.en[key] ?? key
      return values ? text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? `{{${name}}}`)) : text
    },
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useTranslation must be used inside I18nProvider')
  return context
}

export function getDateLocale(language: Language) {
  if (language === 'ru') return 'ru-RU'
  return language === 'fr' ? 'fr-FR' : 'en-US'
}

const _d = (value: string | number | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export type DateFormatters = {
  locale: string
  time: (v: string | number | Date | null | undefined, o?: Intl.DateTimeFormatOptions) => string
  date: (v: string | number | Date | null | undefined, o?: Intl.DateTimeFormatOptions) => string
  dateTime: (v: string | number | Date | null | undefined, o?: Intl.DateTimeFormatOptions) => string
  number: (v: number | null | undefined, o?: Intl.NumberFormatOptions) => string
}

export function dateFormatters(language: Language): DateFormatters {
  const locale = getDateLocale(language)
  return {
    locale,
    time: (v, o) => _d(v)?.toLocaleTimeString(locale, o ?? { hour: '2-digit', minute: '2-digit' }) ?? '—',
    date: (v, o) => _d(v)?.toLocaleDateString(locale, o) ?? '—',
    dateTime: (v, o) => _d(v)?.toLocaleString(locale, o) ?? '—',
    number: (v, o) => typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(locale, o) : '—',
  }
}

export function useDateFormat(): DateFormatters {
  const { language } = useTranslation()
  return useMemo(() => dateFormatters(language
                                     ), [language])
}
