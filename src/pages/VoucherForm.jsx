import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { insertVoucher, fetchVoucher, fetchVouchers, deleteVoucher } from '../db.js'
import { ACCOUNTS as A, VOUCHER_TYPES, PAY_METHODS, EXPENSE_HEADS, todayStr, nextVoucherNo, toEnDigits } from '../utils.js'

const ITEM_ACCOUNTS = [A.CASH, A.BANK, A.SALES, A.PURCHASE, A.EXPENSE, A.AR, A.AP, A.CAPITAL, A.OTHER]

export default function VoucherForm() {
  const { type: typeParam, id } = useParams()
  const nav = useNavigate()
  const { sb, company } = useStore()
  const editMode = !!id

  const [kind, setKind] = useState(editMode ? null : typeParam)

  const [parties, setParties] = useState([])
  const [products, setProducts] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [form, setForm] = useState({
    voucher_no: '',
    voucher_date: todayStr(),
    party_id: '',
    method: 'নগদ',
    amount: '',
    paid: '',
    expense_head: EXPENSE_HEADS[0],
    notes: '',
    items: [],
    lines: [{ account: A.OTHER, debit: '', credit: '', description: '' }],
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const isInvoice = kind === 'sale'

  useEffect(() => {
    if (!sb || !company) return
    ;(async () => {
      const partyTable = kind === 'purchase' || kind === 'payment' ? 'suppliers' : 'customers'
      const [p, pr, vs] = await Promise.all([
        sb.from(partyTable).select('*').eq('company_id', company.id).order('name'),
        sb.from('products').select('*').eq('company_id', company.id).order('name'),
        fetchVouchers(sb, company.id, { type: kind }),
      ])
      setParties(p.data || [])
      setProducts(pr.data || [])
      setVouchers(vs || [])
      if (editMode) {
        const v = await fetchVoucher(sb, id)
        setKind(v.voucher_type)
        setForm({
          voucher_no: v.voucher_no,
          voucher_date: v.voucher_date,
          party_id: v.party_id || '',
          method: v.method || 'নগদ',
          amount: v.total_amount || '',
          paid: v.paid || '',
          expense_head: v.expense_head || EXPENSE_HEADS[0],
          notes: v.notes || '',
          items: (v.invoice_items || []).map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
          })),
          lines: v.voucher_lines?.length
            ? v.voucher_lines.map((l) => ({ account: l.account, debit: l.debit || '', credit: l.credit || '', description: l.description || '' }))
            : form.lines,
        })
      } else {
        setForm((f) => ({ ...f, voucher_no: nextVoucherNo(kind, vs || []) }))
      }
    })()
  }, [sb, company, kind, id])

  const itemsTotal = useMemo(
    () => form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [form.items]
  )
  const total = isInvoice || kind === 'purchase' ? itemsTotal : Number(toEnDigits(form.amount)) || 0
  const paid = Number(toEnDigits(form.paid)) || 0

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setItem = (idx, k, v) =>
    setForm((f) => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [k]: v }
      if (k === 'qty' || k === 'rate') items[idx].amount = (Number(toEnDigits(items[idx].qty)) || 0) * (Number(toEnDigits(items[idx].rate)) || 0)
      return { ...f, items }
    })
  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { product_id: '', qty: '', rate: '', amount: 0 }] }))
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const setLine = (idx, k, v) =>
    setForm((f) => {
      const lines = [...f.lines]
      lines[idx] = { ...lines[idx], [k]: v }
      return { ...f, lines }
    })
  const addLine = () =>
    setForm((f) => ({ ...f, lines: [...f.lines, { account: A.OTHER, debit: '', credit: '', description: '' }] }))
  const removeLine = (idx) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      setBusy(true)
      let payload = {
        voucher_no: form.voucher_no,
        voucher_type: kind,
        voucher_date: form.voucher_date,
        party_id: form.party_id || null,
        party_type: ['sale', 'receipt'].includes(kind) ? 'customer' : ['purchase', 'payment'].includes(kind) ? 'supplier' : null,
        total_amount: total,
        paid: ['sale', 'purchase'].includes(kind) ? paid : total,
        method: form.method,
        expense_head: kind === 'expense' ? form.expense_head : null,
        notes: form.notes,
        items: form.items,
        lines: form.lines,
      }
      if (kind === 'journal') {
        const dr = form.lines.reduce((s, l) => s + (Number(toEnDigits(l.debit)) || 0), 0)
        const cr = form.lines.reduce((s, l) => s + (Number(toEnDigits(l.credit)) || 0), 0)
        if (dr === 0) throw new Error('জাবেদায় অন্তত একটি ডেবিট এন্ট্রি দিন')
        if (dr !== cr) throw new Error('ডেবিট ও ক্রেডিট সমান হতে হবে')
        payload.total_amount = dr
      }
      if (!payload.voucher_no) payload.voucher_no = nextVoucherNo(kind, vouchers)
      let saved
      if (editMode) {
        await deleteVoucher(sb, id)
        saved = await insertVoucher(sb, company.id, payload)
      } else {
        saved = await insertVoucher(sb, company.id, payload)
      }
      nav(kind === 'sale' ? `/invoice/${saved.id}` : `/voucher/${saved.id}`)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const needParty = ['sale', 'purchase', 'receipt', 'payment'].includes(kind)
  const partyLabel = kind === 'purchase' || kind === 'payment' ? 'সরবরাহকারী' : 'গ্রাহক'

  if (!kind) return <div className="loading">লোড হচ্ছে…</div>

  return (
    <div className="page">
      <div className="page-head">
        <h1>{editMode ? 'ভাউচার এডিট' : VOUCHER_TYPES[kind] || 'ভাউচার'}</h1>
      </div>
      <form className="card form" onSubmit={submit}>
        <div className="form-row">
          <label>ভাউচার নং
            <input value={form.voucher_no} onChange={(e) => set('voucher_no', e.target.value)} />
          </label>
          <label>তারিখ
            <input type="date" value={form.voucher_date} onChange={(e) => set('voucher_date', e.target.value)} required />
          </label>
          {needParty && (
            <label>{partyLabel}
              <select value={form.party_id} onChange={(e) => set('party_id', e.target.value)} required>
                <option value="">— নির্বাচন করুন —</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {(isInvoice || kind === 'purchase') && (
          <>
            <h3 className="sec-title">আইটেম সমূহ</h3>
            <table className="tbl items-tbl">
              <thead>
                <tr>
                  <th>প্রোডাক্ট</th>
                  <th>পরিমাণ</th>
                  <th>দর</th>
                  <th className="right">টাকা</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      <select value={it.product_id} onChange={(e) => setItem(idx, 'product_id', e.target.value)} required>
                        <option value="">— প্রোডাক্ট —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({kind === 'sale' ? `বিক্রয় দর ${p.sale_price}` : `ক্রয় দর ${p.purchase_price}`})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td><input className="num" value={it.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} required /></td>
                    <td><input className="num" value={it.rate} onChange={(e) => setItem(idx, 'rate', e.target.value)} required /></td>
                    <td className="right">{Number(it.amount || 0).toLocaleString('en-IN')}</td>
                    <td><button type="button" className="btn small danger" onClick={() => removeItem(idx)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn small" onClick={addItem}>+ আইটেম যোগ করুন</button>
            <div className="form-row totals-row">
              <label>মোট টাকা
                <input value={Number(itemsTotal).toLocaleString('en-IN')} readOnly />
              </label>
              <label>নগদে পরিশোধ
                <input value={form.paid} onChange={(e) => set('paid', e.target.value)} placeholder="০ = সম্পূর্ণ বাকি" />
              </label>
              <label>মাধ্যম
                <select value={form.method} onChange={(e) => set('method', e.target.value)}>
                  {PAY_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
              <label>বাকি
                <input value={Math.max(0, total - paid).toLocaleString('en-IN')} readOnly />
              </label>
            </div>
          </>
        )}

        {kind === 'expense' && (
          <div className="form-row">
            <label>খরচের খাত
              <select value={form.expense_head} onChange={(e) => set('expense_head', e.target.value)}>
                {EXPENSE_HEADS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>
            <label>টাকা
              <input value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </label>
            <label>মাধ্যম
              <select value={form.method} onChange={(e) => set('method', e.target.value)}>
                {PAY_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {(kind === 'receipt' || kind === 'payment') && (
          <div className="form-row">
            <label>টাকা
              <input value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </label>
            <label>মাধ্যম
              <select value={form.method} onChange={(e) => set('method', e.target.value)}>
                {PAY_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {kind === 'journal' && (
          <>
            <h3 className="sec-title">জাবেদা এন্ট্রি</h3>
            <table className="tbl items-tbl">
              <thead>
                <tr>
                  <th>হিসাব</th>
                  <th>ডেবিট</th>
                  <th>ক্রেডিট</th>
                  <th>বিবরণ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td>
                      <select value={l.account} onChange={(e) => setLine(idx, 'account', e.target.value)}>
                        {ITEM_ACCOUNTS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </td>
                    <td><input className="num" value={l.debit} onChange={(e) => setLine(idx, 'debit', e.target.value)} /></td>
                    <td><input className="num" value={l.credit} onChange={(e) => setLine(idx, 'credit', e.target.value)} /></td>
                    <td><input value={l.description} onChange={(e) => setLine(idx, 'description', e.target.value)} /></td>
                    <td><button type="button" className="btn small danger" onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn small" onClick={addLine}>+ লাইন যোগ করুন</button>
          </>
        )}

        <label>বিবরণ / নোট
          <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        {err && <div className="form-error">{err}</div>}
        <div className="form-actions">
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}
          </button>
          <button type="button" className="btn" onClick={() => nav(-1)}>বাতিল</button>
        </div>
      </form>
    </div>
  )
}
