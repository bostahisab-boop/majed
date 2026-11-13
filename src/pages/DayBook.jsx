import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { fetchVouchers, deleteVoucher } from '../db.js'
import { money, bnDate, todayStr, VOUCHER_TYPES } from '../utils.js'
import { Card, Empty } from '../components/ui.jsx'

export default function DayBook() {
  const { sb, company } = useStore()
  const [from, setFrom] = useState(todayStr())
  const [to, setTo] = useState(todayStr())
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!sb || !company) return
    setRows(null)
    try {
      const data = await fetchVouchers(sb, company.id, { from, to })
      setRows(data)
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [sb, company, from, to])

  const remove = async (id) => {
    if (!confirm('এই ভাউচার মুছে ফেলবেন?')) return
    await deleteVoucher(sb, id)
    load()
  }

  const inFlow = (v) =>
    v.voucher_type === 'receipt' ? v.total_amount : v.voucher_type === 'sale' ? v.paid : 0
  const outFlow = (v) =>
    v.voucher_type === 'payment' || v.voucher_type === 'expense'
      ? v.total_amount
      : v.voucher_type === 'purchase'
      ? v.paid
      : 0

  const totalIn = (rows || []).reduce((s, v) => s + (Number(inFlow(v)) || 0), 0)
  const totalOut = (rows || []).reduce((s, v) => s + (Number(outFlow(v)) || 0), 0)

  return (
    <div className="page">
      <div className="page-head">
        <h1>দিনবই</h1>
        <div className="filters no-print">
          <label>থেকে <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>পর্যন্ত <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </div>
      {err && <div className="form-error">{err}</div>}
      <Card
        title={`ভাউচার তালিকা (${rows ? rows.length : '…'})`}
        action={
          <div className="row-gap">
            <span className="chip green">নগদ ঢুকেছে: {money(totalIn)}</span>
            <span className="chip red">নগদ গেছে: {money(totalOut)}</span>
          </div>
        }
      >
        {!rows ? (
          <div className="loading">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <Empty text="এই সময়ে কোনো ভাউচার নেই" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>ভাউচার নং</th>
                  <th>ধরন</th>
                  <th>বিবরণ</th>
                  <th className="right">জমা (ঢুকেছে)</th>
                  <th className="right">খরচ (গেছে)</th>
                  <th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td>{bnDate(v.voucher_date)}</td>
                    <td>
                      <Link to={`/voucher/${v.id}`}>{v.voucher_no}</Link>
                    </td>
                    <td>
                      <span className={`badge t-${v.voucher_type}`}>{VOUCHER_TYPES[v.voucher_type] || v.voucher_type}</span>
                    </td>
                    <td className="desc">
                      {v.notes}
                      {v.invoice_items?.length ? ` — ${v.invoice_items.length} আইটেম` : ''}
                    </td>
                    <td className="right in">{inFlow(v) ? money(inFlow(v)) : '—'}</td>
                    <td className="right out">{outFlow(v) ? money(outFlow(v)) : '—'}</td>
                    <td className="no-print actions">
                      <Link className="btn small" to={`/voucher/${v.id}`}>প্রিভিউ</Link>
                      <Link className="btn small" to={`/voucher/${v.id}/edit`}>এডিট</Link>
                      <button className="btn small danger" onClick={() => remove(v.id)}>মুছুন</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bold">
                  <td colSpan={4}>মোট</td>
                  <td className="right">{money(totalIn)}</td>
                  <td className="right">{money(totalOut)}</td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
