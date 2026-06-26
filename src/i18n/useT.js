import { useUIStore } from '../store/uiStore'
import { translations } from './translations'

export function useT() {
  const lang = useUIStore((s) => s.lang)
  const dict = translations[lang] || translations.en

  const t = (key, vars) => {
    let str = dict[key] ?? translations.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }
    return str
  }

  return { t, lang }
}
