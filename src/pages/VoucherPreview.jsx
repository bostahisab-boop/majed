import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { fetchVoucher } from '../db.js'
import { money, bnDate, VOUCHER_TYPES } from '../utils.js'

export default function VoucherPreview() {
  const { id } = useParams()
  const { sb, company } = useStore()
  const [v, setV] = useState(null)

  useEffect(() => {
    if (!sb) return
    fetchVoucher(sb, id).then(setV).catch(() => setV(false))
  }, [sb, id])

  if (v === null) return <div className="loading">লোড হচ্ছে…</div>
  if (v === false) return <div className="empty">ভাউচার পাওয়া যায়নি</div>

  const partyName = v.party_id
    ? v.voucher_type === 'purchase' || v.voucher_type === 'payment'
      ? 'সরবরাহকারী'
      : 'গ্রাহক'
    : null

  return (
    <div className="page">
      <div className="page-head no-print">
        <h1>ভাউচার প্রিভিউ</h1>
        <div className="row-gap">
          <button className="btn primary" onClick={() => window.print()}>🖨️ প্রিন্ট</button>
          <Link className="btn" to={`/voucher/${v.id}/edit`}>এডিট</Link>
          <Link className="btn" to="/daybook">দিনবই</Link>
        </div>
      </div>
      <div className="paper">
        <div className="paper-head">
          <div>
            <h2>{company?.name || 'কোম্পানি'}</h2>
            {company?.address && <p>{company.address}</p>}
            {company?.phone && <p>ফোন: {company.phone}</p>}
          </div>
          <div className="paper-title">
            <h3>{VOUCHER_TYPES[v.voucher_type] || v.voucher_type}</h3>
            <p>নং: {v.voucher_no}</p>
            <p>তারিখ: {bnDate(v.voucher_date)}</p>
          </div>
        </div>
        <table className="tbl">
          <tbody>
            {partyName && (
              <tr>
                <th>{partyName}</th>
                <td>{v.party_id}</td>
              </tr>
            )}
            {v.expense_head && (
              <tr>
                <th>খরচের খাত</th>
                <td>{v.expense_head}</td>
              </tr>
            )}
            {v.voucher_type === 'sale' || v.voucher_type === 'purchase' ? (
              <>
                <tr><th>মোট টাকা</th><td>{money(v.total_amount)}</td></tr>
                <tr><th>পরিশোধ ({v.method})</th><td>{money(v.paid)}</td></tr>
                <tr><th>বাকি</th><td>{money(Math.max(0, (v.total_amount || 0) - (v.paid || 0)))}</td></tr>
              </>
            ) : (
              <tr><th>টাকা</th><td>{money(v.total_amount)}</td></tr>
            )}
            {v.notes && (
              <tr>
                <th>বিবরণ</th>
                <td>{v.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        {v.invoice_items?.length > 0 && (
          <>
            <h4 className="sec-title">আইটেম</h4>
            <table className="tbl">
              <thead>
                <tr><th>প্রোডাক্ট</th><th className="right">পরিমাণ</th><th className="right">দর</th><th className="right">টাকা</th></tr>
              </thead>
              <tbody>
                {v.invoice_items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.products?.name || '—'}</td>
                    <td className="right">{i.qty}</td>
                    <td className="right">{money(i.rate)}</td>
                    <td className="right">{money(i.amount)}</td>
                  </tr>
                ))}
                <tr className="bold">
                  <td colSpan={3}>মোট</td>
                  <td className="right">{money(v.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <h4 className="sec-title">হিসাব এন্ট্রি</h4>
        <table className="tbl">
          <thead>
            <tr><th>হিসাব</th><th className="right">ডেবিট</th><th className="right">ক্রেডিট</th><th>বিবরণ</th></tr>
          </thead>
          <tbody>
            {(v.voucher_lines || []).map((l) => (
              <tr key={l.id}>
                <td>{l.account}</td>
                <td className="right">{l.debit ? money(l.debit) : '—'}</td>
                <td className="right">{l.credit ? money(l.credit) : '—'}</td>
                <td>{l.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="paper-foot">
          <span>স্বাক্ষর: __________________</span>
          <span>হিসাব সফটওয়্যার — হিসাব</span>
        </div>
      </div>
    </div>
  )
}
