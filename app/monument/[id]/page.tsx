'use client'
import { useRouter, useParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/lib/languageContext'

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
}

interface MonumentData {
  name: string
  city: string
  description: string
  timePeriods: {
    construction: string
    colonial: string
    modern: string
  }
}

const MONUMENTS: Record<string, MonumentData> = {
  'taj-mahal': {
    name: 'Taj Mahal',
    city: 'Agra, Uttar Pradesh',
    description: 'UNESCO ivory-white marble mausoleum built by Shah Jahan',
    timePeriods: {
      construction: 'Built between 1632 and 1653 by Mughal Emperor Shah Jahan in memory of his wife Mumtaz Mahal. Over 20,000 artisans worked on this ivory-white marble mausoleum in Agra.',
      colonial: 'During British rule, Lord Curzon ordered a major restoration in 1908, replacing missing gems and restoring the gardens to their original Mughal design.',
      modern: 'Today the Taj Mahal welcomes over 7 million visitors annually. It was declared a UNESCO World Heritage Site in 1983 and is one of the Seven Wonders of the World.',
    },
  },
  'red-fort': {
    name: 'Red Fort',
    city: 'Delhi',
    description: 'Massive Mughal fort, Independence Day celebrated here',
    timePeriods: {
      construction: 'Constructed between 1638 and 1648 by Emperor Shah Jahan as the main residence of Mughal emperors. Built from red sandstone, it served as the political centre of the Mughal state.',
      colonial: 'After the 1857 uprising, the British took control and used it as a military garrison. Many original Mughal structures were demolished and replaced with barracks.',
      modern: 'Now a UNESCO World Heritage Site. Every Independence Day, the Prime Minister hoists the national flag here and addresses the nation.',
    },
  },
  'qutub-minar': {
    name: 'Qutub Minar',
    city: 'Delhi',
    description: 'Worlds tallest brick minaret at 72.5m built in 1193',
    timePeriods: {
      construction: 'Construction began in 1193 by Qutb ud-Din Aibak. Standing 73 metres tall, it was the tallest minaret in the world when built and remains the tallest brick minaret today.',
      colonial: 'British officers used the complex as a recreational area. Major Robert Smith restored the topmost storey in 1829 and added a cupola which was later removed.',
      modern: 'A UNESCO World Heritage Site visited by millions each year. Contains some of the earliest surviving examples of Islamic architecture in India.',
    },
  },
  'gateway-india': {
    name: 'Gateway of India',
    city: 'Mumbai, Maharashtra',
    description: '1924 basalt arch, last British troops left through it',
    timePeriods: {
      construction: 'Built in 1924 to commemorate the visit of King George V and Queen Mary to India in 1911. Designed in Indo-Saracenic style using yellow basalt stone by architect George Wittet.',
      colonial: 'Served as the ceremonial entrance to India for British viceroys and governors. The last British troops left India by passing through this gateway in 1948.',
      modern: 'Now one of Mumbai most iconic landmarks. Surrounded by ferry services to Elephanta Caves and overlooking the Arabian Sea. A major tourist hotspot.',
    },
  },
  'hampi': {
    name: 'Hampi',
    city: 'Hampi, Karnataka',
    description: 'Ruins of Vijayanagara Empire capital UNESCO site',
    timePeriods: {
      construction: 'Capital of the Vijayanagara Empire from 1336 to 1565. At its peak it was one of the largest cities in the world with a population of over 500,000 people.',
      colonial: 'After the empire fell in 1565, Hampi was largely abandoned. British surveyors rediscovered and documented the ruins in the 19th century.',
      modern: 'A UNESCO World Heritage Site since 1986. Spread across 4,100 hectares with over 1,600 surviving remains of temples, palaces, and market streets.',
    },
  },
  'golden-temple': {
    name: 'Golden Temple Amritsar',
    city: 'Amritsar, Punjab',
    description: 'Holiest Sikh shrine with gold-plated dome and sarovar',
    timePeriods: {
      construction: 'The foundation was laid in 1588 by Guru Arjan Dev Ji, the fifth Sikh Guru. The temple was built at a lower level than the surrounding land as a symbol of humility.',
      colonial: 'In 1984 the Indian Army launched Operation Blue Star to remove militants who had occupied the temple complex. The operation caused significant damage to the Akal Takht.',
      modern: 'The holiest shrine in Sikhism, visited by over 100,000 people daily. The community kitchen (langar) serves free meals to all visitors regardless of religion or background.',
    },
  },
  'kedarnath': {
    name: 'Kedarnath Temple',
    city: 'Kedarnath, Uttarakhand',
    description: 'One of 12 Jyotirlingas at 3583m in the Himalayas',
    timePeriods: {
      construction: 'The current temple is believed to have been built by Adi Shankaracharya in the 8th century AD, though the site is mentioned in ancient texts like the Mahabharata.',
      colonial: 'The temple remained largely untouched during British rule as it was considered a sacred Hindu site. Access was limited due to its extreme altitude and remote location.',
      modern: 'In 2013 a massive flash flood devastated the region but miraculously the temple structure survived. It is now one of the most visited pilgrimage sites in India.',
    },
  },
  'meenakshi': {
    name: 'Meenakshi Amman Temple',
    city: 'Madurai, Tamil Nadu',
    description: 'Ancient Dravidian temple with 14 towering gopurams',
    timePeriods: {
      construction: 'The temple was originally built around the 6th century BC though most of the current structure dates from the 16th and 17th centuries under the Nayak dynasty.',
      colonial: 'During British rule the temple continued to function as an active place of worship. The British generally did not interfere with major Hindu temples in South India.',
      modern: 'One of the largest Hindu temples in the world, covering 14 acres. Its 14 gopurams are covered with thousands of colorful sculptures. Attracts 15,000 to 25,000 visitors daily.',
    },
  },
  'mysore-palace': {
    name: 'Mysore Palace',
    city: 'Mysore, Karnataka',
    description: 'Indo-Saracenic royal palace lit by 100000 bulbs',
    timePeriods: {
      construction: 'The current palace was built between 1897 and 1912 after the previous wooden palace burned down. Designed by British architect Henry Irwin in the Indo-Saracenic style.',
      colonial: 'The palace was the official residence of the Wadiyar dynasty, who ruled Mysore as a princely state under British suzerainty. The kingdom was known for its progressive governance.',
      modern: 'The third most visited monument in India after the Taj Mahal and Red Fort. During Dasara festival the palace is illuminated by nearly 100,000 light bulbs.',
    },
  },
  'hawa-mahal': {
    name: 'Hawa Mahal',
    city: 'Jaipur, Rajasthan',
    description: 'Palace of Winds with 953 latticed windows built 1799',
    timePeriods: {
      construction: 'Built in 1799 by Maharaja Sawai Pratap Singh. Designed by Lal Chand Ustad in the form of the crown of Lord Krishna. The 953 small windows were designed to allow royal ladies to observe street life.',
      colonial: 'During the British Raj, Jaipur was a prominent princely state. The Hawa Mahal continued to be part of the City Palace complex and was maintained by the royal family.',
      modern: 'One of the most iconic symbols of Jaipur and Rajasthan. The unique five-storey facade is a favourite subject for photographers. It is now a protected monument under the Archaeological Survey of India.',
    },
  },
  'charminar': {
    name: 'Charminar',
    city: 'Hyderabad, Telangana',
    description: '1591 monument with 4 minarets symbol of Hyderabad',
    timePeriods: {
      construction: 'Built in 1591 by Muhammad Quli Qutb Shah to commemorate the end of a deadly plague. The four minarets each stand 56 metres tall and the structure contains a mosque on the top floor.',
      colonial: 'Hyderabad was a major princely state under the Nizams. The Charminar area became the heart of the old city with bustling bazaars around it including the famous Laad Bazaar.',
      modern: 'The defining landmark of Hyderabad. The surrounding Laad Bazaar is famous for bangles and pearls. Restoration work is ongoing by the Archaeological Survey of India.',
    },
  },
  'victoria-memorial': {
    name: 'Victoria Memorial',
    city: 'Kolkata, West Bengal',
    description: 'White marble colonial memorial to Queen Victoria',
    timePeriods: {
      construction: 'Built between 1906 and 1921 using white Makrana marble from Rajasthan. Designed by William Emerson in a mix of British and Mughal architectural styles.',
      colonial: 'Commissioned by Lord Curzon as a memorial to Queen Victoria after her death in 1901. It was intended to rival the Taj Mahal and serve as a symbol of British power in India.',
      modern: 'Now a museum with a collection of 28,000 artifacts documenting the colonial era. The surrounding gardens are a popular public space in Kolkata.',
    },
  },
  'ajanta': {
    name: 'Ajanta Caves',
    city: 'Aurangabad, Maharashtra',
    description: '30 rock-cut Buddhist caves with worlds finest murals',
    timePeriods: {
      construction: 'Carved between the 2nd century BC and 6th century AD by Buddhist monks. The 30 rock-cut caves contain some of the finest surviving examples of ancient Indian art and sculpture.',
      colonial: 'Rediscovered by British officer John Smith in 1819 during a tiger hunt. The caves had been abandoned for centuries and were hidden by jungle growth.',
      modern: 'A UNESCO World Heritage Site since 1983. The paintings inside are considered masterpieces of Buddhist religious art. Conservation efforts are ongoing to preserve the fragile murals.',
    },
  },
  'konark': {
    name: 'Konark Sun Temple',
    city: 'Konark, Odisha',
    description: '13th century Sun God temple shaped as giant chariot',
    timePeriods: {
      construction: 'Built in the 13th century by King Narasimhadeva I of the Eastern Ganga dynasty. The entire temple is designed as a giant chariot of the Sun God with 24 intricately carved stone wheels.',
      colonial: 'The temple fell into disrepair over centuries. The main tower collapsed before the colonial era. The British Archaeological Survey undertook preservation work in the early 20th century.',
      modern: 'A UNESCO World Heritage Site. The 24 wheels of the chariot are often used as a symbol of India and one wheel appears on the state emblem of Odisha.',
    },
  },
  'india-gate': {
    name: 'India Gate',
    city: 'New Delhi, Delhi',
    description: '42 metre war memorial for 70000 Indian soldiers of WWI',
    timePeriods: {
      construction: 'Designed by Edwin Lutyens and completed in 1931. Built as a memorial to 70,000 Indian soldiers who died fighting for the British Army during World War I. Names of 13,300 soldiers are inscribed on it.',
      colonial: 'Originally called the All India War Memorial. It was the centrepiece of the ceremonial axis of New Delhi designed by Lutyens as the new imperial capital of British India.',
      modern: 'Now the site of the Amar Jawan Jyoti, an eternal flame honoring soldiers killed in the 1971 Indo-Pakistani War. A major landmark and evening gathering spot in Delhi.',
    },
  },
}

