import React, { useState } from 'react'
import { useStore } from '../store.jsx'
import { Modal, Card, Empty } from '../components/ui.jsx'

export default function Companies() {
  const { sb, companies, company, selectCompany, refreshCompanies } = useStore()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [err, setErr] = useState('')

  const openNew = () => {
    setForm({ name: '', address: '', phone: '' })
    setEditing('new')
  }
  const openEdit = (c) => {
    setForm({ name: c.name, address: c.address || '', phone: c.phone || '' })
    setEditing(c)
  }
  const save = async (e) => {
    e.preventDefault()
    setErr('')
    const payload = { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim() }
    const q = editing === 'new' ? sb.from('companies').insert(payload) : sb.from('companies').update(payload).eq('id', editing.id)
    const { error } = await q
    if (error) return setErr(error.message)
    setEditing(null)
    await refreshCompanies()
    if (editing === 'new') {
      const { data } = await sb.from('companies').select('*').order('created_at', { ascending: false }).limit(1)
      if (data?.[0]) selectCompany(data[0].id)
    }
  }
  const remove = async (c) => {
    if (!confirm(`"${c.name}" এবং এর সব হিসাব ডেটা মুছে যাবে। নিশ্চিত?`)) return
    const { error } = await sb.from('companies').delete().eq('id', c.id)
    if (error) return alert(error.message)
    await refreshCompanies()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>কোম্পানি</h1>
        <button className="btn primary" onClick={openNew}>+ নতুন কোম্পানি</button>
      </div>
      <Card title={`কোম্পানি (${companies.length})`}>
        {companies.length === 0 ? (
          <Empty text="কোনো কোম্পানি নেই — একটি যোগ করুন" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>নাম</th><th>ঠিকানা</th><th>ফোন</th><th></th></tr></thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className={c.id === company?.id ? 'active-row' : ''}>
                    <td>{c.name} {c.id === company?.id && <span className="chip green">চালু</span>}</td>
                    <td>{c.address}</td>
                    <td>{c.phone}</td>
                    <td className="actions">
                      {c.id !== company?.id && (
                        <button className="btn small" onClick={() => selectCompany(c.id)}>নির্বাচন</button>
                      )}
                      <button className="btn small" onClick={() => openEdit(c)}>এডিট</button>
                      <button className="btn small danger" onClick={() => remove(c)}>মুছুন</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'নতুন কোম্পানি' : 'কোম্পানি এডিট'} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <label>কোম্পানির নাম<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>ঠিকানা<textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label>ফোন<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            {err && <div className="form-error">{err}</div>}
            <div className="form-actions">
              <button className="btn primary" type="submit">সংরক্ষণ</button>
              <button type="button" className="btn" onClick={() => setEditing(null)}>বাতিল</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
