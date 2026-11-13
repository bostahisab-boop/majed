import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { fetchVouchers, partyLedgerRows } from '../db.js'
import { money, bnDate, VOUCHER_TYPES } from '../utils.js'
import { Card, Empty } from '../components/ui.jsx'

export default function PartyLedger({ kind }) {
  const { id } = useParams()
  const { sb, company } = useStore()
  const isCustomer = kind === 'customer'
  const [party, setParty] = useState(null)
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!sb || !company) return
    ;(async () => {
      const table = isCustomer ? 'customers' : 'suppliers'
      const { data: p } = await sb.from(table).select('*').eq('id', id).single()
      setParty(p)
      const vouchers = await fetchVouchers(sb, company.id, { partyId: id })
      setRows(partyLedgerRows(vouchers, kind, p?.opening_balance))
    })()
  }, [sb, company, id, kind])

  if (!party) return <div className="loading">লোড হচ্ছে…</div>

  const newVoucherType = isCustomer ? 'sale' : 'purchase'
  const receiptType = isCustomer ? 'receipt' : 'payment'

  return (
    <div className="page">
      <div className="page-head">
        <h1>{party.name} — {isCustomer ? 'গ্রাহক লেজার' : 'সরবরাহকারী লেজার'}</h1>
        <div className="row-gap">
          <Link className="btn primary" to={`/voucher/new/${newVoucherType}`}>
            {isCustomer ? '+ নতুন বিক্রয়' : '+ নতুন ক্রয়'}
          </Link>
          <Link className="btn" to={`/voucher/new/${receiptType}`}>
            {isCustomer ? '+ টাকা আদায়' : '+ টাকা পরিশোধ'}
          </Link>
        </div>
      </div>
      <Card
        title="লেনদেন"
        action={<span className="chip bold">বর্তমান ব্যালেন্স: {money(rows?.length ? rows[rows.length - 1].balance : party.opening_balance)}</span>}
      >
        {!rows ? (
          <div className="loading">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <Empty text="কোনো লেনদেন নেই" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>তারিখ</th><th>ভাউচার</th><th>ধরন</th>
                  <th className="right">ডেবিট (বাড়ল)</th><th className="right">ক্রেডিট (কমল)</th><th className="right">ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody>
                <tr className="muted-row">
                  <td>—</td><td>—</td><td>প্রারম্ভিক ব্যালেন্স</td>
                  <td></td><td></td><td className="right">{money(party.opening_balance)}</td>
                </tr>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{bnDate(r.voucher_date)}</td>
                    <td><Link to={`/voucher/${r.id}`}>{r.voucher_no}</Link></td>
                    <td>{VOUCHER_TYPES[r.voucher_type]}</td>
                    <td className="right">{r.debit ? money(r.debit) : '—'}</td>
                    <td className="right">{r.credit ? money(r.credit) : '—'}</td>
                    <td className="right bold">{money(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
