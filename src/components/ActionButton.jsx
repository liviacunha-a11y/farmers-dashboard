// src/components/ActionButton.jsx
import { useState } from 'react'

export default function ActionButton({ icon, label, action }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    setStatus('loading')
    setMessage('')
    try {
      const result = await action()
      setMessage(result.message)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const base = 'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm transition-all'
  const styles = {
    idle: `${base} bg-gray-100 hover:bg-gray-200 cursor-pointer`,
    loading: `${base} bg-gray-100 animate-pulse cursor-not-allowed`,
    success: `${base} bg-green-100 text-green-700`,
    error: `${base} bg-red-100 text-red-700`,
  }
  const icons = { idle: icon, loading: '⏳', success: '✅', error: '❌' }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className={styles[status]}
      title={message || label}
      aria-label={label}
    >
      {icons[status]}
    </button>
  )
}
