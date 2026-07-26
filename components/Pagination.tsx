'use client'

/**
 * components/Pagination.tsx
 * Componentă reutilizabilă de paginare — "Pagina 1 din 5"
 * Design premium, consistent cu stilul aplicației.
 *
 * Utilizare în orice pagină cu listă:
 *
 *   const [page, setPage] = useState(1)
 *   const PER_PAGE = 20
 *   const totalPages = Math.ceil(filtered.length / PER_PAGE)
 *   const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
 *
 *   // Reset la page 1 când se schimbă filtrele:
 *   useEffect(() => { setPage(1) }, [search, statusFilter, ...])
 *
 *   // La finalul listei:
 *   <Pagination
 *     currentPage={page}
 *     totalPages={totalPages}
 *     totalItems={filtered.length}
 *     itemsPerPage={PER_PAGE}
 *     onPageChange={setPage}
 *     label="versete"
 *   />
 */

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

type Props = {
  currentPage: number        // 1-indexed
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  label?: string             // ex: "versete", "citate", "utilizatori"
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  label = 'înregistrări',
}: Props) {
  if (totalPages <= 1) return null

  // Build page numbers: always show first, last, current ±1, with ellipsis
  const pages: (number | 'ellipsis')[] = []

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis')
    }
  }

  const start = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null
  const end = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mt-4 px-1">
      {/* Left: count info */}
      <p className="text-sm text-[#888]">
        {start && end && totalItems ? (
          <>
            <span className="font-semibold text-[#111]">{start}–{end}</span>
            {' '}din{' '}
            <span className="font-semibold text-[#111]">{totalItems}</span>
            {' '}{label}
          </>
        ) : (
          <>
            Pagina{' '}
            <span className="font-semibold text-[#111]">{currentPage}</span>
            {' '}din{' '}
            <span className="font-semibold text-[#111]">{totalPages}</span>
          </>
        )}
      </p>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-9 h-9 rounded-xl border border-[#e8e2de] bg-white flex items-center justify-center hover:bg-[#faf7f5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-4 h-4 text-[#555]" />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-[#aaa]">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                p === currentPage
                  ? 'bg-[#ce0100] text-white shadow-[0_4px_12px_rgba(206,1,0,0.28)]'
                  : 'border border-[#e8e2de] bg-white text-[#555] hover:bg-[#faf7f5]'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-9 h-9 rounded-xl border border-[#e8e2de] bg-white flex items-center justify-center hover:bg-[#faf7f5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-4 h-4 text-[#555]" />
        </button>
      </div>
    </div>
  )
}
