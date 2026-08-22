"use client"

import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
}

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        background: 'rgba(28,22,56,0.97)',
        border: '1px solid rgba(201,168,76,0.6)',
        borderRadius: 12, padding: '12px 20px',
        color: '#E8C97A', fontWeight: 'bold',
        zIndex: 9999, display: 'flex',
        alignItems: 'center', gap: 10,
        animation: 'slideInRight 0.3s ease',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(201,168,76,0.15)',
        fontSize: 15,
        minWidth: 200,
      }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <span>{message}</span>
      </div>
    </>
  )
}

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => setToast(msg)
  const hideToast = () => setToast(null)
  return { toast, showToast, hideToast }
}
