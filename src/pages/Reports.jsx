import React, { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { fetchVouchers, accountTotals, stockSummary, partyLedgerRows } from '../db.js'
import { money, bnDate, todayStr, monthStartStr } from '../utils.js'
import { Card, Stat, Empty } from '../components/ui.jsx'

export default function Reports() {
  const { sb, company } = useStore()
  const [from, setFrom] = useState(monthStartStr())
  const [to, setTo] = useState(todayStr())
  const [r, setR] = useState(null)

  useEffect(() => {
    if (!sb || !company) return
    let live = true
    ;(async () => {
      const [allVouchers, accounts, stock, customers, suppliers] = await Promise.all([
        fetchVouchers(sb, company.id, { from, to }),
        accountTotals(sb, company.id),
        stockSummary(sb, company.id),
        sb.from('customers').select('*').eq('company_id', company.id),
        sb.from('suppliers').select('*').eq('company_id', company.id),
      ])
      if (!live) return
      const net = (a) => (a ? a.debit - a.credit : 0)
      const sales = -net(accounts['বিক্রয়'])
      const purchases = net(accounts['ক্রয়'])
      const expenses = net(accounts['খরচ'])
      const cash = net(accounts['নগদ'])
      const bank = net(accounts['ব্যাংক'])

      const custBal = (customers.data || []).map((c) => {
        const rows = partyLedgerRows(
          allVouchers.filter((v) => v.party_id === c.id && ['sale', 'receipt'].includes(v.voucher_type)),
          'customer',
          c.opening_balance
        )
        return { ...c, balance: rows.length ? rows[rows.length - 1].balance : Number(c.opening_balance) || 0 }
      })
      const suppBal = (suppliers.data || []).map((s) => {
        const rows = partyLedgerRows(
          allVouchers.filter((v) => v.party_id === s.id && ['purchase', 'payment'].includes(v.voucher_type)),
          'supplier',
          s.opening_balance
        )
        return { ...s, balance: rows.length ? rows[rows.length - 1].balance : Number(s.opening_balance) || 0 }
      })

      setR({
        sales,
        purchases,
        expenses,
        profit: sales - purchases - expenses,
        cash,
        bank,
        trial: accounts,
        stock,
        custBal: custBal.filter((c) => Math.abs(c.balance) > 0.001),
        suppBal: suppBal.filter((s) => Math.abs(s.balance) > 0.001),
        vouchers: allVouchers,
      })
    })()
    return () => {
      live = false
    }
  }, [sb, company, from, to])

  if (!company) return <Empty text="আগে কোম্পানি যোগ করুন" />
  if (!r) return <div className="loading">লোড হচ্ছে…</div>

  return (
    <div className="page">
      <div className="page-head">
        <h1>রিপোর্ট</h1>
        <div className="filters">
          <label>থেকে <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>পর্যন্ত <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="বিক্রয়" value={money(r.sales)} tone="green" />
        <Stat label="ক্রয়" value={money(r.purchases)} tone="blue" />
        <Stat label="খরচ" value={money(r.expenses)} tone="red" />
        <Stat label="লাভ / ক্ষতি" value={money(r.profit)} tone={r.profit >= 0 ? 'green' : 'red'} sub={`${bnDate(from)} — ${bnDate(to)}`} />
      </div>

      <div className="grid-2">
        <Card title="লাভ-ক্ষতি হিসাব">
          <table className="tbl">
            <tbody>
              <tr><td>মোট বিক্রয়</td><td className="right">{money(r.sales)}</td></tr>
              <tr><td>(−) মোট ক্রয়</td><td className="right">{money(r.purchases)}</td></tr>
              <tr><td>(−) মোট খরচ</td><td className="right">{money(r.expenses)}</td></tr>
              <tr className="bold"><td>{r.profit >= 0 ? 'নিট লাভ' : 'নিট ক্ষতি'}</td><td className="right">{money(Math.abs(r.profit))}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="নগদ ও ব্যাংক অবস্থান">
          <table className="tbl">
            <tbody>
              <tr><td>হাতে নগদ</td><td className="right">{money(r.cash)}</td></tr>
              <tr><td>ব্যাংকে</td><td className="right">{money(r.bank)}</td></tr>
              <tr className="bold"><td>মোট</td><td className="right">{money(r.cash + r.bank)}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid-2">
        <Card title={`গ্রাহক বকেয়া (${r.custBal.length})`}>
          {r.custBal.length === 0 ? <Empty text="কোনো বকেয়া নেই" /> : (
            <table className="tbl">
              <thead><tr><th>গ্রাহক</th><th className="right">বাকি</th></tr></thead>
              <tbody>
                {r.custBal.map((c) => (
                  <tr key={c.id}><td>{c.name}</td><td className="right out">{money(c.balance)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title={`সরবরাহকারী দেনা (${r.suppBal.length})`}>
          {r.suppBal.length === 0 ? <Empty text="কোনো দেনা নেই" /> : (
            <table className="tbl">
              <thead><tr><th>সরবরাহকারী</th><th className="right">দেনা</th></tr></thead>
              <tbody>
                {r.suppBal.map((s) => (
                  <tr key={s.id}><td>{s.name}</td><td className="right out">{money(s.balance)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="স্টক সারাংশ">
        {r.stock.length === 0 ? <Empty text="কোনো প্রোডাক্ট নেই" /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>প্রোডাক্ট</th><th className="right">স্টক</th><th className="right">মূল্য</th></tr></thead>
              <tbody>
                {r.stock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="right">{p.stock_qty} {p.unit}</td>
                    <td className="right">{money(p.stock_value)}</td>
                  </tr>
                ))}
                <tr className="bold">
                  <td colSpan={2}>মোট স্টক মূল্য</td>
                  <td className="right">{money(r.stock.reduce((s, p) => s + p.stock_value, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="ট্রায়াল ব্যালেন্স (সব সময় মিলিত)">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>হিসাব</th><th className="right">ডেবিট</th><th className="right">ক্রেডিট</th><th className="right">ব্যালেন্স</th></tr></thead>
            <tbody>
              {Object.entries(r.trial)
                .filter(([, v]) => v.debit || v.credit)
                .map(([acct, v]) => (
                  <tr key={acct}>
                    <td>{acct}</td>
                    <td className="right">{v.debit ? money(v.debit) : '—'}</td>
                    <td className="right">{v.credit ? money(v.credit) : '—'}</td>
                    <td className="right bold">{money(v.debit - v.credit)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
