import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { stockSummary } from '../db.js'
import { money, num } from '../utils.js'
import { Modal, Card, Empty } from '../components/ui.jsx'

const UNITS = ['পিস', 'কেজি', 'লিটার', 'প্যাকেট', 'বাক্স', 'ডজন', 'মিটার']

export default function Products() {
  const { sb, company } = useStore()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', sku: '', unit: UNITS[0], purchase_price: '', sale_price: '', opening_stock: '' })
  const [err, setErr] = useState('')

  const load = async () => {
    if (!sb || !company) return
    const data = await stockSummary(sb, company.id)
    setRows(data)
  }

  useEffect(() => {
    load()
  }, [sb, company])

  const openNew = () => {
    setForm({ name: '', sku: '', unit: UNITS[0], purchase_price: '', sale_price: '', opening_stock: '' })
    setEditing('new')
  }
  const openEdit = (p) => {
    setForm({
      name: p.name,
      sku: p.sku || '',
      unit: p.unit || UNITS[0],
      purchase_price: p.purchase_price ?? '',
      sale_price: p.sale_price ?? '',
      opening_stock: p.opening_stock ?? '',
    })
    setEditing(p)
  }
  const save = async (e) => {
    e.preventDefault()
    setErr('')
    const payload = {
      company_id: company.id,
      name: form.name.trim(),
      sku: form.sku.trim(),
      unit: form.unit,
      purchase_price: Number(form.purchase_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      opening_stock: Number(form.opening_stock) || 0,
    }
    const q = editing === 'new' ? sb.from('products').insert(payload) : sb.from('products').update(payload).eq('id', editing.id)
    const { error } = await q
    if (error) return setErr(error.message)
    setEditing(null)
    load()
  }
  const remove = async (p) => {
    if (!confirm(`"${p.name}" মুছে ফেলবেন?`)) return
    const { error } = await sb.from('products').delete().eq('id', p.id)
    if (error) alert(error.message)
    load()
  }

  const totalValue = (rows || []).reduce((s, p) => s + p.stock_value, 0)

  return (
    <div className="page">
      <div className="page-head">
        <h1>প্রোডাক্ট</h1>
        <button className="btn primary" onClick={openNew}>+ নতুন প্রোডাক্ট</button>
      </div>
      <Card title={`প্রোডাক্ট (${rows ? rows.length : '…'})`} action={<span className="chip">স্টক মূল্য: {money(totalValue)}</span>}>
        {!rows ? (
          <div className="loading">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <Empty text="কোনো প্রোডাক্ট নেই — উপরের বাটন থেকে যোগ করুন" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>নাম</th><th>ইউনিট</th><th className="right">ক্রয় দর</th><th className="right">বিক্রয় দর</th>
                  <th className="right">স্টক</th><th className="right">স্টক মূল্য</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/products/${p.id}`}>{p.name}</Link> {p.sku && <span className="muted">({p.sku})</span>}</td>
                    <td>{p.unit}</td>
                    <td className="right">{money(p.purchase_price)}</td>
                    <td className="right">{money(p.sale_price)}</td>
                    <td className={'right' + (p.stock_qty <= 0 ? ' out' : '')}>{num(p.stock_qty)}</td>
                    <td className="right">{money(p.stock_value)}</td>
                    <td className="actions">
                      <Link className="btn small" to={`/products/${p.id}`}>লেজার</Link>
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
        <Modal title={editing === 'new' ? 'নতুন প্রোডাক্ট' : 'প্রোডাক্ট এডিট'} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <label>নাম<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <div className="form-row">
              <label>কোড (SKU)<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
              <label>ইউনিট
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>ক্রয় দর<input value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></label>
              <label>বিক্রয় দর<input value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></label>
              <label>প্রারম্ভিক স্টক<input value={form.opening_stock} onChange={(e) => setForm({ ...form, opening_stock: e.target.value })} /></label>
            </div>
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
