'use client'

interface SanskritiLogoProps {
  size?: number
}

export default function SanskritiLogo({ size = 40 }: SanskritiLogoProps) {
  return (
    <svg viewBox="0 0 680 680" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Flame gradients */}
        <radialGradient id="flameGrad" cx="50%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#FFF4B8" />
          <stop offset="30%" stopColor="#FFD700" />
          <stop offset="60%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#FF8C00" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes spinCW18  { to { transform: rotate(360deg) } }
        @keyframes spinCCW12 { to { transform: rotate(-360deg) } }
        @keyframes spinCW8   { to { transform: rotate(360deg) } }
        @keyframes spinCCW25 { to { transform: rotate(-360deg) } }
        @keyframes flameMain {
          0%   { transform: scaleX(1) scaleY(1) }
          50%  { transform: scaleX(0.88) scaleY(1.08) }
          100% { transform: scaleX(1.05) scaleY(0.94) }
        }
        @keyframes flameLeft {
          0%   { transform: rotate(0deg) }
          50%  { transform: rotate(-6deg) }
          100% { transform: rotate(3deg) }
        }
        @keyframes flameRight {
          0%   { transform: rotate(0deg) }
          50%  { transform: rotate(5deg) }
          100% { transform: rotate(-4deg) }
        }
        @keyframes glowPulse {
          0%   { opacity: 0.4 }
          100% { opacity: 0.7 }
        }
        .ring-outer  { animation: spinCW18  18s linear infinite; transform-origin: 340px 340px }
        .ring-mid    { animation: spinCCW12 12s linear infinite; transform-origin: 340px 340px }
        .ring-inner  { animation: spinCW8    8s linear infinite; transform-origin: 340px 340px }
        .spokes      { animation: spinCCW25 25s linear infinite; transform-origin: 340px 340px }
        .flame-main  { animation: flameMain  1.4s ease-in-out infinite alternate; transform-origin: 340px 330px }
        .flame-left  { animation: flameLeft  1.1s ease-in-out infinite alternate; transform-origin: 340px 330px }
        .flame-right { animation: flameRight 1.3s ease-in-out infinite alternate; transform-origin: 340px 330px }
        .glow        { animation: glowPulse  2s   ease-in-out infinite alternate }
      `}</style>

      {/* Background circle */}
      <circle cx="340" cy="340" r="320" fill="#1A0F00" />

      {/* 8 Spokes */}
      <g className="spokes" opacity="0.4">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45) * Math.PI / 180
          const x2 = 340 + Math.cos(a) * 280
          const y2 = 340 + Math.sin(a) * 280
          return <line key={`s${i}`} x1="340" y1="340" x2={x2} y2={y2} stroke="#C9821A" strokeWidth="1.5" />
        })}
      </g>

      {/* Outer ring — 16 gold dots */}
      <g className="ring-outer">
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i * 22.5) * Math.PI / 180
          const cx = 340 + Math.cos(a) * 200
          const cy = 340 + Math.sin(a) * 200
          return <circle key={`o${i}`} cx={cx} cy={cy} r="5" fill="#C9A84C" />
        })}
      </g>

      {/* Mid ring — 8 orange dots */}
      <g className="ring-mid">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45) * Math.PI / 180
          const cx = 340 + Math.cos(a) * 155
          const cy = 340 + Math.sin(a) * 155
          return <circle key={`m${i}`} cx={cx} cy={cy} r="4.5" fill="#D4893F" />
        })}
      </g>

      {/* Inner ring — 8 amber dots */}
      <g className="ring-inner">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45) * Math.PI / 180
          const cx = 340 + Math.cos(a) * 115
          const cy = 340 + Math.sin(a) * 115
          return <circle key={`n${i}`} cx={cx} cy={cy} r="4" fill="#FFB830" />
        })}
      </g>

      {/* Ambient glow */}
      <ellipse className="glow" cx="340" cy="340" rx="90" ry="100" fill="url(#glowGrad)" />

      {/* Diya base — 5 stacked ellipses */}
      <ellipse cx="340" cy="375" rx="38" ry="8" fill="#7A3E00" />
      <ellipse cx="340" cy="370" rx="35" ry="7" fill="#8B4A00" />
      <ellipse cx="340" cy="365" rx="32" ry="7" fill="#9C5500" />
      <ellipse cx="340" cy="360" rx="30" ry="6" fill="#B36200" />
      <ellipse cx="340" cy="355" rx="28" ry="6" fill="#5C3000" />

      {/* Wick */}
      <rect x="338" y="313" width="4" height="28" fill="#C8A060" rx="2" />

      {/* Flame — left flicker */}
      <ellipse className="flame-left" cx="335" cy="300" rx="10" ry="22" fill="#FF6000" opacity="0.5" />

      {/* Flame — right flicker */}
      <ellipse className="flame-right" cx="345" cy="300" rx="9" ry="20" fill="#FF6000" opacity="0.42" />

      {/* Flame — main */}
      <ellipse className="flame-main" cx="340" cy="295" rx="14" ry="30" fill="url(#flameGrad)" />

      {/* Text — SANSKRITI */}
      <text x="340" y="430" textAnchor="middle" fontFamily="Georgia, serif" fontSize="26" fill="#C9A84C" letterSpacing="7" fontWeight="bold">
        SANSKRITI
      </text>

      {/* Text — Devanagari */}
      <text x="340" y="452" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#C9821A">
        संस्कृति
      </text>

      {/* Text — AI with decorations */}
      <g>
        {/* Left decoration */}
        <circle cx="290" cy="472" r="2.5" fill="#C9A84C" />
        <line x1="298" y1="472" x2="318" y2="472" stroke="#C9A84C" strokeWidth="1" opacity="0.5" />
        {/* AI text */}
        <text x="340" y="477" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill="#C9A84C" letterSpacing="3" fontWeight="bold">
          · AI ·
        </text>
        {/* Right decoration */}
        <line x1="362" y1="472" x2="382" y2="472" stroke="#C9A84C" strokeWidth="1" opacity="0.5" />
        <circle cx="390" cy="472" r="2.5" fill="#C9A84C" />
      </g>
    </svg>
  )
}
