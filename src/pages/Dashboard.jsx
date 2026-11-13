import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { accountTotals, fetchVouchers, stockSummary } from '../db.js'
import { money, bnDate, todayStr, monthStartStr, VOUCHER_TYPES } from '../utils.js'
import { Stat, Card, BarChart, Empty } from '../components/ui.jsx'

export default function Dashboard() {
  const { sb, company, activeCompany } = useStore()
  const [d, setD] = useState(null)

  useEffect(() => {
    if (!sb || !company) return
    let live = true
    ;(async () => {
      const today = todayStr()
      const mStart = monthStartStr()
      const [vouchers, accounts, stock] = await Promise.all([
        fetchVouchers(sb, company.id, {}),
        accountTotals(sb, company.id),
        stockSummary(sb, company.id),
      ])
      if (!live) return
      const sum = (list, f) => list.reduce((s, v) => s + (Number(f(v)) || 0), 0)
      const todayV = vouchers.filter((v) => v.voucher_date === today)
      const monthV = vouchers.filter((v) => v.voucher_date >= mStart)
      const cash = (accounts['নগদ']?.debit || 0) - (accounts['নগদ']?.credit || 0)
      const bank = (accounts['ব্যাংক']?.debit || 0) - (accounts['ব্যাংক']?.credit || 0)
      const sales = sum(vouchers.filter((v) => v.voucher_type === 'sale'), (v) => v.total_amount)
      const purchases = sum(vouchers.filter((v) => v.voucher_type === 'purchase'), (v) => v.total_amount)
      const expenses = sum(vouchers.filter((v) => v.voucher_type === 'expense'), (v) => v.total_amount)
      const received = sum(vouchers.filter((v) => v.voucher_type === 'receipt'), (v) => v.total_amount)
      const paidOut = sum(vouchers.filter((v) => v.voucher_type === 'payment'), (v) => v.total_amount)
      const monthSales = sum(monthV.filter((v) => v.voucher_type === 'sale'), (v) => v.total_amount)
      const monthExpenses = sum(monthV.filter((v) => v.voucher_type === 'expense'), (v) => v.total_amount)
      const monthPurchases = sum(monthV.filter((v) => v.voucher_type === 'purchase'), (v) => v.total_amount)
      const stockValue = stock.reduce((s, p) => s + p.stock_value, 0)
      const days = []
      for (let i = 6; i >= 0; i--) {
        const dt = new Date()
        dt.setDate(dt.getDate() - i)
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        days.push({
          label: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'][dt.getDay()],
          value: sum(vouchers.filter((v) => v.voucher_date === key && v.voucher_type === 'sale'), (v) => v.total_amount),
        })
      }
      setD({
        todaySales: sum(todayV.filter((v) => v.voucher_type === 'sale'), (v) => v.total_amount),
        todayCashIn: sum(todayV.filter((v) => v.voucher_type === 'receipt'), (v) => v.total_amount),
        todayExpense: sum(todayV.filter((v) => v.voucher_type === 'expense'), (v) => v.total_amount),
        cash,
        bank,
        sales,
        purchases,
        expenses,
        received,
        paidOut,
        monthSales,
        monthPurchases,
        monthExpenses,
        stockValue,
        days,
        recent: vouchers.slice(0, 8),
      })
    })()
    return () => {
      live = false
    }
  }, [sb, company, activeCompany])

  if (!company) {
    return (
      <Empty
        text={
          <>
            কোনো কোম্পানি নেই — <Link to="/companies">কোম্পানি যোগ করুন</Link>
          </>
        }
      />
    )
  }
  if (!d) return <div className="loading">লোড হচ্ছে…</div>

  return (
    <div className="page">
      <div className="page-head">
        <h1>ড্যাশবোর্ড</h1>
        <span className="muted">{company.name} — {bnDate(new Date())}</span>
      </div>
      <div className="stat-grid">
        <Stat label="আজকের বিক্রয়" value={money(d.todaySales)} tone="green" />
        <Stat label="আজকের আদায়" value={money(d.todayCashIn)} tone="blue" />
        <Stat label="আজকের খরচ" value={money(d.todayExpense)} tone="red" />
        <Stat label="হাতে নগদ" value={money(d.cash)} sub={`ব্যাংক: ${money(d.bank)}`} tone="gold" />
        <Stat label="এই মাসের বিক্রয়" value={money(d.monthSales)} />
        <Stat label="এই মাসের ক্রয়" value={money(d.monthPurchases)} />
        <Stat label="এই মাসের খরচ" value={money(d.monthExpenses)} />
        <Stat label="স্টক মূল্য" value={money(d.stockValue)} />
      </div>
      <div className="grid-2">
        <Card title="শেষ ৭ দিনের বিক্রয়">
          <BarChart data={d.days} />
        </Card>
        <Card title="সারসংক্ষেপ (সব সময়)">
          <table className="tbl">
            <tbody>
              <tr><td>মোট বিক্রয়</td><td className="right">{money(d.sales)}</td></tr>
              <tr><td>মোট আদায়</td><td className="right">{money(d.received)}</td></tr>
              <tr><td>মোট ক্রয়</td><td className="right">{money(d.purchases)}</td></tr>
              <tr><td>মোট পরিশোধ (সরবরাহকারী)</td><td className="right">{money(d.paidOut)}</td></tr>
              <tr><td>মোট খরচ</td><td className="right">{money(d.expenses)}</td></tr>
              <tr className="bold"><td>সম্ভাব্য লাভ (বিক্রয় − ক্রয় − খরচ)</td><td className="right">{money(d.sales - d.purchases - d.expenses)}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
      <Card title="সাম্প্রতিক ভাউচার" action={<Link to="/daybook" className="btn small">সব দেখুন</Link>}>
        {d.recent.length === 0 ? (
          <Empty text="এখনো কোনো ভাউচার নেই" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>তারিখ</th><th>ভাউচার</th><th>ধরন</th><th className="right">টাকা</th>
              </tr>
            </thead>
            <tbody>
              {d.recent.map((v) => (
                <tr key={v.id}>
                  <td>{bnDate(v.voucher_date)}</td>
                  <td>
                    <Link to={`/voucher/${v.id}`}>{v.voucher_no}</Link>
                  </td>
                  <td>{VOUCHER_TYPES[v.voucher_type] || v.voucher_type}</td>
                  <td className="right">{money(v.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
