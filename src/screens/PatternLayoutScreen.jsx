import { useState, useRef } from 'react'
import { templates } from '../data/templates'
import { mockAnalysis } from '../data/mockAnalysis'

const CANVAS_W   = 280
// SVG source dimensions
const SVG_SRC_W  = 494.56
const SVG_SRC_H  = 890.81
const SVG_SCALE  = CANVAS_W / SVG_SRC_W          // ≈ 0.566
const SVG_PX_H   = Math.round(SVG_SRC_H * SVG_SCALE) // ≈ 504px
const CANVAS_H   = SVG_PX_H + 24                 // 528px (room for labels)

function grainLabel(angle) {
  if (angle === 90) return 'Vertical (Warp)'
  if (angle === 0)  return 'Horizontal (Weft)'
  return `Bias (${angle}°)`
}

function isMisaligned(pieceAngle, garmentAngle) {
  const diff = Math.abs((pieceAngle - garmentAngle + 180) % 180)
  return diff > 15
}

// Garment background using the real shirt SVG (shirt.svg has FRONT+BACK stacked)
// SVG internal layout (at SVG_SCALE ≈ 0.566):
//   FRONT body: y ≈ 75–225px   FRONT label: y ≈ 232px
//   BACK  body: y ≈ 350–490px  BACK  label: y ≈ 508px
const CX          = CANVAS_W / 2
const FRONT_LABEL_Y = Math.round(402 * SVG_SCALE) + 14   // ~241px
const BACK_LABEL_Y  = Math.round(890 * SVG_SCALE) + 14   // ~518px
const FRONT_GRAIN_MID = Math.round(215 * SVG_SCALE)       // ~122px
const BACK_GRAIN_MID  = Math.round(695 * SVG_SCALE)       // ~393px
const GRAIN_LEN = 60

function GarmentBackground({ grainAngleDeg }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={CANVAS_W} height={CANVAS_H}>
      <rect width={CANVAS_W} height={CANVAS_H} fill="#f8f9fb" />
      {/* 40px grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(160,190,220,0.4)" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />

      {/* Real shirt SVG */}
      <image href="/shirt.svg" x="0" y="0" width={CANVAS_W} height={SVG_PX_H} />

      {/* Grain arrows */}
      {grainAngleDeg === 90 && [FRONT_GRAIN_MID, BACK_GRAIN_MID].map((my, i) => (
        <g key={i}>
          <line x1={CX + 22} y1={my - GRAIN_LEN / 2} x2={CX + 22} y2={my + GRAIN_LEN / 2}
            stroke="#999" strokeWidth="1.2" />
          <polygon points={`${CX+22},${my - GRAIN_LEN/2 - 1} ${CX+18},${my - GRAIN_LEN/2 + 9} ${CX+26},${my - GRAIN_LEN/2 + 9}`} fill="#999" />
          <polygon points={`${CX+22},${my + GRAIN_LEN/2 + 1} ${CX+18},${my + GRAIN_LEN/2 - 9} ${CX+26},${my + GRAIN_LEN/2 - 9}`} fill="#999" />
          <text x={CX + 29} y={my + 4} fontSize="9" fill="#bbb" fontFamily="monospace">grain</text>
        </g>
      ))}

      {/* FRONT / BACK labels */}
      {[['FRONT', FRONT_LABEL_Y], ['BACK', BACK_LABEL_Y]].map(([label, ly]) => (
        <g key={label}>
          <text x={CX} y={ly} textAnchor="middle" fontSize="12" fontWeight="700"
            fill="#555" fontFamily="monospace" letterSpacing="2">{label}</text>
          <text x={CX} y={ly + 13} textAnchor="middle" fontSize="8"
            fill="#bbb" fontFamily="monospace">1cm SCALE</text>
        </g>
      ))}
    </svg>
  )
}

function GrainArrow({ angle, pw, ph }) {
  const isVertical = Math.abs((angle % 180) - 90) <= 15
  const len = isVertical ? Math.max(18, ph * 0.45) : Math.max(18, pw * 0.45)

  if (isVertical) {
    return (
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 7, color: '#555', lineHeight: 1 }}>▲</span>
        <div style={{ width: 1, height: len, borderLeft: '1px solid #555' }} />
        <span style={{ fontSize: 7, color: '#555', lineHeight: 1 }}>▼</span>
      </div>
    )
  }
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'row', alignItems: 'center', pointerEvents: 'none' }}>
      <span style={{ fontSize: 7, color: '#555', lineHeight: 1 }}>◀</span>
      <div style={{ height: 1, width: len, borderTop: '1px solid #555' }} />
      <span style={{ fontSize: 7, color: '#555', lineHeight: 1 }}>▶</span>
    </div>
  )
}

