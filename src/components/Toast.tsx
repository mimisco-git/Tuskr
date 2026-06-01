import { useState, useCallback, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import s from './Toast.module.css'

type ToastType = 'success' | 'error' | 'info' | 'loading'

interface Toast {
  id: string
  type: ToastType
  message: string
  txDigest?: string
}

interface ToastCtx {
  toast: (msg: string, type?: ToastType, txDigest?: string) => void
  success: (msg: string, txDigest?: string) => void
  error:   (msg: string) => void
  info:    (msg: string) => void
}

const ToastContext = createContext<ToastCtx>({
  toast:   () => {},
  success: () => {},
  error:   () => {},
  info:    () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', txDigest?: string) => {
    const id = Date.now().toString()
    setToasts(p => [{ id, type, message, txDigest }, ...p].slice(0, 5))
    if (type !== 'loading') setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const ctx: ToastCtx = {
    toast,
    success: (msg, tx) => toast(msg, 'success', tx),
    error:   (msg)     => toast(msg, 'error'),
    info:    (msg)     => toast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className={s.container}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`${s.toast} ${s[t.type]}`}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2 }}
            >
              <span className={s.icon}>
                {t.type === 'success' && '✓'}
                {t.type === 'error'   && '✗'}
                {t.type === 'info'    && 'i'}
                {t.type === 'loading' && '⟳'}
              </span>
              <div className={s.body}>
                <p className={s.msg}>{t.message}</p>
                {t.txDigest && (
                  <a
                    href={`https://suiexplorer.com/txblock/${t.txDigest}?network=testnet`}
                    target="_blank" rel="noreferrer"
                    className={s.link}
                  >
                    View on Explorer ↗
                  </a>
                )}
              </div>
              <button className={s.close} onClick={() => dismiss(t.id)}>✕</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
