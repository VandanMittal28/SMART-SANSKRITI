'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/lib/languageContext'
import { AppShell } from '@/components/app-shell'
import { ArrowLeft, Brain, Headphones, MapPin, Route, Send, ShoppingBag, Ticket } from 'lucide-react'
import api from '@/lib/apiClient'
import { offlineHeritageAnswer } from '@/lib/offlineHeritage'
import { MONUMENTS, MONUMENT_FALLBACK } from '@/lib/monumentData'

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
}

export default function MonumentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const monument = MONUMENTS[id]

  type EraKey = 'construction' | 'peak_glory' | 'colonial' | 'modern'

  const [activeEra, setActiveEra] = useState<EraKey>('construction')
  const { lang } = useLang()
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasPanorama, setHasPanorama] = useState<boolean | null>(null)

  const monumentSlug = id.replace(/-/g, '_')
  const currentImagePath = `/time_travel/${monumentSlug}/${activeEra}.jpg`

  const ERA_LABELS: Record<EraKey, { icon: string; en: string; hi: string; period: string }> = {
    construction: {
      icon: '🏗️',
      en: 'Construction',
      hi: 'निर्माण',
      period: 'Construction Era',
    },
    peak_glory: {
      icon: '✨',
      en: 'Peak Glory',
      hi: 'उत्कर्ष काल',
      period: 'Peak Glory',
    },
    colonial: {
      icon: '🇬🇧',
      en: 'Colonial',
      hi: 'औपनिवेशिक',
      period: 'Colonial Period',
    },
    modern: {
      icon: '📸',
      en: 'Modern',
      hi: 'आधुनिक',
      period: 'Modern Day',
    },
  }

  const ERA_DESCRIPTIONS: Record<EraKey, string> = {
    construction:
      'The monument is being built. Thousands of artisans at work, raw stone being carved into history.',
    peak_glory:
      'At the height of Mughal power. The monument gleams in full original glory — vibrant colours, royal ceremonies.',
    colonial:
      'Under British rule. The monument has aged, colonial visitors exploring ancient ruins.',
    modern:
      'Today — fully restored, UNESCO protected, millions of visitors experiencing living history.',
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    setHasPanorama(null)
    const img = new Image()
    img.onload = () => setHasPanorama(true)
    img.onerror = () => setHasPanorama(false)
    img.src = currentImagePath
  }, [currentImagePath])

  const handleSendMessage = async () => {
    if (!userInput.trim()) return

    const userMessage = userInput
    setUserInput('')
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, type: 'user', text: userMessage }])
    setLoading(true)

    try {
      const res = await api.askChat(userMessage, id, lang)
      const answer = res.data.answer || res.data.response
      if (!answer) throw new Error('Empty AI response')
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, type: 'ai', text: answer }])
    } catch (error) {
      console.error('Chat error:', error)
      const fallbackResponse = offlineHeritageAnswer(userMessage, id, lang) || MONUMENT_FALLBACK[id]
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, type: 'ai', text: fallbackResponse }])
    } finally {
      setLoading(false)
    }
  }

  if (!monument) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#080D1D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#F6F1E8', fontFamily: 'var(--font-literata), Georgia, serif' }}>Monument not found</h1>
          <button onClick={() => router.back()} style={{ marginTop: 16, padding: '10px 20px', background: '#D6A84B', color: '#171004', fontWeight: 700, border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 20 }}>
        <button type="button" onClick={() => router.back()} className="mb-4 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[#AEB6C8]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <section className="mb-5 rounded-2xl border border-[#D6A84B]/18 bg-[#11182B] p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#AEB6C8]"><MapPin className="h-3.5 w-3.5" /> {monument.city}</p>
          <h1 className="mt-2 font-heritage text-[28px] font-bold leading-9 text-[#F6F1E8]">{monument.name}</h1>
          <p className="mt-2 text-sm leading-6 text-[#C7CDDA]">{monument.description}</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <button type="button" onClick={() => router.push('/chat')} className="flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-[#171F34] text-[11px] font-bold text-[#F3DFC0]"><Headphones className="h-5 w-5 text-[#D6A84B]" /> Audio guide</button>
            <button type="button" onClick={() => router.push('/explore')} className="flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-[#171F34] text-[11px] font-bold text-[#F3DFC0]"><Route className="h-5 w-5 text-[#D6A84B]" /> Start tour</button>
            <button type="button" onClick={() => router.push('/tickets')} className="flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-[#171F34] text-[11px] font-bold text-[#F3DFC0]"><Ticket className="h-5 w-5 text-[#D6A84B]" /> Tickets</button>
            <button type="button" onClick={() => router.push(`/marketplace/?site=${id}`)} className="flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-xl border border-white/8 bg-[#171F34] text-center text-[10px] font-bold leading-3 text-[#F3DFC0]"><ShoppingBag className="h-5 w-5 text-[#63C7BA]" /> Local art</button>
          </div>
        </section>

        {/* Time Travel Section with 360° viewer */}
        <div
          style={{
            backgroundColor: '#11182B',
            border: '1px solid rgba(214,168,75,.16)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ color: '#F6F1E8', fontFamily: 'var(--font-literata), Georgia, serif', marginTop: 0, marginBottom: '4px', fontSize: '19px', fontWeight: 700 }}>
            {lang === 'en' ? 'Time Travel' : 'समय यात्रा'}
          </h2>
          <p style={{ color: '#AEB6C8', margin: '0 0 14px', fontSize: 12 }}>See how this place changed across eras.</p>

          {/* Era Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {(Object.keys(ERA_LABELS) as EraKey[]).map((era) => {
              const meta = ERA_LABELS[era]
              const label = lang === 'en' ? meta.en : meta.hi
              const isActive = activeEra === era
              return (
                <button
                  key={era}
                  onClick={() => setActiveEra(era)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '999px',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,.1)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#D6A84B' : '#171F34',
                    color: isActive ? '#171004' : '#AEB6C8',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <span>{meta.icon}</span>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {/* 360° Viewer or placeholder */}
          <div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#080D1D' }}>
            {hasPanorama ? (
              <iframe
                title="Panoramic time travel"
                style={{ width: '100%', height: 420, border: 'none' }}
                srcDoc={(() => {
                  const meta = ERA_LABELS[activeEra]
                  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#080D1D; overflow:hidden; }
  canvas { width:100%; height:420px; display:block; cursor:grab; }
  canvas:active { cursor:grabbing; }
  #era-badge {
    position:absolute; top:12px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.65); color:#E8C97A;
    font-family:sans-serif; font-size:13px; font-weight:600;
    padding:7px 18px; border-radius:999px;
    border:1px solid rgba(214,168,75,0.5);
    pointer-events:none; white-space:nowrap;
  }
  #hint {
    position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.55); color:#E8C97A;
    font-family:sans-serif; font-size:12px;
    padding:6px 16px; border-radius:999px;
    border:1px solid rgba(214,168,75,0.3);
    pointer-events:none; transition:opacity 1.5s ease;
  }
</style>
</head>
<body>
<div style="position:relative; width:100%; height:420px;">
  <canvas id="c"></canvas>
  <div id="era-badge">ERA_LABEL · ERA_PERIOD</div>
  <div id="hint">🖱️ Drag to look around · Scroll to zoom</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
  const canvas = document.getElementById('c');
  const W = window.innerWidth, H = 420;
  canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(W, H);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, W/H, 0.1, 1000);
  camera.position.set(0,0,0.001);
  const geo = new THREE.SphereGeometry(500, 60, 40);
  geo.scale(-1,1,1);
  const loader = new THREE.TextureLoader();
  loader.load('IMAGE_URL', function(tex) {
    const mat = new THREE.MeshBasicMaterial({map:tex});
    scene.add(new THREE.Mesh(geo, mat));
    animate();
  });
  let isDragging=false, prevX=0, prevY=0, lon=0, lat=0, autoRotate=true;
  canvas.addEventListener('mousedown', e=>{isDragging=true;prevX=e.clientX;prevY=e.clientY;autoRotate=false;document.getElementById('hint').style.opacity='0';});
  canvas.addEventListener('mouseup', ()=>isDragging=false);
  canvas.addEventListener('mouseleave', ()=>isDragging=false);
  canvas.addEventListener('mousemove', e=>{
    if(!isDragging)return;
    lon-=(e.clientX-prevX)*0.3; lat+=(e.clientY-prevY)*0.15;
    lat=Math.max(-85,Math.min(85,lat));
    prevX=e.clientX; prevY=e.clientY;
  });
  canvas.addEventListener('touchstart', e=>{isDragging=true;prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;autoRotate=false;},{passive:true});
  canvas.addEventListener('touchend', ()=>isDragging=false);
  canvas.addEventListener('touchmove', e=>{
    if(!isDragging)return;
    lon-=(e.touches[0].clientX-prevX)*0.3; lat+=(e.touches[0].clientY-prevY)*0.15;
    lat=Math.max(-85,Math.min(85,lat));
    prevX=e.touches[0].clientX; prevY=e.touches[0].clientY;
  },{passive:true});
  let fov=75;
  canvas.addEventListener('wheel', e=>{fov=Math.max(30,Math.min(100,fov+e.deltaY*0.05));camera.fov=fov;camera.updateProjectionMatrix();});
  function animate(){
    requestAnimationFrame(animate);
    if(autoRotate) lon+=0.03;
    const phi=THREE.MathUtils.degToRad(90-lat);
    const theta=THREE.MathUtils.degToRad(lon);
    camera.lookAt(Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta));
    renderer.render(scene,camera);
  }
</script>
</body>
</html>`
                  return html
                    .replace('IMAGE_URL', currentImagePath)
                    .replace('ERA_LABEL', meta.en)
                    .replace('ERA_PERIOD', meta.period)
                })()}
              />
            ) : (
              <div
                style={{
                  minHeight: 220,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background:
                    'radial-gradient(circle at top, rgba(250, 250, 250, 0.1), transparent 60%), #080D1D',
                }}
              >
                <div style={{ fontSize: 40 }}>
                  {ERA_LABELS[activeEra].icon}
                </div>
                <div style={{ color: '#E8C97A', fontWeight: 800, fontSize: 16 }}>
                  {ERA_LABELS[activeEra].en}
                </div>
                <div style={{ color: '#C7CDDA', fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
                  {ERA_DESCRIPTIONS[activeEra]}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: '#E8C97A',
                    fontSize: 12,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(214,168,75,0.3)',
                  }}
                >
                  📁 360° panorama coming soon for this era
                </div>
              </div>
            )}
          </div>

          {/* Era description card */}
          <div
            style={{
              backgroundColor: 'rgba(17, 24, 43, 0.85)',
              borderRadius: 12,
              border: '1px solid rgba(214, 168, 75, 0.3)',
              padding: 16,
              color: '#C7CDDA',
              fontSize: 14,
            }}
          >
            <div style={{ color: '#F3DFC0', fontWeight: 700, marginBottom: 6 }}>
              {ERA_LABELS[activeEra].en}
            </div>
            <div>{ERA_DESCRIPTIONS[activeEra]}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => router.push('/quiz?monument=' + id)}
            style={{
              flex: 1,
              minHeight: 48,
              padding: '12px 14px',
              background: '#D6A84B',
              color: '#171004',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(83, 74, 183, 0.25)',
            }}
          >
            <Brain size={16} style={{ display: 'inline', marginRight: 6 }} />Take Quiz
          </button>
          <button
            onClick={() => router.push('/hunt')}
            style={{
              flex: 1,
              minHeight: 48,
              padding: '12px 14px',
              background: '#171F34',
              color: '#F6F1E8',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Heritage Hunt
          </button>
        </div>

        {/* AI Chat Section */}
        <div
          style={{
            backgroundColor: '#11182B',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(214,168,75,.16)',
            display: 'flex',
            flexDirection: 'column',
            height: '500px',
          }}
        >
          <h2 style={{ color: '#F6F1E8', fontFamily: 'var(--font-literata), Georgia, serif', marginTop: 0, marginBottom: '4px', fontSize: '19px', fontWeight: 700 }}>
            {lang === 'en' ? 'Ask AI Guide' : 'AI गाइड से पूछें'}
          </h2>
          <p style={{ color: '#AEB6C8', fontSize: 12, margin: '0 0 14px' }}>Ask about history, architecture or your visit.</p>

          {/* Messages List */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingRight: '8px',
              minHeight: 300,
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#8891A6', textAlign: 'center', marginTop: '40px', fontSize: 13 }}>
                Ask me anything about {monument.name}!
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: 16,
                    backgroundColor: msg.type === 'user' ? '#D6A84B' : '#171F34',
                    color: msg.type === 'user' ? '#171004' : '#F6F1E8',
                    wordWrap: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    backgroundColor: '#171F34',
                    color: '#AEB6C8',
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSendMessage()
              }}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid rgba(214,168,75,.2)',
                background: '#080D1D',
                color: '#F6F1E8',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !userInput.trim()}
              style={{
                minWidth: 48,
                padding: '12px',
                background: '#D6A84B',
                color: '#171004',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading || !userInput.trim() ? 0.6 : 1,
              }}
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
