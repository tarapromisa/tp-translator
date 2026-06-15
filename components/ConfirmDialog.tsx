'use client'

/**
 * components/ConfirmDialog.tsx
 *
 * Dialog de confirmare — înlocuiește confirm() pentru acțiuni distructive
 * (ex: ștergerea unei sarcini).
 *
 * Utilizare:
 *
 *   const [confirmOpen, setConfirmOpen] = useState(false)
 *
 *   <ConfirmDialog
 *     open={confirmOpen}
 *     title="Șterge sarcina"
 *     message="Sigur vrei să ștergi această sarcină? Acțiunea nu poate fi anulată."
 *     confirmLabel="Șterge"
 *     onConfirm={() => { handleDelete(); setConfirmOpen(false) }}
 *     onCancel={() => setConfirmOpen(false)}
 *   />
 */

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmă', cancelLabel = 'Anulează',
  destructive = true,
  onConfirm, onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-[380px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] p-5">
        <h3 className="text-base font-semibold text-[#111] mb-2">{title}</h3>
        <p className="text-sm text-[#666] leading-relaxed mb-5">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-[#e8e2de] text-sm font-semibold text-[#666] hover:bg-[#f9f7f5] transition-all">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
              destructive
                ? 'bg-[#ce0100] text-white shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000]'
                : 'bg-[#111] text-white hover:bg-[#333]'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
