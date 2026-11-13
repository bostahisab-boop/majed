import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { money, num, bnDate } from '../utils.js'
import { Card, Empty } from '../components/ui.jsx'

export default function ProductLedger() {
  const { id } = useParams()
  const { sb, company } = useStore()
  const [product, setProduct] = useState(null)
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!sb || !company) return
    ;(async () => {
      const { data: p } = await sb.from('products').select('*').eq('id', id).single()
      setProduct(p)
      const { data } = await sb
        .from('stock_movements')
        .select('*, vouchers(voucher_no, voucher_type, notes)')
        .eq('company_id', company.id)
        .eq('product_id', id)
        .order('movement_date', { ascending: true })
      let bal = Number(p?.opening_stock) || 0
      const list = (data || []).map((m) => {
        bal += (Number(m.qty_in) || 0) - (Number(m.qty_out) || 0)
        return { ...m, balance: bal }
      })
      setRows(list)
    })()
  }, [sb, company, id])

  if (!product) return <div className="loading">লোড হচ্ছে…</div>

  return (
    <div className="page">
      <div className="page-head">
        <h1>{product.name} — প্রোডাক্ট লেজার</h1>
        <Link className="btn" to="/products">তালিকায় ফিরুন</Link>
      </div>
      <Card
        title="স্টক চলতি হিসাব"
        action={<span className="chip bold">বর্তমান স্টক: {num(rows?.length ? rows[rows.length - 1].balance : product.opening_stock)} {product.unit}</span>}
      >
        {!rows ? (
          <div className="loading">লোড হচ্ছে…</div>
        ) : rows.length === 0 ? (
          <Empty text="কোনো স্টক চলাচল নেই" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>তারিখ</th><th>ভাউচার</th><th>বিবরণ</th>
                  <th className="right">ঢুকেছে</th><th className="right">বের হয়েছে</th><th className="right">স্টক</th>
                </tr>
              </thead>
              <tbody>
                <tr className="muted-row">
                  <td>—</td><td>—</td><td>প্রারম্ভিক স্টক</td><td></td><td></td>
                  <td className="right">{num(product.opening_stock)}</td>
                </tr>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>{bnDate(m.movement_date)}</td>
                    <td>
                      {m.vouchers && (
                        <Link to={m.vouchers.voucher_type === 'sale' ? `/invoice/${m.voucher_id}` : `/voucher/${m.voucher_id}`}>
                          {m.vouchers.voucher_no}
                        </Link>
                      )}
                    </td>
                    <td>{m.vouchers?.notes || (m.qty_in ? 'ক্রয়' : 'বিক্রয়')}</td>
                    <td className="right in">{m.qty_in ? num(m.qty_in) : '—'}</td>
                    <td className="right out">{m.qty_out ? num(m.qty_out) : '—'}</td>
                    <td className="right bold">{num(m.balance)}</td>
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