function PieceShape({ piece, scale }) {
  const pw = piece.widthCm * scale
  const ph = piece.heightCm * scale
  const seam = Math.min(4, pw * 0.07, ph * 0.07)
  const isCircular = piece.shape === 'circle' || piece.shape === 'ring'
  const innerPct = piece.shape === 'ring'
    ? Math.round((piece.innerRadiusCm / piece.outerRadiusCm) * 100) : 0

  const outerStyle = {
    width: pw, height: ph,
    backgroundColor: '#ffffff',
    border: '1.5px solid #1a1a1a',
    position: 'relative',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    boxSizing: 'border-box',
    boxShadow: '1px 2px 6px rgba(0,0,0,0.12)',
    ...(piece.shape === 'rect'      && { borderRadius: 1 }),
    ...(piece.shape === 'trapezoid' && { clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)', border: 'none' }),
    ...(piece.shape === 'circle'    && { borderRadius: '50%' }),
    ...(piece.shape === 'ring'      && {
      borderRadius: '50%',
      boxShadow: `inset 0 0 0 ${Math.round(pw * (1 - innerPct/100) / 2 - 2)}px #fff, inset 0 0 0 ${Math.round(pw * (1 - innerPct/100) / 2 - 1)}px #1a1a1a, 1px 2px 6px rgba(0,0,0,0.12)`,
    }),
  }

  return (
    <div style={outerStyle}>
      {piece.shape === 'trapezoid' && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={pw} height={ph} viewBox={`0 0 ${pw} ${ph}`}>
          <polygon points={`${pw*0.08},0 ${pw*0.92},0 ${pw},${ph} 0,${ph}`} fill="white" stroke="#1a1a1a" strokeWidth="1.5" />
          <polygon points={`${pw*0.08+seam},${seam} ${pw*0.92-seam},${seam} ${pw-seam},${ph-seam} ${seam},${ph-seam}`}
            fill="none" stroke="#999" strokeWidth="0.7" strokeDasharray="3,2" />
        </svg>
      )}
      {piece.shape !== 'trapezoid' && !isCircular && (
        <div style={{ position: 'absolute', inset: seam, border: '0.7px dashed #aaa', borderRadius: 1, pointerEvents: 'none' }} />
      )}
      <GrainArrow angle={piece.grainAngleDeg} pw={pw} ph={ph} />
      <div style={{ position: 'absolute', bottom: seam + 1, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 7, color: '#222', fontWeight: 700, lineHeight: 1.3, fontFamily: 'monospace' }}>{piece.label}</div>
        <div style={{ fontSize: 6, color: '#777', lineHeight: 1.2, fontFamily: 'monospace' }}>{piece.widthCm}×{piece.heightCm}cm</div>
      </div>
    </div>
  )
}

