const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

export const toBn = (s) => String(s ?? '').replace(/[0-9]/g, (d) => BN_DIGITS[+d])

export const toEnDigits = (s) =>
  String(s ?? '').replace(/[০-৯]/g, (d) => BN_DIGITS.indexOf(d))

export function money(n, dec = 2) {
  const v = Number(n) || 0
  const fixed = Math.abs(v).toLocaleString('en-IN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
  return (v < 0 ? '-৳' : '৳') + toBn(fixed)
}

export function num(n, dec = 2) {
  const v = Number(n) || 0
  return toBn(
    v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  )
}

export function bnDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return toBn(d)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yy = dt.getFullYear()
  return toBn(`${dd}/${mm}/${yy}`)
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export function monthStartStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export const ACCOUNTS = {
  CASH: 'নগদ',
  BANK: 'ব্যাংক',
  SALES: 'বিক্রয়',
  PURCHASE: 'ক্রয়',
  EXPENSE: 'খরচ',
  AR: 'বকেয়া গ্রাহক',
  AP: 'বকেয়া সরবরাহকারী',
  CAPITAL: 'মূলধন',
  OTHER: 'অন্যান্য',
}

export const EXPENSE_HEADS = [
  'ভাড়া',
  'বিদ্যুৎ বিল',
  'বেতন',
  'পরিবহন',
  'দুপুরের খাবার',
  'দোকান পরিচ্ছন্নতা',
  'মার্কেটিং',
  'অফিস সামগ্রী',
  'অন্যান্য',
]

export const VOUCHER_TYPES = {
  receipt: 'আদায় রশিদ',
  payment: 'পরিশোধ ভাউচার',
  journal: 'জাবেদা',
  sale: 'বিক্রয় চালান',
  purchase: 'ক্রয় চালান',
  expense: 'খরচ ভাউচার',
}

export const PAY_METHODS = [
  { value: 'নগদ', label: 'নগদ' },
  { value: 'ব্যাংক', label: 'ব্যাংক' },
]

export function nextVoucherNo(type, existing) {
  const prefix = {
    receipt: 'RC',
    payment: 'PY',
    journal: 'JV',
    sale: 'INV',
    purchase: 'PUR',
    expense: 'EXP',
  }[type] || 'VC'
  const year = new Date().getFullYear()
  let max = 0
  for (const v of existing || []) {
    const m = String(v.voucher_no || '').match(new RegExp(`^${prefix}-${year}-(\\d+)$`))
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`
}
