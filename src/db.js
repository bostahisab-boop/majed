import { ACCOUNTS as A } from './utils.js'

export async function fetchVouchers(sb, companyId, opts = {}) {
  let q = sb
    .from('vouchers')
    .select('*, voucher_lines(*), invoice_items(*, products(name, unit))')
    .eq('company_id', companyId)
    .order('voucher_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (opts.from) q = q.gte('voucher_date', opts.from)
  if (opts.to) q = q.lte('voucher_date', opts.to)
  if (opts.type) q = q.eq('voucher_type', opts.type)
  if (opts.partyId) q = q.eq('party_id', opts.partyId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function fetchVoucher(sb, id) {
  const { data, error } = await sb
    .from('vouchers')
    .select('*, voucher_lines(*), invoice_items(*, products(name, unit))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

function cashLine(method, side, amount, note) {
  const acct = method === 'ব্যাংক' ? A.BANK : A.CASH
  return { account: acct, debit: side === 'dr' ? amount : 0, credit: side === 'cr' ? amount : 0, description: note }
}

export function buildLines(v) {
  const t = v.total_amount || 0
  const paid = Number(v.paid) || 0
  const due = Math.max(0, t - paid)
  const method = v.method || 'নগদ'
  switch (v.voucher_type) {
    case 'sale':
      return [
        ...(paid > 0 ? [cashLine(method, 'dr', paid, 'বিক্রয় থেকে আদায়')] : []),
        ...(due > 0 ? [{ account: A.AR, debit: due, credit: 0, description: v.notes || 'বিক্রয় বাকি' }] : []),
        { account: A.SALES, debit: 0, credit: t, description: v.notes || 'পণ্য বিক্রয়' },
      ]
    case 'purchase':
      return [
        { account: A.PURCHASE, debit: t, credit: 0, description: v.notes || 'পণ্য ক্রয়' },
        ...(paid > 0 ? [cashLine(method, 'cr', paid, 'ক্রয় পরিশোধ')] : []),
        ...(due > 0 ? [{ account: A.AP, debit: 0, credit: due, description: 'সরবরাহকারীকে বাকি' }] : []),
      ]
    case 'expense':
      return [
        { account: A.EXPENSE, debit: t, credit: 0, description: v.expense_head || v.notes || 'খরচ' },
        cashLine(method, 'cr', t, v.expense_head || 'খরচ পরিশোধ'),
      ]
    case 'receipt':
      return [cashLine(method, 'dr', t, v.notes || 'গ্রাহক থেকে আদায়'), { account: A.AR, debit: 0, credit: t, description: v.notes || 'গ্রাহক পরিশোধ' }]
    case 'payment':
      return [{ account: A.AP, debit: t, credit: 0, description: v.notes || 'সরবরাহকারী পরিশোধ' }, cashLine(method, 'cr', t, v.notes || 'নগদ পরিশোধ')]
    default:
      return v.lines || []
  }
}

export async function insertVoucher(sb, companyId, v) {
  const lines = buildLines(v)
  const { data: voucher, error } = await sb
    .from('vouchers')
    .insert({
      company_id: companyId,
      voucher_no: v.voucher_no,
      voucher_type: v.voucher_type,
      voucher_date: v.voucher_date,
      party_id: v.party_id || null,
      party_type: v.party_type || null,
      total_amount: v.total_amount || 0,
      paid: Number(v.paid) || 0,
      method: v.method || 'নগদ',
      expense_head: v.expense_head || null,
      notes: v.notes || '',
    })
    .select()
    .single()
  if (error) throw error

  const withAmounts = lines.filter((l) => Number(l.debit) || Number(l.credit))
  if (withAmounts.length) {
    const { error: le } = await sb.from('voucher_lines').insert(
      withAmounts.map((l) => ({
        voucher_id: voucher.id,
        company_id: companyId,
        account: l.account,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || '',
      }))
    )
    if (le) throw le
  }

  const items = (v.items || []).filter((i) => i.product_id && Number(i.qty))
  if (items.length) {
    const { error: ie } = await sb.from('invoice_items').insert(
      items.map((i) => ({
        voucher_id: voucher.id,
        company_id: companyId,
        product_id: i.product_id,
        qty: Number(i.qty) || 0,
        rate: Number(i.rate) || 0,
        amount: Number(i.amount) || Number(i.qty) * Number(i.rate) || 0,
        description: i.description || '',
      }))
    )
    if (ie) throw ie
    const { error: me } = await sb.from('stock_movements').insert(
      items.map((i) => ({
        voucher_id: voucher.id,
        company_id: companyId,
        product_id: i.product_id,
        movement_date: v.voucher_date,
        qty_in: v.voucher_type === 'purchase' ? Number(i.qty) || 0 : 0,
        qty_out: v.voucher_type === 'sale' ? Number(i.qty) || 0 : 0,
        rate: Number(i.rate) || 0,
      }))
    )
    if (me) throw me
  }
  return voucher
}

export async function deleteVoucher(sb, id) {
  const { error } = await sb.from('vouchers').delete().eq('id', id)
  if (error) throw error
}

export async function accountTotals(sb, companyId) {
  const { data, error } = await sb
    .from('voucher_lines')
    .select('account, debit, credit')
    .eq('company_id', companyId)
  if (error) throw error
  const map = {}
  for (const l of data || []) {
    if (!map[l.account]) map[l.account] = { debit: 0, credit: 0 }
    map[l.account].debit += Number(l.debit) || 0
    map[l.account].credit += Number(l.credit) || 0
  }
  return map
}

export async function stockSummary(sb, companyId) {
  const [{ data: prods }, { data: moves }] = await Promise.all([
    sb.from('products').select('*').eq('company_id', companyId).order('name'),
    sb.from('stock_movements').select('product_id, qty_in, qty_out').eq('company_id', companyId),
  ])
  const agg = {}
  for (const m of moves || []) {
    if (!agg[m.product_id]) agg[m.product_id] = { in: 0, out: 0 }
    agg[m.product_id].in += Number(m.qty_in) || 0
    agg[m.product_id].out += Number(m.qty_out) || 0
  }
  return (prods || []).map((p) => {
    const a = agg[p.id] || { in: 0, out: 0 }
    const qty = (Number(p.opening_stock) || 0) + a.in - a.out
    return { ...p, stock_qty: qty, stock_value: qty * (Number(p.purchase_price) || 0) }
  })
}

export function partyLedgerRows(vouchers, kind, opening = 0) {
  const rows = []
  let bal = Number(opening) || 0
  const sorted = [...vouchers].sort((a, b) =>
    (a.voucher_date + a.created_at).localeCompare(b.voucher_date + b.created_at)
  )
  for (const v of sorted) {
    let debit = 0
    let credit = 0
    if (kind === 'customer') {
      if (v.voucher_type === 'sale') debit = Math.max(0, (v.total_amount || 0) - (v.paid || 0))
      if (v.voucher_type === 'receipt') credit = v.total_amount || 0
    } else {
      if (v.voucher_type === 'purchase') credit = Math.max(0, (v.total_amount || 0) - (v.paid || 0))
      if (v.voucher_type === 'payment') debit = v.total_amount || 0
    }
    bal += debit - credit
    rows.push({ ...v, debit, credit, balance: bal })
  }
  return rows
}