export default function PatternLayoutScreen({ navigate, template: templateId }) {
  const template = templates[templateId]
  const { garmentLayout } = mockAnalysis
  const { grainAngleDeg } = garmentLayout

  const scale = Math.min(
    CANVAS_W / garmentLayout.widthCm,
    CANVAS_H / garmentLayout.heightCm,
  )

  const [positions, setPositions] = useState(() =>
    Object.fromEntries(
      template.patternPieces.map(p => [
        p.id,
        { x: (p.defaultX / 100) * CANVAS_W, y: (p.defaultY / 100) * CANVAS_H },
      ])
    )
  )
  const [dragging, setDragging] = useState(null)
  const [showAiBadge, setShowAiBadge] = useState(true)
  const canvasRef = useRef()

  function getPointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { px: e.clientX - rect.left, py: e.clientY - rect.top }
  }

  function handlePointerDown(e) {
    const { px, py } = getPointerPos(e)
    for (const piece of [...template.patternPieces].reverse()) {
      const pos = positions[piece.id]
      const pw = piece.widthCm * scale
      const ph = piece.heightCm * scale
      if (px >= pos.x && px <= pos.x + pw && py >= pos.y && py <= pos.y + ph) {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging({ id: piece.id, startPointerX: px, startPointerY: py, startPieceX: pos.x, startPieceY: pos.y })
        break
      }
    }
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const { px, py } = getPointerPos(e)
    const dx = px - dragging.startPointerX
    const dy = py - dragging.startPointerY
    const piece = template.patternPieces.find(p => p.id === dragging.id)
    const pw = piece.widthCm * scale
    const ph = piece.heightCm * scale
    const newX = Math.max(0, Math.min(CANVAS_W - pw, dragging.startPieceX + dx))
    const newY = Math.max(0, Math.min(CANVAS_H - ph, dragging.startPieceY + dy))
    setPositions(prev => ({ ...prev, [dragging.id]: { x: newX, y: newY } }))
  }

  function handlePointerUp() {
    if (dragging && showAiBadge) setShowAiBadge(false)
    setDragging(null)
  }

  return (
    <div className="h-full flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <div className="flex items-center px-5 pt-8 pb-3">
        <button
          onClick={() => navigate('templateSelect')}
          className="w-9 h-9 bg-white rounded-full border border-stone-200 flex items-center justify-center text-zinc-600 shadow-sm mr-3"
        >
          ←
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-zinc-800">Pattern Layout</h2>
          <p className="text-zinc-400 text-xs mt-0.5">Drag pieces onto the garment</p>
        </div>
      </div>

      {/* Garment info strip */}
      <div className="mx-5 mb-3 flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-100">
        <span className="text-[11px] text-zinc-500">
          Each panel: <span className="font-semibold text-zinc-700">{garmentLayout.widthCm} × {garmentLayout.heightCm} cm</span>
        </span>
        <span className="mx-1 text-stone-300">·</span>
        <span className="text-[11px] text-zinc-500">
          Grain: <span className="font-semibold text-zinc-700">{grainLabel(grainAngleDeg)}</span>
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* Canvas */}
        <div className="flex justify-center px-2.5 mb-4">
          <div
            ref={canvasRef}
            style={{
              position: 'relative',
              width: CANVAS_W,
              height: CANVAS_H,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #d1d9e0',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* T-shirt silhouettes SVG background */}
            <GarmentBackground grainAngleDeg={grainAngleDeg} />

            {/* Draggable pattern pieces */}
            {template.patternPieces.map(piece => {
              const pos = positions[piece.id]
              const misaligned = isMisaligned(piece.grainAngleDeg, grainAngleDeg)
              return (
                <div
                  key={piece.id}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    cursor: dragging?.id === piece.id ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    zIndex: dragging?.id === piece.id ? 10 : 5,
                  }}
                >
                  <PieceShape piece={piece} scale={scale} />
                  {misaligned && (
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 14, height: 14, borderRadius: '50%',
                      backgroundColor: '#f97316',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, color: 'white', fontWeight: 700,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      pointerEvents: 'none',
                    }}>!</div>
                  )}
                </div>
              )
            })}

            {/* AI Badge */}
            {showAiBadge && (
              <div style={{
                position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, pointerEvents: 'none',
                backgroundColor: 'rgba(21,128,61,0.88)',
                color: 'white', fontSize: 11, fontWeight: 600,
                padding: '4px 12px', borderRadius: 20,
                whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                ✨ AI Suggested Layout — drag to adjust
              </div>
            )}
          </div>
        </div>

        {/* Warning note */}
        {template.patternPieces.some(p => isMisaligned(p.grainAngleDeg, grainAngleDeg)) && (
          <div className="mx-5 mb-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-start gap-2">
            <span className="text-orange-400 text-sm mt-0.5">⚠</span>
            <p className="text-[11px] text-orange-700 leading-4">
              Pieces marked <span className="font-bold">!</span> have a different grain direction — intentional for the design.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mx-5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Pattern Pieces</p>
          <div className="grid grid-cols-2 gap-1.5">
            {template.patternPieces.map(piece => (
              <div key={piece.id} className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-1.5 border border-stone-100">
                <div style={{
                  width: 10, height: 10,
                  borderRadius: piece.shape === 'circle' || piece.shape === 'ring' ? '50%' : 1,
                  backgroundColor: '#fff', border: '1.5px solid #1a1a1a', flexShrink: 0,
                }} />
                <span className="text-[11px] text-zinc-600 truncate font-mono">{piece.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-2 border-t border-stone-100 bg-[#f5f4f0] space-y-2">
        <button
          onClick={() => navigate('arPattern')}
          className="w-full bg-white border border-green-600 text-green-700 py-3 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span>📷</span> Try on Garment (AR View)
        </button>
        <button
          onClick={() => navigate('stepGuide')}
          className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform shadow-md shadow-green-700/20"
        >
          Confirm Layout →
        </button>
      </div>
    </div>
  )
}
