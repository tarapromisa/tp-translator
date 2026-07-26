'use client'

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

type Props = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
  label?: string
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

  const start = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null
  const end = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#f0e8e4] bg-white flex-shrink-0">
      {/* Left: record count */}
      <p className="text-[12px] text-[#999]">
        {start && end && totalItems ? (
          <><span className="font-semibold text-[#555]">{start}–{end}</span> din <span className="font-semibold text-[#555]">{totalItems}</span> {label}</>
        ) : (
          <><span className="font-semibold text-[#555]">{label}</span></>
        )}
      </p>

      {/* Right: page indicator + arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-xl border border-[#e8e2de] bg-white flex items-center justify-center hover:bg-[#faf7f5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5 text-[#555]" />
        </button>

        <div className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-[#e8e2de] bg-[#faf7f5]">
          <span className="text-[12px] font-bold text-[#ce0100]">{currentPage}</span>
          <span className="text-[11px] text-[#bbb]">din</span>
          <span className="text-[12px] font-semibold text-[#555]">{totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-xl border border-[#e8e2de] bg-white flex items-center justify-center hover:bg-[#faf7f5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-3.5 h-3.5 text-[#555]" />
        </button>
      </div>
    </div>
  )
}
