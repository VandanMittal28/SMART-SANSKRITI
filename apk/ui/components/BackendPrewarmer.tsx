'use client'
import { useEffect } from 'react'
export function BackendPrewarmer() {
  useEffect(() => {
    // Ping backend
    fetch('https://heritageai-backend.onrender.com/')
      .catch(() => {})

    // Clean up ALL old supabase keys except the new one
    // This runs once and fixes normal tab issues permanently
    try {
      Object.keys(localStorage).forEach(key => {
        if (
          (key.includes('supabase') || key.startsWith('sb-')) &&
          key !== 'sanskriti-ai-auth'  // keep our new key
        ) {
          localStorage.removeItem(key)
        }
      })
    } catch(e) {}
  }, [])
  return null
}
