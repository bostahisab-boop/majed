import React from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { VOUCHER_TYPES } from '../utils.js'

const NAV = [
  { to: '/', label: 'ড্যাশবোর্ড', icon: '🏠', end: true },
  { to: '/daybook', label: 'দিনবই', icon: '📔' },
  { to: '/sales', label: 'বিক্রয় / চালান', icon: '🧾' },
  { to: '/purchases', label: 'ক্রয়', icon: '📦' },
  { to: '/expenses', label: 'খরচ', icon: '💸' },
  { to: '/customers', label: 'গ্রাহক', icon: '👥' },
  { to: '/suppliers', label: 'সরবরাহকারী', icon: '🚚' },
  { to: '/products', label: 'প্রোডাক্ট', icon: '🏷️' },
  { to: '/reports', label: 'রিপোর্ট', icon: '📊' },
  { to: '/companies', label: 'কোম্পানি', icon: '🏢' },
]

export default function Layout() {
  const { company, companies, selectCompany } = useStore()
  const nav = useNavigate()

  const newVoucher = (e) => {
    const type = e.target.value
    if (type) nav(`/voucher/new/${type}`)
    e.target.value = ''
  }

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <Link to="/" className="brand">
          <span className="brand-mark">হি</span>
          <span className="brand-name">হিসাব</span>
        </Link>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">হিসাব v১.০ — React + Supabase</div>
      </aside>
      <div className="main">
        <header className="topbar no-print">
          <div className="company-picker">
            {companies.length > 1 && (
              <select value={company?.id || ''} onChange={(e) => selectCompany(e.target.value)}>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {company && <span className="company-name">{company.name}</span>}
            {!company && <Link to="/companies" className="btn small">কোম্পানি যোগ করুন</Link>}
          </div>
          <div className="topbar-actions">
            <select className="btn primary as-select" defaultValue="" onChange={newVoucher}>
              <option value="" disabled>
                + নতুন ভাউচার
              </option>
              {Object.entries(VOUCHER_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
