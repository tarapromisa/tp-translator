import Sidebar from '@/components/Sidebar'

// Círculo de carga en rojo TP Translator
export function Spinner({ label = 'Se încarcă...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-[4px] border-[#f4dede] border-t-[#ce0100] animate-spin" />
      <p className="text-[13px] text-[#9c8e87] font-light">{label}</p>
    </div>
  )
}

// Pantalla completa con sidebar (para loading.tsx y estados de carga de las páginas de detalle)
export default function LoadingScreen({ label }: { label?: string }) {
  return (
    <main className="flex min-h-dvh bg-[#fcfbfa]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <Spinner label={label} />
      </div>
    </main>
  )
}
