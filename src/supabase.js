import { createClient } from '@supabase/supabase-js'

const ENV_URL = import.meta.env.VITE_SUPABASE_URL || ''
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const LS_KEY = 'hisab.supabase.config'

export function loadConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c.url && c.key) return c
    }
  } catch (_) {}
  if (ENV_URL && ENV_KEY) return { url: ENV_URL, key: ENV_KEY }
  return null
}

export function saveConfig(url, key) {
  localStorage.setItem(LS_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }))
}

export function clearConfig() {
  localStorage.removeItem(LS_KEY)
}

let client = null

export function getClient(cfg) {
  if (!cfg) return null
  if (!client) {
    client = createClient(cfg.url, cfg.key)
  }
  return client
}
