"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getTranslation } from "@/lib/i18n"

type LanguageContextType = {
  language: string
  setLanguage: (language: string) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState("en")

  // Initialize language from localStorage on client side
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") || "en"
    setLanguageState(savedLanguage)
  }, [])

  // Set language and save to localStorage
  const setLanguage = (newLanguage: string) => {
    setLanguageState(newLanguage)
    localStorage.setItem("language", newLanguage)
  }

  // Translation function
  const t = (key: string) => {
    return getTranslation(language, key)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

// Safe version that returns fallback when outside provider (for components that may render outside provider)
export function useLanguageSafe() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    // Return fallback that uses English translations
    return {
      language: "en",
      setLanguage: () => {},
      t: (key: string) => getTranslation("en", key),
    }
  }
  return context
}

