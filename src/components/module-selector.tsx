import { useState, useEffect, useRef } from 'react'
import { Star, Search, ChevronDown, X } from 'lucide-react'
import { SAP_MODULES } from '@/lib/sap-modules'

const NAVY = '#162B6E'

interface ModuleSelectorProps {
  mainModule: string
  otherModules: string[]
  onMainChange: (m: string) => void
  onOthersChange: (ms: string[]) => void
}

export function ModuleSelector({
  mainModule,
  otherModules,
  onMainChange,
  onOthersChange,
}: ModuleSelectorProps) {
  const [open, setOpen]               = useState(false)
  const [search, setSearch]           = useState('')
  const [autreMainLabel, setAutreMainLabel] = useState(
    SAP_MODULES.includes(mainModule) ? '' : (mainModule ?? '')
  )
  const [autreOtherLabel, setAutreOtherLabel] = useState('')
  const [showAutreOtherInput, setShowAutreOtherInput] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isAutreMain     = !!mainModule && !SAP_MODULES.includes(mainModule)
  const autreOtherEntry = otherModules.find(m => !SAP_MODULES.includes(m))
  const isAutreOther    = !!autreOtherEntry
  const autreInputVisible = showAutreOtherInput || isAutreOther

  const filtered = SAP_MODULES.filter(m =>
    m.toLowerCase().includes(search.toLowerCase())
  )

  // click-outside closes panel; reset "autre" input state if nothing was typed
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!isAutreOther) {
          setShowAutreOtherInput(false)
          setAutreOtherLabel('')
        }
      }
    }
    if (open) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, isAutreOther])

  function setMain(m: string) {
    onMainChange(m)
    if (otherModules.includes(m)) onOthersChange(otherModules.filter(x => x !== m))
  }

  function toggleOther(m: string) {
    if (m === mainModule) return
    onOthersChange(
      otherModules.includes(m)
        ? otherModules.filter(x => x !== m)
        : [...otherModules, m]
    )
  }

  function setAutreAsMain() {
    const val = autreMainLabel.trim().toUpperCase() || 'AUTRE'
    onMainChange(val)
    if (otherModules.includes(val)) onOthersChange(otherModules.filter(x => x !== val))
  }

  function clickAutreOther() {
    if (isAutreOther || showAutreOtherInput) {
      // Remove the custom module and hide/clear the input
      onOthersChange(otherModules.filter(m => SAP_MODULES.includes(m)))
      setAutreOtherLabel('')
      setShowAutreOtherInput(false)
    } else {
      // Show empty input — don't add anything yet, wait for user to type
      setAutreOtherLabel('')
      setShowAutreOtherInput(true)
    }
  }

  function handleAutreOtherType(val: string) {
    setAutreOtherLabel(val)
    const trimmed = val.trim().toUpperCase()
    if (trimmed) {
      onOthersChange([...otherModules.filter(m => SAP_MODULES.includes(m)), trimmed])
    } else {
      // If user cleared the input, remove from list but keep input visible
      onOthersChange(otherModules.filter(m => SAP_MODULES.includes(m)))
    }
  }

  const totalSelected = (mainModule ? 1 : 0) + otherModules.length

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>

      {/* ── Trigger button ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
          border: `1.5px solid ${open ? NAVY : '#e5e7eb'}`,
          background: '#fff', fontSize: 13, color: totalSelected > 0 ? '#111827' : '#9ca3af',
          transition: 'border-color .15s',
          boxSizing: 'border-box',
        }}
      >
        <span>
          {totalSelected === 0
            ? 'Sélectionner les modules…'
            : `${totalSelected} module${totalSelected > 1 ? 's' : ''} sélectionné${totalSelected > 1 ? 's' : ''}`}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: '#9ca3af', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s',
          }}
        />
      </button>

      {/* ── Selected badges (always visible) ─────────────────── */}
      {totalSelected > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
          {mainModule && (
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
              background: NAVY, color: '#fff',
              padding: '3px 10px', borderRadius: 100,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Star size={9} fill="#fff" />
              {mainModule}
            </span>
          )}
          {otherModules.map(m => (
            <span key={m} style={{
              fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
              background: '#EEF3FB', color: NAVY,
              border: `1px solid ${NAVY}30`,
              padding: '3px 10px', borderRadius: 100,
            }}>
              {m}
            </span>
          ))}
        </div>
      )}

      {/* ── Dropdown panel ───────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          zIndex: 200, background: '#fff',
          border: `1.5px solid ${NAVY}30`,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,51,160,.13), 0 2px 8px rgba(0,0,0,.06)',
          overflow: 'hidden',
        }}>

          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un module…"
                autoFocus
                style={{
                  width: '100%', padding: '7px 10px 7px 30px', fontSize: 12,
                  border: '1px solid #e5e7eb', borderRadius: 7, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>

            {/* ── Section: Module principal ───────────────────── */}
            <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Star size={10} fill={NAVY} color={NAVY} />
              Module principal <span style={{ color: '#ef4444' }}>*</span>
            </div>

            {filtered.map(m => {
              const isMain = m === mainModule
              return (
                <div
                  key={'main-' + m}
                  onClick={() => setMain(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', cursor: 'pointer',
                    background: isMain ? NAVY : 'transparent',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (!isMain) (e.currentTarget as HTMLElement).style.background = '#f5f7ff' }}
                  onMouseLeave={e => { if (!isMain) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Star size={12} fill={isMain ? '#fff' : 'none'} color={isMain ? '#fff' : '#d1d5db'} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isMain ? 700 : 500, fontFamily: 'monospace', color: isMain ? '#fff' : '#374151' }}>
                    {m}
                  </span>
                  {isMain && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>Principal</span>}
                </div>
              )
            })}

            {/* Autre — main */}
            <div style={{ borderTop: '1px dashed #e5e7eb', margin: '2px 0' }}>
              <div
                onClick={setAutreAsMain}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', cursor: 'pointer',
                  background: isAutreMain ? NAVY : 'transparent',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isAutreMain) (e.currentTarget as HTMLElement).style.background = '#f5f7ff' }}
                onMouseLeave={e => { if (!isAutreMain) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Star size={12} fill={isAutreMain ? '#fff' : 'none'} color={isAutreMain ? '#fff' : '#d1d5db'} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: isAutreMain ? '#fff' : '#6b7280', fontStyle: 'italic' }}>Autre…</span>
                {isAutreMain && (
                  <input
                    value={autreMainLabel}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      setAutreMainLabel(e.target.value)
                      onMainChange(e.target.value.trim().toUpperCase() || 'AUTRE')
                    }}
                    placeholder="Nom du module…"
                    autoFocus
                    style={{
                      flex: 1, fontSize: 12, border: '1px solid rgba(255,255,255,.4)',
                      borderRadius: 6, padding: '3px 8px', outline: 'none',
                      background: 'rgba(255,255,255,.15)', color: '#fff',
                      fontFamily: 'monospace',
                    }}
                  />
                )}
              </div>
            </div>

            {/* ── Section: Modules additionnels ───────────────── */}
            <div style={{ padding: '10px 12px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6b7280', borderTop: '2px solid #f3f4f6', marginTop: 4 }}>
              Modules additionnels
            </div>

            {filtered.map(m => {
              const isMain  = m === mainModule
              const isOther = otherModules.includes(m)
              return (
                <div
                  key={'other-' + m}
                  onClick={() => !isMain && toggleOther(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px',
                    cursor: isMain ? 'default' : 'pointer',
                    background: isOther && !isMain ? '#EEF3FB' : 'transparent',
                    opacity: isMain ? 0.35 : 1,
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (!isMain) (e.currentTarget as HTMLElement).style.background = '#f5f7ff' }}
                  onMouseLeave={e => { if (!isMain) (e.currentTarget as HTMLElement).style.background = isOther && !isMain ? '#EEF3FB' : 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={isOther || isMain}
                    disabled={isMain}
                    readOnly
                    style={{ width: 14, height: 14, accentColor: NAVY, cursor: isMain ? 'default' : 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isOther ? 600 : 400, fontFamily: 'monospace', color: '#374151' }}>
                    {m}
                  </span>
                </div>
              )
            })}

            {/* Autre — other */}
            <div style={{ borderTop: '1px dashed #e5e7eb', margin: '2px 0' }}>
              <div
                onClick={clickAutreOther}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', cursor: 'pointer',
                  background: autreInputVisible ? '#EEF3FB' : 'transparent',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!autreInputVisible) (e.currentTarget as HTMLElement).style.background = '#f5f7ff' }}
                onMouseLeave={e => { if (!autreInputVisible) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <input
                  type="checkbox"
                  checked={autreInputVisible}
                  readOnly
                  style={{ width: 14, height: 14, accentColor: NAVY, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', fontStyle: 'italic' }}>Autre…</span>
              </div>
              {autreInputVisible && (
                <div style={{ padding: '4px 12px 8px 34px' }}>
                  <input
                    value={autreOtherLabel}
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleAutreOtherType(e.target.value)}
                    placeholder="Saisir le nom du module…"
                    autoFocus
                    style={{
                      fontSize: 12, border: `1.5px solid ${NAVY}50`,
                      borderRadius: 6, padding: '5px 10px', outline: 'none',
                      fontFamily: 'monospace', width: '100%', boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Footer: close button ─────────────────────────── */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
                background: NAVY, color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 600,
              }}
            >
              <X size={12} /> Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
