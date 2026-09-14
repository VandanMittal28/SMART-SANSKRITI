'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, ChevronRight, FileCheck2, Hammer, MapPin, PackagePlus, ShieldCheck, Store, Upload, UsersRound } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import { confirmMarketplaceFulfillment, createArtisanListing, loadArtisanWorkspace, submitArtisanApplication, updateArtisanListing, type ArtisanWorkspace } from '@/lib/marketplace/artisan-client'
import type { LocalArtisanListing } from '@/lib/marketplace/local-store'

const heritageSites = [
  ['taj-mahal', 'Taj Mahal', 'ताज महल'], ['agra-fort', 'Agra Fort', 'आगरा किला'],
  ['red-fort', 'Red Fort', 'लाल किला'], ['qutub-minar', 'Qutub Minar', 'क़ुतुब मीनार'],
  ['hawa-mahal', 'Hawa Mahal', 'हवा महल'], ['hampi', 'Hampi', 'हम्पी'], ['konark', 'Konark Sun Temple', 'कोणार्क सूर्य मंदिर'],
]

export default function ArtisanPortalPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const hi = lang === 'hi'
  const [workspace, setWorkspace] = useState<ArtisanWorkspace | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showListingForm, setShowListingForm] = useState(false)
  const [listingKind, setListingKind] = useState<'craft' | 'workshop'>('craft')
  const [fulfilmentPin, setFulfilmentPin] = useState('')
  const [fulfilmentKind, setFulfilmentKind] = useState<'craft' | 'workshop'>('craft')

  const refresh = async () => {
    if (!user) return
    setWorkspace(await loadArtisanWorkspace(user.id))
  }

  useEffect(() => { void refresh() }, [user?.id])

  const apply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    const documents = form.getAll('documents').filter((item): item is File => item instanceof File && item.size > 0)
    try {
      await submitArtisanApplication(user.id, {
        legalName: String(form.get('legalName') ?? ''), displayName: String(form.get('displayName') ?? ''),
        phone: String(form.get('phone') ?? ''), city: String(form.get('city') ?? ''), state: String(form.get('state') ?? ''),
        pickupArea: String(form.get('pickupArea') ?? ''), story: String(form.get('story') ?? ''),
        craftTraditions: String(form.get('craftTraditions') ?? '').split(',').map((item) => item.trim()).filter(Boolean),
        languages: String(form.get('languages') ?? '').split(',').map((item) => item.trim()).filter(Boolean),
        siteIds: form.getAll('siteIds').map(String),
      }, documents)
      await refresh()
      setMessage(hi ? 'आवेदन सुरक्षित रूप से भेज दिया गया है।' : 'Your application was submitted securely.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Application failed.') }
    finally { setBusy(false) }
  }

  const createListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    const images = form.getAll('images').filter((item): item is File => item instanceof File && item.size > 0)
    try {
      await createArtisanListing(user.id, {
        title: String(form.get('title') ?? ''), description: String(form.get('description') ?? ''), kind: listingKind,
        craftType: String(form.get('craftType') ?? ''), siteId: String(form.get('siteId') ?? ''),
        price: Number(form.get('price')), stock: listingKind === 'craft' ? Number(form.get('stock')) : null,
        pickupArea: String(form.get('pickupArea') ?? ''), exactAddress: String(form.get('exactAddress') ?? ''),
        contactPhone: String(form.get('contactPhone') ?? ''), workshopStartsAt: String(form.get('workshopStartsAt') ?? ''),
        workshopCapacity: Number(form.get('workshopCapacity') ?? 8), sourceLanguage: String(form.get('sourceLanguage') ?? lang), images,
      })
      await refresh(); setShowListingForm(false)
      setMessage(hi ? 'लिस्टिंग समीक्षा के लिए भेजी गई है।' : 'Listing sent for admin review.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Listing could not be created.') }
    finally { setBusy(false) }
  }

  const manageListing = async (listing: LocalArtisanListing, action: 'availability' | 'quantity') => {
    if (!user) return
    let quantity: number | undefined
    if (action === 'quantity') {
      const reserved = (listing.workshopReserved ?? 0) + (listing.workshopHeld ?? 0)
      const current = listing.kind === 'craft' ? listing.stock ?? 0 : listing.workshopCapacity ?? 1
      const answer = window.prompt(
        listing.kind === 'craft' ? (hi ? 'नया उपलब्ध स्टॉक' : 'New available stock') : (hi ? `नई क्षमता (कम से कम ${Math.max(1, reserved)})` : `New capacity (at least ${Math.max(1, reserved)})`),
        String(current),
      )
      if (answer === null) return
      quantity = Number(answer)
      if (!Number.isInteger(quantity) || quantity < (listing.kind === 'craft' ? 0 : Math.max(1, reserved))) {
        setMessage(hi ? 'मान्य मात्रा दर्ज करें।' : 'Enter a valid quantity.')
        return
      }
    }
    setBusy(true); setMessage('')
    try {
      await updateArtisanListing(user.id, listing, action === 'availability' ? { active: !listing.active } : { quantity })
      await refresh()
      setMessage(hi ? 'लिस्टिंग अपडेट हो गई।' : 'Listing updated.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Listing update failed.') }
    finally { setBusy(false) }
  }

  const confirmFulfilment = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setBusy(true); setMessage('')
    try {
      await confirmMarketplaceFulfillment(user.id, fulfilmentPin, fulfilmentKind)
      setFulfilmentPin(''); setMessage(hi ? 'पिकअप या उपस्थिति की पुष्टि हो गई।' : 'Pickup or attendance confirmed.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Confirmation failed.') }
    finally { setBusy(false) }
  }

  if (!user) return <AppShell><div className="screen-gutter py-12 text-center"><Store className="mx-auto h-9 w-9 text-[#D6A84B]" /><h1 className="mt-4 text-2xl font-bold text-[#F6F1E8]">{hi ? 'कारीगर पोर्टल' : 'Artisan portal'}</h1><p className="mt-2 text-sm text-[#AEB6C8]">{hi ? 'आवेदन करने और लिस्टिंग प्रबंधित करने के लिए साइन इन करें।' : 'Sign in to apply and manage listings.'}</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#D6A84B] px-5 py-3 text-sm font-black text-[#171004]">{hi ? 'साइन इन करें' : 'Sign in'}</Link></div></AppShell>
  if (!workspace) return <AppShell><div className="grid min-h-[70vh] place-items-center"><Spinner className="size-9 text-[#D6A84B]" /></div></AppShell>

  return (
    <AppShell>
      <div className="screen-gutter py-5">
        <header className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#D6A84B]">{hi ? 'कारीगर केंद्र' : 'Maker studio'}</p><h1 className="mt-1 font-heritage text-[28px] font-bold text-[#F6F1E8]">{hi ? 'नमस्ते, कारीगर' : 'Artisan portal'}</h1><p className="mt-1 text-sm text-[#AEB6C8]">{hi ? 'अपनी कला साझा करें और यात्रियों से जुड़ें।' : 'Share your craft and welcome heritage travellers.'}</p></div><Link href="/marketplace" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 text-[#D6A84B]" aria-label={hi ? 'बाज़ार खोलें' : 'Open marketplace'}><Store className="h-5 w-5" /></Link></header>

        {workspace.demo ? <p className="mt-4 rounded-xl border border-[#63C7BA]/20 bg-[#63C7BA]/[0.06] p-3 text-[11px] leading-5 text-[#A9E5DB]">{hi ? 'पायलट पोर्टल: इस डिवाइस पर आवेदन और लिस्टिंग सुरक्षित हैं। एडमिन डेमो से अनुमोदन करें।' : 'Pilot portal: applications and listings are saved on this device. Use the admin demo to approve them.'}</p> : null}
        {message ? <p role="status" className="mt-3 rounded-xl border border-[#D6A84B]/20 bg-[#D6A84B]/[0.06] p-3 text-xs leading-5 text-[#F3DFC0]">{message}</p> : null}

        {!workspace.application ? (
          <form onSubmit={apply} className="app-card mt-5 space-y-4 rounded-[24px] p-4">
            <div><h2 className="flex items-center gap-2 text-lg font-bold text-[#F6F1E8]"><ShieldCheck className="h-5 w-5 text-[#63C7BA]" />{hi ? 'सत्यापन आवेदन' : 'Verification application'}</h2><p className="mt-1 text-xs leading-5 text-[#8891A6]">{hi ? 'सिर्फ़ स्वीकृत कारीगर ही सार्वजनिक लिस्टिंग बना सकते हैं।' : 'Only approved artisans can publish marketplace listings.'}</p></div>
            <div className="grid grid-cols-2 gap-3"><FormInput name="legalName" label={hi ? 'कानूनी नाम' : 'Legal name'} required /><FormInput name="displayName" label={hi ? 'दिखने वाला नाम' : 'Display name'} defaultValue={profile?.full_name} required /></div>
            <FormInput name="phone" label={hi ? 'फ़ोन' : 'Phone'} type="tel" required />
            <div className="grid grid-cols-2 gap-3"><FormInput name="city" label={hi ? 'शहर' : 'City'} required /><FormInput name="state" label={hi ? 'राज्य' : 'State'} required /></div>
            <FormInput name="pickupArea" label={hi ? 'सार्वजनिक पिकअप क्षेत्र' : 'Public pickup area'} placeholder={hi ? 'सटीक पता नहीं' : 'Do not enter exact address'} required />
            <FormInput name="craftTraditions" label={hi ? 'कला परंपराएं' : 'Craft traditions'} placeholder={hi ? 'पच्चीकारी, कढ़ाई' : 'Marble inlay, embroidery'} required />
            <FormInput name="languages" label={hi ? 'बोली जाने वाली भाषाएं' : 'Languages spoken'} defaultValue="Hindi, English" required />
            <label className="block text-xs font-bold text-[#AEB6C8]">{hi ? 'आपकी कहानी' : 'Your artisan story'}<textarea name="story" minLength={60} required rows={4} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8] outline-none focus:border-[#D6A84B]/45" /></label>
            <fieldset><legend className="text-xs font-bold text-[#AEB6C8]">{hi ? 'पास के स्मारक' : 'Nearby monuments'}</legend><div className="mt-2 grid grid-cols-2 gap-2">{heritageSites.map(([id, en, hindi]) => <label key={id} className="flex items-center gap-2 rounded-xl border border-white/8 p-2.5 text-[11px] text-[#D9C7AA]"><input type="checkbox" name="siteIds" value={id} className="accent-[#D6A84B]" />{hi ? hindi : en}</label>)}</div></fieldset>
            <label className="block rounded-xl border border-dashed border-[#D6A84B]/30 bg-[#D6A84B]/[0.04] p-4 text-center text-xs text-[#AEB6C8]"><Upload className="mx-auto mb-2 h-5 w-5 text-[#D6A84B]" />{hi ? 'पहचान या कला प्रमाण जोड़ें' : 'Add identity or craft proof'}<input type="file" name="documents" accept="image/jpeg,image/png,application/pdf" multiple className="mt-2 block w-full text-[10px]" /></label>
            <button disabled={busy} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#D6A84B] font-black text-[#171004] disabled:opacity-60">{busy ? <Spinner className="size-4" /> : <FileCheck2 className="h-4 w-4" />}{hi ? 'समीक्षा के लिए भेजें' : 'Submit for review'}</button>
          </form>
        ) : !workspace.approved ? (
          <section className="app-card mt-5 rounded-[24px] p-5 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#D6A84B]/12 text-[#F7D88C]"><ShieldCheck className="h-7 w-7" /></span><p className="mt-4 text-xs font-black uppercase tracking-wider text-[#D6A84B]">{workspace.application.status}</p><h2 className="mt-2 text-xl font-bold text-[#F6F1E8]">{hi ? 'आपका आवेदन समीक्षा में है' : 'Your application is under review'}</h2><p className="mt-2 text-sm leading-6 text-[#AEB6C8]">{hi ? 'हम पहचान, कला परंपरा और स्मारक से स्थानीय संबंध की जाँच करेंगे।' : 'We will verify identity, craft tradition, and the local connection to your selected monuments.'}</p>{workspace.application.adminNote ? <p className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-[#D9C7AA]">{workspace.application.adminNote}</p> : null}<Link href="/admin/marketplace" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#63C7BA]">{hi ? 'पायलट एडमिन खोलें' : 'Open pilot admin'}<ChevronRight className="h-4 w-4" /></Link></section>
        ) : (
          <>
            <section className="mt-5 rounded-[24px] border border-[#63C7BA]/24 bg-[#63C7BA]/[0.07] p-4"><p className="flex items-center gap-2 font-bold text-[#F6F1E8]"><BadgeCheck className="h-5 w-5 text-[#63C7BA]" />{hi ? 'सत्यापित कारीगर' : 'Verified artisan'}</p><p className="mt-1 text-xs text-[#A9E5DB]">{workspace.application.displayName} · {workspace.application.city}</p></section>
            <section className="app-card mt-4 rounded-[24px] p-4"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[#F6F1E8]">{hi ? 'मेरी लिस्टिंग' : 'My listings'}</h2><p className="mt-1 text-xs text-[#8891A6]">{workspace.listings.length} {hi ? 'कुल' : 'total'}</p></div><button type="button" onClick={() => setShowListingForm((value) => !value)} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-[#D6A84B] px-3 text-xs font-black text-[#171004]"><PackagePlus className="h-4 w-4" />{hi ? 'नई' : 'New'}</button></div>{workspace.listings.length ? <div className="mt-3 space-y-2">{workspace.listings.map((item) => <div key={item.id} className="rounded-xl border border-white/8 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#F6F1E8]">{item.title}</p><p className="mt-1 text-[10px] text-[#8891A6]">{item.kind} · ₹{item.price.toLocaleString('en-IN')} · {item.kind === 'craft' ? `${hi ? 'स्टॉक' : 'stock'} ${item.stock ?? 0}` : `${hi ? 'क्षमता' : 'capacity'} ${item.workshopCapacity ?? 0}`}</p></div><span className="rounded-full bg-white/6 px-2 py-1 text-[9px] font-black uppercase text-[#AEB6C8]">{item.active === false ? (hi ? 'रोकी गई' : 'paused') : item.status}</span></div><div className="mt-2 flex gap-2"><button type="button" disabled={busy} onClick={() => void manageListing(item, 'quantity')} className="min-h-9 flex-1 rounded-lg border border-white/10 text-[10px] font-bold text-[#D9C7AA] disabled:opacity-50">{item.kind === 'craft' ? (hi ? 'स्टॉक बदलें' : 'Update stock') : (hi ? 'क्षमता बदलें' : 'Update capacity')}</button><button type="button" disabled={busy} onClick={() => void manageListing(item, 'availability')} className="min-h-9 flex-1 rounded-lg border border-[#D6A84B]/25 text-[10px] font-bold text-[#F7D88C] disabled:opacity-50">{item.active === false ? (hi ? 'फिर शुरू करें' : 'Resume') : (hi ? 'रोकें' : 'Pause')}</button></div></div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#8891A6]">{hi ? 'अभी कोई लिस्टिंग नहीं' : 'No listings yet'}</p>}</section>

            {showListingForm ? <form onSubmit={createListing} className="app-card mt-4 space-y-4 rounded-[24px] p-4"><h2 className="flex items-center gap-2 font-bold text-[#F6F1E8]"><Hammer className="h-5 w-5 text-[#D6A84B]" />{hi ? 'नई कला लिस्टिंग' : 'New art listing'}</h2><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setListingKind('craft')} className={`min-h-11 rounded-xl border text-xs font-bold ${listingKind === 'craft' ? 'border-[#D6A84B] bg-[#D6A84B]/12 text-[#F7D88C]' : 'border-white/8 text-[#8891A6]'}`}>{hi ? 'हस्तशिल्प' : 'Craft pickup'}</button><button type="button" onClick={() => setListingKind('workshop')} className={`min-h-11 rounded-xl border text-xs font-bold ${listingKind === 'workshop' ? 'border-[#D6A84B] bg-[#D6A84B]/12 text-[#F7D88C]' : 'border-white/8 text-[#8891A6]'}`}>{hi ? 'कार्यशाला' : 'Workshop'}</button></div><FormInput name="title" label={hi ? 'शीर्षक' : 'Listing title'} required /><label className="block text-xs font-bold text-[#AEB6C8]">{hi ? 'मूल भाषा' : 'Source language'}<select name="sourceLanguage" defaultValue={lang} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]">{SUPPORTED_LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.nativeName} · {language.name}</option>)}</select></label><label className="block text-xs font-bold text-[#AEB6C8]">{hi ? 'विवरण' : 'Description'}<textarea name="description" minLength={40} rows={4} required className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]" /></label><FormInput name="craftType" label={hi ? 'कला रूप' : 'Craft form'} required /><label className="block text-xs font-bold text-[#AEB6C8]">{hi ? 'स्मारक' : 'Monument'}<select name="siteId" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]">{heritageSites.map(([id, en, hindi]) => <option key={id} value={id}>{hi ? hindi : en}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><FormInput name="price" label={hi ? 'कीमत ₹' : 'Price ₹'} type="number" min="1" required />{listingKind === 'craft' ? <FormInput name="stock" label={hi ? 'स्टॉक' : 'Stock'} type="number" min="1" required /> : <FormInput name="workshopCapacity" label={hi ? 'क्षमता' : 'Capacity'} type="number" min="1" defaultValue="8" required />}</div>{listingKind === 'workshop' ? <FormInput name="workshopStartsAt" label={hi ? 'कार्यशाला का समय' : 'Workshop date and time'} type="datetime-local" required /> : null}<label className="block rounded-xl border border-dashed border-[#D6A84B]/30 bg-[#D6A84B]/[0.04] p-4 text-center text-xs text-[#AEB6C8]"><Upload className="mx-auto mb-2 h-5 w-5 text-[#D6A84B]" />{hi ? 'कला या कार्यशाला की तस्वीरें' : 'Craft or workshop photos'}<input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple required className="mt-2 block w-full text-[10px]" /></label><FormInput name="pickupArea" label={hi ? 'सार्वजनिक पिकअप क्षेत्र' : 'Public pickup area'} defaultValue={workspace.application.pickupArea} required /><FormInput name="exactAddress" label={hi ? 'बुकिंग के बाद दिखने वाला सटीक पता' : 'Exact address shown after booking'} required /><FormInput name="contactPhone" label={hi ? 'संपर्क फ़ोन' : 'Contact phone'} type="tel" defaultValue={workspace.application.phone} required /><p className="rounded-xl bg-[#D6A84B]/[0.06] p-3 text-[11px] leading-5 text-[#D9C7AA]">{hi ? '20% अग्रिम भुगतान लिया जाएगा। अनुवाद अपने आप बनेंगे और प्रकाशन से पहले एडमिन समीक्षा करेगा।' : 'A 20% advance is collected. Translations are generated automatically and an admin reviews the listing before publication.'}</p><button disabled={busy} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#D6A84B] font-black text-[#171004] disabled:opacity-60">{busy ? <Spinner className="size-4" /> : <PackagePlus className="h-4 w-4" />}{hi ? 'समीक्षा के लिए लिस्टिंग भेजें' : 'Submit listing for review'}</button></form> : null}

            <form onSubmit={confirmFulfilment} className="app-card mt-4 rounded-[24px] p-4"><h2 className="flex items-center gap-2 font-bold text-[#F6F1E8]"><UsersRound className="h-5 w-5 text-[#63C7BA]" />{hi ? 'पिकअप या उपस्थिति की पुष्टि' : 'Confirm pickup or attendance'}</h2><p className="mt-1 text-xs leading-5 text-[#8891A6]">{hi ? 'यात्री से छह अंकों का PIN लें।' : 'Ask the visitor for their six-digit PIN.'}</p><div className="mt-3 flex gap-2"><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={fulfilmentPin} onChange={(event) => setFulfilmentPin(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171F34] px-3 text-center font-mono text-lg tracking-[0.18em] text-[#F6F1E8]" /><select value={fulfilmentKind} onChange={(event) => setFulfilmentKind(event.target.value as 'craft' | 'workshop')} className="rounded-xl border border-white/10 bg-[#171F34] px-2 text-xs text-[#F6F1E8]"><option value="craft">Pickup</option><option value="workshop">Workshop</option></select><button disabled={busy || fulfilmentPin.length !== 6} className="rounded-xl bg-[#63C7BA] px-3 text-xs font-black text-[#071B19] disabled:opacity-40">{hi ? 'पुष्टि' : 'Confirm'}</button></div></form>
          </>
        )}
      </div>
    </AppShell>
  )
}

function FormInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-xs font-bold text-[#AEB6C8]">{label}<input {...props} className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#171F34] px-3 text-sm text-[#F6F1E8] outline-none focus:border-[#D6A84B]/45" /></label>
}
