import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { fetchVouchers, partyLedgerRows } from '../db.js'
import { money } from '../utils.js'
import { Modal, Card, Empty } from '../components/ui.jsx'

export default function PartyList({ kind }) {
  const { sb, company } = useStore()
  const isCustomer = kind === 'customer'
  const table = isCustomer ? 'customers' : 'suppliers'
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', opening_balance: '' })
  const [err, setErr] = useState('')

  const load = async () => {
    if (!sb || !company) return
    const [{ data: list }, vouchers] = await Promise.all([
      sb.from(table).select('*').eq('company_id', company.id).order('name'),
      fetchVouchers(sb, company.id, {}),
    ])
    const vByParty = {}
    for (const v of vouchers) if (v.party_id) (vByParty[v.party_id] ||= []).push(v)
    setRows(
      (list || []).map((p) => {
        const ledger = partyLedgerRows(vByParty[p.id] || [], kind, p.opening_balance)
        const bal = ledger.length ? ledger[ledger.length - 1].balance : Number(p.opening_balance) || 0
        return { ...p, balance: bal }
      })
    )
  }

  useEffect(() => {
    load()
  }, [sb, company])

  const openNew = () => {
    setForm({ name: '', phone: '', address: '', opening_balance: '' })
    setEditing('new')
  }
  const openEdit = (p) => {
    setForm({ name: p.name, phone: p.phone || '', address: p.address || '', opening_balance: p.opening_balance || '' })
    setEditing(p)
  }
  const save = async (e) => {
    e.preventDefault()
    setErr('')
    const payload = {
      company_id: company.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      opening_balance: Number(form.opening_balance) || 0,
    }
    const q = editing === 'new' ? sb.from(table).insert(payload) : sb.from(table).update(payload).eq('id', editing.id)
    const { error } = await q
    if (error) return setErr(error.message)
    setEditing(null)
    load()
  }
  const remove = async (p) => {
    if (!confirm(`"${p.name}" মুছে ফেলবেন?`)) return
    const { error } = await sb.from(table).delete().eq('id', p.id)
    if (error) alert(error.message)
    load()
  }

  const label = isCustomer ? 'গ্রাহক' : 'সরবরাহকারী'
  const totalDue = (rows || []).reduce((s, r) => s + Math.max(0, r.balance), 0)

  return (
    <div className="page">
      <div className="page-head">
        <h1>{label} তালিকা</h1>
        <button className="btn primary" onClick={openNew}>+ নতুন {label}</button>
      </div>
      <Card
        title={`${label} (${rows ? rows.length : '…'})`}
        action={<span className="chip">{isCustomer ? 'মোট পাওনা' : 'মোট দেনা'}: {money(totalDue)}</span>}
      >
        {!rows ? (
          <div className="loading">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <Empty text={`কোনো ${label} নেই — উপরের বাটন থেকে যোগ করুন`} />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>নাম</th><th>ফোন</th><th>ঠিকানা</th><th className="right">{isCustomer ? 'বাকি (পাওনা)' : 'দেনা'}</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/${isCustomer ? 'customers' : 'suppliers'}/${p.id}`}>{p.name}</Link></td>
                    <td>{p.phone}</td>
                    <td>{p.address}</td>
                    <td className={'right' + (p.balance > 0 ? ' out' : '')}>{money(p.balance)}</td>
                    <td className="actions">
                      <Link className="btn small" to={`/${isCustomer ? 'customers' : 'suppliers'}/${p.id}`}>লেজার</Link>
                      <button className="btn small" onClick={() => openEdit(p)}>এডিট</button>
                      <button className="btn small danger" onClick={() => remove(p)}>মুছুন</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? `নতুন ${label}` : `${label} এডিট`} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <label>নাম<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>ফোন<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>ঠিকানা<textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label>প্রারম্ভিক ব্যালেন্স<input value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} /></label>
            {err && <div className="form-error">{err}</div>}
            <div className="form-actions">
              <button className="btn primary" type="submit">সংরক্ষণ</button>
              <button type="button" className="btn" onClick={() => setEditing(null)}>বাতিল</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
