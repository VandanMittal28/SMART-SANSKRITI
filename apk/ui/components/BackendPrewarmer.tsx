'use client'
import { useEffect } from 'react'
import { isBundledAndroidApp } from '@/lib/supabase/client'
export function BackendPrewarmer() {
  useEffect(() => {
    // The Android APK and iOS bundled build use local/offline fallbacks. Do
    // not make a startup request to the remote backend from those runtimes;
    // it creates noisy DownloadFailed WebKit errors and can delay first paint.
    if (!isBundledAndroidApp()) {
      fetch('https://heritageai-backend.onrender.com/').catch(() => {})
    }

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
