'use client'

import { useState } from 'react'

import { XMarkIcon } from '@heroicons/react/24/outline'

import { supabase } from '@/lib/supabase'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateCitationModal({
  open,
  onClose,
  onCreated
}: Props) {

  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleCreate = async () => {

    if (!quote) return

    setLoading(true)

    const publicId =
      `CT${Math.floor(1000 + Math.random() * 9000)}`

    const { error } = await supabase
      .from('texts')
      .insert({
        public_id: publicId,
        citat_ro: quote,
        autor_original: author,
        validation: 'În traducere'
      })

    setLoading(false)

    if (error) {
      console.error(error)
      return
    }

    onCreated()

    onClose()

    setQuote('')
    setAuthor('')

  }

  return (

    <div
      className="
        fixed
        inset-0
        bg-black/30
        backdrop-blur-[6px]
        z-50
        flex
        items-center
        justify-center
      "
    >

      <div
        className="
          w-[760px]
          bg-white
          rounded-[34px]
          p-[34px]
          shadow-[0_20px_80px_rgba(0,0,0,0.12)]
        "
      >

        {/* TOP */}

        <div className="flex items-start justify-between">

          <div>

            <h2
              className="text-[#111111]"
              style={{
                fontSize: '42px',
                fontFamily: 'var(--font-montserrat)',
                fontWeight: 700
              }}
            >

              Citat nou

            </h2>

            <div className="w-[46px] h-[3px] bg-[#ce0100] rounded-full mt-[14px]" />

          </div>

          <button
            onClick={onClose}
            className="
              w-[46px]
              h-[46px]
              rounded-full
              bg-[#faf7f7]
              flex
              items-center
              justify-center
            "
          >

            <XMarkIcon className="w-[24px] h-[24px] text-[#111111]" />

          </button>

        </div>

        {/* FORM */}

        <div className="mt-[34px]">

          {/* QUOTE */}

          <div>

            <label
              className="text-[#222222]"
              style={{
                fontSize: '16px',
                fontFamily: 'var(--font-openSans)',
                fontWeight: 400
              }}
            >

              Citat

            </label>

            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="
                mt-[12px]
                w-full
                h-[220px]
                rounded-[24px]
                border
                border-[#ece7e4]
                bg-[#fcfbfa]
                p-[24px]
                outline-none
                resize-none
              "
              style={{
                fontSize: '20px',
                fontFamily: 'var(--font-openSans)',
                fontWeight: 300
              }}
            />

          </div>

          {/* AUTHOR */}

          <div className="mt-[24px]">

            <label
              className="text-[#222222]"
              style={{
                fontSize: '16px',
                fontFamily: 'var(--font-openSans)',
                fontWeight: 400
              }}
            >

              Autor

            </label>

            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="
                mt-[12px]
                w-full
                h-[68px]
                rounded-[22px]
                border
                border-[#ece7e4]
                bg-[#fcfbfa]
                px-[22px]
                outline-none
              "
              style={{
                fontSize: '18px',
                fontFamily: 'var(--font-openSans)',
                fontWeight: 300
              }}
            />

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex justify-end gap-[14px] mt-[34px]">

          <button
            onClick={onClose}
            className="
              h-[58px]
              px-[28px]
              rounded-[20px]
              border
              border-[#ece7e4]
              bg-white
            "
          >

            Anulează

          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="
              h-[58px]
              px-[34px]
              rounded-[20px]
              bg-[#ce0100]
              text-white
              shadow-[0_10px_24px_rgba(206,1,0,0.18)]
            "
          >

            {loading ? 'Se salvează...' : 'Creează citatul'}

          </button>

        </div>

      </div>

    </div>

  )
}