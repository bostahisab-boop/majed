import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { fetchVoucher } from '../db.js'
import { money, bnDate, toBn } from '../utils.js'

export default function InvoicePrint() {
  const { id } = useParams()
  const { sb, company } = useStore()
  const [v, setV] = useState(null)
  const [customer, setCustomer] = useState(null)

  useEffect(() => {
    if (!sb) return
    ;(async () => {
      try {
        const data = await fetchVoucher(sb, id)
        setV(data)
        if (data.party_id) {
          const { data: c } = await sb.from('customers').select('*').eq('id', data.party_id).maybeSingle()
          setCustomer(c)
        }
      } catch (_) {
        setV(false)
      }
    })()
  }, [sb, id])

  if (v === null) return <div className="loading">লোড হচ্ছে…</div>
  if (v === false || v.voucher_type !== 'sale') return <div className="empty">চালান পাওয়া যায়নি</div>

  const due = Math.max(0, (v.total_amount || 0) - (v.paid || 0))

  return (
    <div className="page">
      <div className="page-head no-print">
        <h1>চালান</h1>
        <div className="row-gap">
          <button className="btn primary" onClick={() => window.print()}>🖨️ প্রিন্ট</button>
          <Link className="btn" to="/sales">বিক্রয় তালিকা</Link>
        </div>
      </div>
      <div className="paper invoice">
        <div className="paper-head">
          <div>
            <h2>{company?.name || 'কোম্পানি'}</h2>
            {company?.address && <p>{company.address}</p>}
            {company?.phone && <p>ফোন: {company.phone}</p>}
          </div>
          <div className="paper-title">
            <h3>চালান / ইনভয়েস</h3>
            <p>নং: {v.voucher_no}</p>
            <p>তারিখ: {bnDate(v.voucher_date)}</p>
          </div>
        </div>
        <div className="bill-to">
          <b>গ্রাহক:</b> {customer?.name || '—'}
          {customer?.phone && <span> · ফোন: {toBn(customer.phone)}</span>}
          {customer?.address && <div>{customer.address}</div>}
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>প্রোডাক্ট</th><th className="right">পরিমাণ</th><th className="right">দর</th><th className="right">টাকা</th>
            </tr>
          </thead>
          <tbody>
            {(v.invoice_items || []).map((i, idx) => (
              <tr key={i.id}>
                <td>{toBn(idx + 1)}</td>
                <td>{i.products?.name || '—'}</td>
                <td className="right">{toBn(i.qty)} {i.products?.unit || ''}</td>
                <td className="right">{money(i.rate)}</td>
                <td className="right">{money(i.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4} className="right">মোট</td><td className="right">{money(v.total_amount)}</td></tr>
            <tr><td colSpan={4} className="right">পরিশোধ ({v.method})</td><td className="right">{money(v.paid)}</td></tr>
            <tr className="bold"><td colSpan={4} className="right">বাকি</td><td className="right">{money(due)}</td></tr>
          </tfoot>
        </table>
        {v.notes && <p className="inv-note">নোট: {v.notes}</p>}
        <div className="paper-foot">
          <span>গ্রাহকের স্বাক্ষর: __________________</span>
          <span>{company?.name || ''} এর হয়ে: __________________</span>
        </div>
      </div>
    </div>
  )
}
