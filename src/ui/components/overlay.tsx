import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ───────────── Hoja inferior ─────────────

export function Sheet({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; labelledBy?: string }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? id} ref={ref} tabIndex={-1}>
        <div className="grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={id} className="grow" style={{ fontSize: '1.15rem' }}>{title}</h2>
          <button className="icon-btn soft" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ───────────── Diálogo de confirmación ─────────────

interface ConfirmOpts {
  title: string
  body?: ReactNode
  confirm?: string
  cancel?: string
  danger?: boolean
  /** Botones extra (devuelven su valor). */
  extra?: { label: string; value: string; primary?: boolean }[]
}
type ConfirmFn = (o: ConfirmOpts) => Promise<string | boolean>

const ConfirmCtx = createContext<ConfirmFn>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

interface ToastItem {
  id: number
  text: string
  action?: { label: string; run: () => void }
}
const ToastCtx = createContext<(text: string, action?: ToastItem['action'], ms?: number) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: string | boolean) => void }) | null>(null)
  const [toast, setToast] = useState<ToastItem | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => setDlg({ ...o, resolve })), [])
  const show = useCallback((text: string, action?: ToastItem['action'], ms = 6000) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, action })
    timer.current = window.setTimeout(() => setToast(null), ms)
  }, [])
  const close = (v: string | boolean) => {
    dlg?.resolve(v)
    setDlg(null)
  }
  const overWorkout = typeof window !== 'undefined' && window.location.hash.startsWith('#/entreno')
  return (
    <ConfirmCtx.Provider value={confirm}>
      <ToastCtx.Provider value={show}>
        {children}
        {dlg &&
          createPortal(
            <div className="scrim dialog-wrap" onClick={(e) => e.target === e.currentTarget && close(false)}>
              <div className="dialog stack" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
                <h2 id="dlg-title">{dlg.title}</h2>
                {dlg.body && <div className="muted">{dlg.body}</div>}
                <div className="stack-sm" style={{ marginTop: 8 }}>
                  {dlg.extra?.map((x) => (
                    <button key={x.value} className={`btn block ${x.primary ? 'primary' : ''}`} onClick={() => close(x.value)}>
                      {x.label}
                    </button>
                  ))}
                  <button autoFocus className={`btn block ${dlg.danger ? 'danger solid' : dlg.extra?.some((x) => x.primary) ? '' : 'primary'}`} onClick={() => close(true)}>
                    {dlg.confirm ?? 'Aceptar'}
                  </button>
                  <button className="btn block ghost" onClick={() => close(false)}>
                    {dlg.cancel ?? 'Cancelar'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
        {toast &&
          createPortal(
            <div className={`toast-zone ${overWorkout ? 'over' : ''}`} aria-live="polite">
              <div className="toast" role="status" key={toast.id}>
                <span className="grow">{toast.text}</span>
                {toast.action && (
                  <button
                    className="btn small"
                    onClick={() => {
                      toast.action?.run()
                      setToast(null)
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )}
      </ToastCtx.Provider>
    </ConfirmCtx.Provider>
  )
}
