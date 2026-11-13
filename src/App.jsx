import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store.jsx'
import Setup from './pages/Setup.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DayBook from './pages/DayBook.jsx'
import VoucherForm from './pages/VoucherForm.jsx'
import VoucherPreview from './pages/VoucherPreview.jsx'
import InvoicePrint from './pages/InvoicePrint.jsx'
import Customers from './pages/Customers.jsx'
import PartyLedger from './pages/PartyLedger.jsx'
import Suppliers from './pages/Suppliers.jsx'
import Products from './pages/Products.jsx'
import ProductLedger from './pages/ProductLedger.jsx'
import Sales from './pages/Sales.jsx'
import Purchases from './pages/Purchases.jsx'
import Expenses from './pages/Expenses.jsx'
import Reports from './pages/Reports.jsx'
import Companies from './pages/Companies.jsx'

export default function App() {
  const { cfg, loading } = useStore()
  if (!cfg) return <Setup />
  if (loading) {
    return (
      <div className="boot">
        <div className="spinner" />
        <p>লোড হচ্ছে…</p>
      </div>
    )
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/daybook" element={<DayBook />} />
        <Route path="/voucher/new/:type" element={<VoucherForm />} />
        <Route path="/voucher/:id/edit" element={<VoucherForm />} />
        <Route path="/voucher/:id" element={<VoucherPreview />} />
        <Route path="/invoice/:id" element={<InvoicePrint />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<PartyLedger kind="customer" />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/suppliers/:id" element={<PartyLedger kind="supplier" />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductLedger />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
