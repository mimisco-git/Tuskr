/**
 * TuskrMascot.tsx
 * High-quality SVG mascot, back view, premium 3D render quality.
 *
 * Lighting model:
 *   - Key light: top-center (cool white)
 *   - Fill light: left-above (soft blue)
 *   - Rim light: behind bottom (strong teal/cyan glow, the signature look)
 *   - Ambient occlusion: dark crevices at helmet-body join
 *   - Specular: small bright hotspot top-center of body
 *
 * Built with layered radial gradients, SVG filters (blur, composite),
 * and careful z-ordering to simulate depth.
 */

interface Props {
  className?: string
  style?: React.CSSProperties
  size?: number
}

export default function TuskrMascot({ className = '', style, size = 600 }: Props) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      viewBox="0 0 600 660"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tuskr mascot"
    >
      <defs>
        {/* ── Body gradients, 3-layer lighting simulation ── */}

        {/* Base body color: saturated teal in lit areas */}
        <radialGradient id="bodyBase" cx="42%" cy="34%" r="62%">
          <stop offset="0%"   stopColor="#00e8d8"/>
          <stop offset="22%"  stopColor="#00c4b4"/>
          <stop offset="50%"  stopColor="#009090"/>
          <stop offset="76%"  stopColor="#005a5a"/>
          <stop offset="100%" stopColor="#002828"/>
        </radialGradient>

        {/* Rim light, strong teal glow at bottom-left edge (backlit) */}
        <radialGradient id="rimLight" cx="18%" cy="88%" r="55%">
          <stop offset="0%"   stopColor="rgba(0,230,210,0.72)"/>
          <stop offset="28%"  stopColor="rgba(0,200,180,0.38)"/>
          <stop offset="60%"  stopColor="rgba(0,160,140,0.12)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Rim light right, slightly less intense */}
        <radialGradient id="rimLightR" cx="82%" cy="82%" r="45%">
          <stop offset="0%"   stopColor="rgba(0,200,180,0.55)"/>
          <stop offset="40%"  stopColor="rgba(0,160,140,0.2)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Key light specular, top center highlight */}
        <radialGradient id="specBody" cx="50%" cy="22%" r="35%">
          <stop offset="0%"   stopColor="rgba(180,255,248,0.28)"/>
          <stop offset="50%"  stopColor="rgba(100,240,220,0.08)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Right shadow, opposite key light */}
        <radialGradient id="shadowR" cx="88%" cy="42%" r="48%">
          <stop offset="0%"   stopColor="rgba(0,10,10,0.65)"/>
          <stop offset="55%"  stopColor="rgba(0,10,10,0.28)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Bottom darkness */}
        <linearGradient id="bodyBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="transparent"/>
          <stop offset="65%" stopColor="rgba(0,8,8,0.35)"/>
          <stop offset="100%" stopColor="rgba(0,4,4,0.72)"/>
        </linearGradient>

        {/* AO, ambient occlusion at helmet-body join */}
        <radialGradient id="aoJoin" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgba(0,0,0,0.7)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* ── Helmet gradients ── */}
        <radialGradient id="helmetBase" cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#1e2352"/>
          <stop offset="35%"  stopColor="#111535"/>
          <stop offset="70%"  stopColor="#080a1e"/>
          <stop offset="100%" stopColor="#04060f"/>
        </radialGradient>

        {/* Helmet specular, subtle blue-white highlight */}
        <radialGradient id="helmetSpec" cx="34%" cy="24%" r="40%">
          <stop offset="0%"  stopColor="rgba(120,140,255,0.22)"/>
          <stop offset="60%"  stopColor="rgba(80,100,200,0.06)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Helmet rim, teal glow catching backlight */}
        <radialGradient id="helmetRim" cx="50%" cy="90%" r="55%">
          <stop offset="0%"  stopColor="rgba(0,200,180,0.35)"/>
          <stop offset="50%"  stopColor="rgba(0,160,140,0.1)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* Knit dome */}
        <radialGradient id="knitDome" cx="42%" cy="35%" r="62%">
          <stop offset="0%"   stopColor="#282c6a"/>
          <stop offset="50%"  stopColor="#181c50"/>
          <stop offset="100%" stopColor="#0c1030"/>
        </radialGradient>

        {/* ── Visor ── */}
        <linearGradient id="visor" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#7020d0"/>
          <stop offset="15%"  stopColor="#4048f0"/>
          <stop offset="35%"  stopColor="#c07818"/>
          <stop offset="52%"  stopColor="#e04820"/>
          <stop offset="68%"  stopColor="#2098f8"/>
          <stop offset="84%"  stopColor="#10c890"/>
          <stop offset="100%" stopColor="#40e890"/>
        </linearGradient>

        <linearGradient id="visorGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.45)"/>
          <stop offset="55%"  stopColor="rgba(255,255,255,0.08)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>

        {/* Visor glow beneath */}
        <radialGradient id="visorGlow" cx="50%" cy="0%" r="80%">
          <stop offset="0%"  stopColor="rgba(120,100,255,0.22)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* ── Tusks ── */}
        <linearGradient id="tusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ddeaee"/>
          <stop offset="40%"  stopColor="#b8ccd4"/>
          <stop offset="100%" stopColor="#90a8b4"/>
        </linearGradient>

        {/* ── Floor ── */}
        <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgba(0,200,185,0.22)"/>
          <stop offset="55%"  stopColor="rgba(0,150,135,0.08)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="rgba(0,0,0,0.6)"/>
          <stop offset="70%"  stopColor="rgba(0,0,0,0.25)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>

        {/* ── Filters ── */}
        {/* Soft bloom for rim light */}
        <filter id="bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {/* Soft shadow/AO blur */}
        <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>

        {/* Whisker blur */}
        <filter id="whiskerBlur">
          <feGaussianBlur stdDeviation="0.4"/>
        </filter>

        {/* Visor glow */}
        <filter id="visorBloom" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ══ FLOOR ══ */}
      <ellipse cx="300" cy="642" rx="185" ry="20" fill="url(#floorShadow)"/>
      <ellipse cx="300" cy="638" rx="210" ry="24" fill="url(#floorGlow)"/>

      {/* ══ BODY ══ */}

      {/* 1. Rim light glow, rendered BEHIND body for bloom effect */}
      <ellipse cx="300" cy="410" rx="195" ry="200"
        fill="none"
        stroke="rgba(0,220,200,0.18)"
        strokeWidth="32"
        filter="url(#bloom)"
      />

      {/* 2. Base body shape */}
      <ellipse cx="300" cy="410" rx="192" ry="196" fill="url(#bodyBase)"/>

      {/* 3. Rim light left, strong teal at back-left edge */}
      <ellipse cx="300" cy="410" rx="192" ry="196" fill="url(#rimLight)"/>

      {/* 4. Rim light right */}
      <ellipse cx="300" cy="410" rx="192" ry="196" fill="url(#rimLightR)"/>

      {/* 5. Key light specular */}
      <ellipse cx="300" cy="410" rx="192" ry="196" fill="url(#specBody)"/>

      {/* 6. Shadow right, opposite key light */}
      <ellipse cx="300" cy="410" rx="192" ry="196" fill="url(#shadowR)"/>

      {/* 7. Bottom fade */}
      <ellipse cx="300" cy="410" rx="192" ry="196" fill="url(#bodyBottom)"/>

      {/* 8. Butt crease, center vertical AO line */}
      <path
        d="M 298 228 Q 299 320 300 410 Q 300 480 300 570"
        stroke="rgba(0,20,20,0.45)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#softBlur)"
      />

      {/* 9. Left cheek subtle highlight */}
      <ellipse
        cx="238" cy="390"
        rx="88" ry="100"
        fill="rgba(0,220,205,0.07)"
        transform="rotate(-8,238,390)"
      />

      {/* ══ AO, helmet meeting body ══ */}
      <ellipse cx="300" cy="248" rx="148" ry="38"
        fill="rgba(0,0,0,0.45)"
        filter="url(#softBlur)"
      />

      {/* ══ HELMET ══ */}

      {/* Ear pieces */}
      <ellipse cx="118" cy="210" rx="44" ry="54" fill="url(#helmetBase)"/>
      <ellipse cx="482" cy="210" rx="44" ry="54" fill="url(#helmetBase)"/>
      {/* Ear specular */}
      <ellipse cx="108" cy="196" rx="16" ry="20" fill="rgba(100,120,220,0.12)"/>
      <ellipse cx="472" cy="196" rx="16" ry="20" fill="rgba(100,120,220,0.12)"/>
      {/* Ear rim glow */}
      <ellipse cx="118" cy="222" rx="32" ry="40"
        fill="rgba(0,170,155,0.12)"
        filter="url(#softBlur)"
      />
      <ellipse cx="482" cy="222" rx="32" ry="40"
        fill="rgba(0,170,155,0.12)"
        filter="url(#softBlur)"
      />

      {/* Main dome */}
      <ellipse cx="300" cy="178" rx="152" ry="136" fill="url(#helmetBase)"/>
      <ellipse cx="300" cy="178" rx="152" ry="136" fill="url(#helmetSpec)"/>
      <ellipse cx="300" cy="178" rx="152" ry="136" fill="url(#helmetRim)"/>

      {/* Knit texture dome */}
      <ellipse cx="300" cy="110" rx="120" ry="92" fill="url(#knitDome)"/>

      {/* Knit rows, subtle horizontal lines */}
      {[44,55,64,73,82,91,100,109,118,127,136,145,154].map((y, i) => {
        const hw = Math.sqrt(Math.max(0, 120 * 120 - (y - 110) * (y - 110))) * 0.96
        return hw > 6 ? (
          <line
            key={i}
            x1={300 - hw} y1={y}
            x2={300 + hw} y2={y}
            stroke="rgba(255,255,255,0.055)"
            strokeWidth="1.6"
          />
        ) : null
      })}

      {/* Helmet top button */}
      <circle cx="300" cy="30" r="13" fill="#181c45"/>
      <circle cx="300" cy="30" r="9"  fill="#0c1030"/>
      <circle cx="296" cy="27" r="3"  fill="rgba(150,160,255,0.25)"/>

      {/* Helmet band / strap base */}
      <path
        d="M 120 228 Q 300 250 480 228"
        stroke="#080c20"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />

      {/* ══ VISOR ══ */}
      {/* Glow behind visor */}
      <path
        d="M 126 204 Q 300 230 474 204 Q 480 216 476 232 Q 300 258 124 232 Z"
        fill="url(#visorGlow)"
        filter="url(#visorBloom)"
        opacity="0.7"
      />

      {/* Visor main body */}
      <path
        d="M 126 204 Q 300 228 474 204 Q 480 215 476 230 Q 300 255 124 230 Z"
        fill="url(#visor)"
      />

      {/* Visor gloss reflection, top half */}
      <path
        d="M 132 205 Q 300 226 468 205 Q 474 212 470 219 Q 300 238 130 219 Z"
        fill="url(#visorGloss)"
        opacity="0.7"
      />

      {/* Visor sharp top edge */}
      <path
        d="M 124 204 Q 300 228 476 204"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="2"
        fill="none"
      />
      {/* Visor bottom edge */}
      <path
        d="M 124 230 Q 300 255 476 230"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* ══ WHISKERS ══ */}
      {/* Left, 4 whiskers spreading outward */}
      {[
        { x1:120, y1:355, x2:0,   y2:338, w:2.8, o:0.72 },
        { x1:118, y1:370, x2:-4,  y2:365, w:2.2, o:0.55 },
        { x1:120, y1:385, x2:2,   y2:384, w:1.8, o:0.40 },
        { x1:124, y1:400, x2:10,  y2:404, w:1.4, o:0.28 },
      ].map((wh, i) => (
        <line key={`wl${i}`}
          x1={wh.x1} y1={wh.y1} x2={wh.x2} y2={wh.y2}
          stroke={`rgba(200,240,238,${wh.o})`}
          strokeWidth={wh.w}
          strokeLinecap="round"
          filter="url(#whiskerBlur)"
        />
      ))}

      {/* Right whiskers */}
      {[
        { x1:480, y1:355, x2:600, y2:338, w:2.8, o:0.72 },
        { x1:482, y1:370, x2:604, y2:365, w:2.2, o:0.55 },
        { x1:480, y1:385, x2:598, y2:384, w:1.8, o:0.40 },
        { x1:476, y1:400, x2:590, y2:404, w:1.4, o:0.28 },
      ].map((wh, i) => (
        <line key={`wr${i}`}
          x1={wh.x1} y1={wh.y1} x2={wh.x2} y2={wh.y2}
          stroke={`rgba(200,240,238,${wh.o})`}
          strokeWidth={wh.w}
          strokeLinecap="round"
          filter="url(#whiskerBlur)"
        />
      ))}

      {/* ══ TUSKS ══ */}
      {/* Left tusk */}
      <path d="M 250 560 Q 240 592 234 616 Q 230 632 238 636 Q 248 640 253 625 Q 260 600 265 572 Z"
        fill="url(#tusk)"/>
      <path d="M 252 565 Q 244 590 238 614"
        stroke="rgba(255,255,255,0.38)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left tusk shadow side */}
      <path d="M 263 568 Q 256 592 252 616 Q 250 628 255 634"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right tusk */}
      <path d="M 350 560 Q 360 592 366 616 Q 370 632 362 636 Q 352 640 347 625 Q 340 600 335 572 Z"
        fill="url(#tusk)"/>
      <path d="M 348 565 Q 356 590 362 614"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right tusk shadow */}
      <path d="M 337 568 Q 344 592 348 616 Q 350 628 345 634"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* ══ RIM LIGHT EDGE HIGHLIGHT, the signature 3D detail ══ */}
      {/* Left body rim, bright teal line at the back-lit edge */}
      <path
        d="M 165 260 Q 110 340 112 430 Q 112 500 148 555"
        stroke="rgba(0,220,205,0.55)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        filter="url(#bloom)"
      />
      {/* Right body rim */}
      <path
        d="M 435 260 Q 490 340 488 430 Q 488 500 452 555"
        stroke="rgba(0,200,185,0.38)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        filter="url(#bloom)"
      />

      {/* ══ OVERALL LENS SHEEN, adds the 3D depth illusion ══ */}
      {/* Subtle catch-light on body */}
      <ellipse cx="252" cy="308" rx="44" ry="60"
        fill="rgba(0,230,215,0.05)"
        transform="rotate(-14,252,308)"
      />
    </svg>
  )
}
