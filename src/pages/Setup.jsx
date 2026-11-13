import React, { useState } from 'react'
import { saveConfig } from '../supabase.js'

export default function Setup() {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!/^https:\/\/.+\.supabase\.(co|in)/.test(url.trim())) {
      setErr('সঠিক Supabase Project URL দিন (https://xxxx.supabase.co)')
      return
    }
    if (key.trim().length < 20) {
      setErr('সঠিক anon key দিন')
      return
    }
    setErr('')
    saveConfig(url, key)
    window.location.reload()
  }

  return (
    <div className="setup-wrap">
      <form className="setup-card" onSubmit={submit}>
        <div className="setup-logo">হিসাব</div>
        <p className="setup-sub">অ্যাকাউন্টিং সফটওয়্যার — শুরু করতে Supabase কানেক্ট করুন</p>
        <label>Supabase Project URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://xxxxxxxx.supabase.co"
        />
        <label>Supabase anon key</label>
        <textarea
          rows={3}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="eyJhbGciOi..."
        />
        {err && <div className="form-error">{err}</div>}
        <button className="btn primary block" type="submit">
          কানেক্ট করুন
        </button>
        <div className="setup-help">
          <p>
            ১. <b>supabase.com</b> এ ফ্রি অ্যাকাউন্ট খুলুন ও নতুন প্রজেক্ট তৈরি করুন।
          </p>
          <p>
            ২. SQL Editor-এ রিপোর <code>supabase/schema.sql</code> ফাইলের পুরো SQL রান করুন।
          </p>
          <p>
            ৩. Project Settings → API থেকে URL ও anon key কপি করে উপরে বসান।
          </p>
        </div>
      </form>
    </div>
  )
}
