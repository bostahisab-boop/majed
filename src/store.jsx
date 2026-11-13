import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { loadConfig, getClient } from './supabase.js'

const Ctx = createContext(null)
const LS_COMPANY = 'hisab.activeCompany'

export function StoreProvider({ children }) {
  const [cfg, setCfg] = useState(() => loadConfig())
  const [sb, setSb] = useState(null)
  const [companies, setCompanies] = useState([])
  const [activeCompany, setActiveCompanyId] = useState(() =>
    localStorage.getItem(LS_COMPANY) || ''
  )
  const [loading, setLoading] = useState(!!loadConfig())

  useEffect(() => {
    if (cfg) setSb(getClient(cfg))
  }, [cfg])

  const refreshCompanies = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const { data, error } = await sb
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) {
      setCompanies(data || [])
      setActiveCompanyId((cur) => {
        if (cur && data?.some((c) => c.id === cur)) return cur
        const first = data?.[0]?.id || ''
        localStorage.setItem(LS_COMPANY, first)
        return first
      })
    }
    setLoading(false)
  }, [sb])

  useEffect(() => {
    if (sb) refreshCompanies()
  }, [sb, refreshCompanies])

  const selectCompany = (id) => {
    localStorage.setItem(LS_COMPANY, id)
    setActiveCompanyId(id)
  }

  const company = companies.find((c) => c.id === activeCompany) || null

  const value = { cfg, setCfg, sb, companies, company, activeCompany, selectCompany, refreshCompanies, loading }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  return useContext(Ctx)
}
