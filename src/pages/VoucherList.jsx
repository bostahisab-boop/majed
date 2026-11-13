import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { fetchVouchers, deleteVoucher } from '../db.js'
import { money, bnDate, todayStr, monthStartStr } from '../utils.js'
import { Card, Empty } from '../components/ui.jsx'

export default function VoucherList({ type, title }) {
  const { sb, company } = useStore()
  const [from, setFrom] = useState(monthStartStr())
  const [to, setTo] = useState(todayStr())
  const [rows, setRows] = useState(null)

  const isSale = type === 'sale'
  const isPurchase = type === 'purchase'

  const load = async () => {
    if (!sb || !company) return
    setRows(null)
    const data = await fetchVouchers(sb, company.id, { type, from, to })
    setRows(data)
  }

  useEffect(() => {
    load()
  }, [sb, company, from, to])

  const remove = async (id) => {
    if (!confirm('এই ভাউচার মুছে ফেলবেন?')) return
    await deleteVoucher(sb, id)
    load()
  }

  const total = (rows || []).reduce((s, v) => s + (Number(v.total_amount) || 0), 0)
  const totalDue = (rows || []).reduce((s, v) => s + Math.max(0, (v.total_amount || 0) - (v.paid || 0)), 0)

  return (
    <div className="page">
      <div className="page-head">
        <h1>{title}</h1>
        <div className="row-gap">
          <div className="filters">
            <label>থেকে <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>পর্যন্ত <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <Link className="btn primary" to={`/voucher/new/${type}`}>+ নতুন</Link>
        </div>
      </div>
      <Card
        title={`তালিকা (${rows ? rows.length : '…'})`}
        action={
          <div className="row-gap">
            <span className="chip">মোট: {money(total)}</span>
            {(isSale || isPurchase) && <span className="chip red">মোট বাকি: {money(totalDue)}</span>}
          </div>
        }
      >
        {!rows ? (
          <div className="loading">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <Empty text="এই সময়ে কোনো এন্ট্রি নেই" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>ভাউচার নং</th>
                  <th>{isPurchase ? 'সরবরাহকারী' : isSale ? 'গ্রাহক' : 'খাত'}</th>
                  <th className="right">টাকা</th>
                  <th className="right">পরিশোধ</th>
                  <th className="right">বাকি</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td>{bnDate(v.voucher_date)}</td>
                    <td>
                      <Link to={isSale ? `/invoice/${v.id}` : `/voucher/${v.id}`}>{v.voucher_no}</Link>
                    </td>
                    <td>{v.expense_head || v.notes || '—'}</td>
                    <td className="right">{money(v.total_amount)}</td>
                    <td className="right">{money(v.paid)}</td>
                    <td className={'right' + (v.total_amount - v.paid > 0 ? ' out' : '')}>
                      {money(Math.max(0, (v.total_amount || 0) - (v.paid || 0)))}
                    </td>
                    <td className="actions">
                      {isSale ? (
                        <Link className="btn small" to={`/invoice/${v.id}`}>🖨️ প্রিন্ট</Link>
                      ) : (
                        <Link className="btn small" to={`/voucher/${v.id}`}>প্রিভিউ</Link>
                      )}
                      <Link className="btn small" to={`/voucher/${v.id}/edit`}>এডিট</Link>
                      <button className="btn small danger" onClick={() => remove(v.id)}>মুছুন</button>
                    </td>
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