const MONUMENT_FALLBACK: Record<string, string> = {
  'taj-mahal': 'The Taj Mahal was built by Emperor Shah Jahan between 1632 and 1653 in memory of his wife Mumtaz Mahal. It took over 20,000 artisans to complete and is made of white marble from Rajasthan.',
  'red-fort': 'The Red Fort was built by Emperor Shah Jahan in 1638 and served as the main residence of Mughal emperors for nearly 200 years. It is built from red sandstone.',
  'qutub-minar': 'The Qutub Minar was built in 1193 by Qutb ud-Din Aibak. Standing 73 metres tall, it was the tallest minaret in the world when built.',
  'gateway-india': 'The Gateway of India was built in 1924 to commemorate King George Vs visit. It was the last point from which British troops left India in 1948.',
  'hampi': 'Hampi was the capital of the Vijayanagara Empire from 1336 to 1565. At its peak it was one of the largest cities in the world with over 500,000 people.',
  'golden-temple': 'The Golden Temple in Amritsar is the holiest shrine in Sikhism. It serves free meals to over 100,000 people daily regardless of religion.',
  'kedarnath': 'Kedarnath Temple sits at 3,583 metres in the Himalayas. It is one of the 12 Jyotirlingas and survived the devastating 2013 flash floods miraculously.',
  'meenakshi': 'The Meenakshi Amman Temple in Madurai is one of the largest Hindu temples in the world. Its 14 gopurams are covered with thousands of colorful sculptures.',
  'mysore-palace': 'Mysore Palace was built between 1897 and 1912. During the Dasara festival it is illuminated by nearly 100,000 light bulbs and is the third most visited monument in India.',
  'hawa-mahal': 'The Hawa Mahal in Jaipur was built in 1799 with 953 latticed windows. It was designed so royal ladies could observe street life without being seen.',
  'charminar': 'The Charminar was built in 1591 by Muhammad Quli Qutb Shah to commemorate the end of a plague. Its four minarets each stand 56 metres tall.',
  'victoria-memorial': 'The Victoria Memorial in Kolkata was built between 1906 and 1921 using white Makrana marble. It is now a museum with 28,000 artifacts from the colonial era.',
  'ajanta': 'The Ajanta Caves contain 30 rock-cut Buddhist caves carved between 2nd century BC and 6th century AD. They contain some of the finest surviving ancient Indian murals.',
  'konark': 'The Konark Sun Temple was built in the 13th century and designed as a giant chariot of the Sun God with 24 intricately carved stone wheels.',
  'india-gate': 'India Gate is a 42-metre war memorial built in 1931 to honor 70,000 Indian soldiers who died in World War I. Names of 13,300 soldiers are inscribed on it.',
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          monument_id: id,
          lang,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch AI response')
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, type: 'ai', text: data.response || data.answer || 'Unable to process your question.' },
      ])
    } catch (error) {
      console.error('Chat error:', error)
      const fallbackResponse = MONUMENT_FALLBACK[id] || 'Sorry, I could not get a response. Please try again.'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, type: 'ai', text: fallbackResponse }])
    } finally {
      setLoading(false)
    }
  }

  if (!monument) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#1A1035' }}>Monument not found</h1>
          <button onClick={() => router.back()} style={{ padding: '10px 20px', background: '#534AB7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#1A1035',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          color: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{monument.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Time Travel Section with 360° viewer */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ color: '#1A1035', marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
            {lang === 'en' ? 'Time Travel' : 'समय यात्रा'}
          </h2>

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
                    border: isActive ? 'none' : '2px solid #534AB7',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#534AB7' : 'white',
                    color: isActive ? 'white' : '#534AB7',
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
          <div style={{ marginBottom: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0F0B1E' }}>
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
  body { background:#0F0B1E; overflow:hidden; }
  canvas { width:100%; height:420px; display:block; cursor:grab; }
  canvas:active { cursor:grabbing; }
  #era-badge {
    position:absolute; top:12px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.65); color:#E8C97A;
    font-family:sans-serif; font-size:13px; font-weight:600;
    padding:7px 18px; border-radius:999px;
    border:1px solid rgba(201,168,76,0.5);
    pointer-events:none; white-space:nowrap;
  }
  #hint {
    position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.55); color:#E8C97A;
    font-family:sans-serif; font-size:12px;
    padding:6px 16px; border-radius:999px;
    border:1px solid rgba(201,168,76,0.3);
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
                    'radial-gradient(circle at top, rgba(250, 250, 250, 0.1), transparent 60%), #0F0B1E',
                }}
              >
                <div style={{ fontSize: 40 }}>
                  {ERA_LABELS[activeEra].icon}
                </div>
                <div style={{ color: '#E8C97A', fontWeight: 800, fontSize: 16 }}>
                  {ERA_LABELS[activeEra].en}
                </div>
                <div style={{ color: '#E5E7EB', fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
                  {ERA_DESCRIPTIONS[activeEra]}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: '#FCD34D',
                    fontSize: 12,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(201,168,76,0.3)',
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
              backgroundColor: 'rgba(26, 16, 53, 0.8)',
              borderRadius: 12,
              border: '1px solid rgba(201, 168, 76, 0.3)',
              padding: 16,
              color: '#E5E7EB',
              fontSize: 14,
            }}
          >
            <div style={{ color: '#E8C97A', fontWeight: 700, marginBottom: 6 }}>
              {ERA_LABELS[activeEra].en}
            </div>
            <div>{ERA_DESCRIPTIONS[activeEra]}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/quiz?monument=' + id)}
            style={{
              flex: 1,
              minWidth: 220,
              padding: '12px 16px',
              background: '#534AB7',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(83, 74, 183, 0.25)',
            }}
          >
            🏛️ Take Quiz
          </button>
          <button
            onClick={() => router.push('/hunt')}
            style={{
              flex: 1,
              minWidth: 220,
              padding: '12px 16px',
              background: 'white',
              color: '#534AB7',
              border: '2px solid #534AB7',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🗺️ Treasure Hunt
          </button>
        </div>

        {/* AI Chat Section */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '500px',
          }}
        >
          <h2 style={{ color: '#1A1035', marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
            {lang === 'en' ? 'Ask AI Guide' : 'AI गाइड से पूछें'}
          </h2>

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
              <div style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>
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
                    backgroundColor: msg.type === 'user' ? '#534AB7' : '#F3F4F6',
                    color: msg.type === 'user' ? 'white' : '#1A1035',
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
                    backgroundColor: '#F3F4F6',
                    color: '#1A1035',
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
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !userInput.trim()}
              style={{
                padding: '12px 24px',
                background: '#534AB7',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: loading || !userInput.trim() ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
