import {
  CheckCircleIcon
} from '@heroicons/react/24/solid'

type CitationCardProps = {

  publicId: string

  quote: string

  author: string

  languages: {
    code: string
    completed: boolean
  }[]

  completedLanguages: number

  totalLanguages: number

  status: 'Complet' | 'Incomplet'

  validationStatus:
    | 'În așteptare'
    | 'Validat'
    | 'Refuzat'
}

export default function CitationCard({

  publicId,

  quote,

  author,

  languages,

  completedLanguages,

  totalLanguages,

  status,

  validationStatus

}: CitationCardProps) {

  const progress =
    (completedLanguages / totalLanguages) * 100

  return (

    <div className="group relative overflow-hidden rounded-[34px] bg-white border border-[#f3efeb] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)] hover:-translate-y-1 transition-all duration-500">

      {/* GLOW */}

      <div className="absolute top-[-50px] right-[-50px] w-[140px] h-[140px] rounded-full bg-red-50 blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>

      <div className="relative z-10">

        {/* TOP */}

        <div className="flex items-center justify-between">

          {/* VALIDATION */}

          <div
            className={`
              px-3 py-1.5 rounded-xl text-[12px]
              font-normal font-[family:var(--font-montserrat)]
              text-white
              ${
                validationStatus === 'Validat'
                  ? 'bg-green-500'
                  : validationStatus === 'Refuzat'
                  ? 'bg-red-600'
                  : 'bg-violet-500'
              }
            `}
          >

            {validationStatus}

          </div>

          {/* STATUS */}

          <div
            className={`
              px-3 py-1.5 rounded-xl text-[12px]
              font-normal font-[family:var(--font-montserrat)]
              text-white
              ${
                status === 'Complet'
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }
            `}
          >

            {status}

          </div>

        </div>

        {/* PUBLIC ID */}

        <div className="mt-6">

          <p className="text-[13px] lowercase text-[#b5b5b5] font-light font-[family:var(--font-openSans)]">

            public id

          </p>

          <h2 className="mt-1 text-[42px] leading-none text-[#111111] font-[family:var(--font-openSans)] font-light">

            {publicId}

          </h2>

        </div>

        {/* QUOTE */}

        <div className="mt-7">

          <p className="text-[22px] leading-[1.5] text-[#111111] font-[family:var(--font-openSans)] font-light">

            “{quote}”

          </p>

          <p className="mt-5 text-[20px] italic text-[#8b8b8b] font-[family:var(--font-playfair)]">

            {author && (

  <p className="mt-6 text-[18px] text-[#9b948d] editorial-serif">

    — {author}

  </p>

)}

          </p>

        </div>

        {/* LANGUAGES */}

        <div className="flex items-center gap-4 mt-8 flex-wrap">

          {languages.map((language) => (

            <div
              key={language.code}
              className="flex items-center gap-2"
            >

              <p className="text-[12px] uppercase tracking-[0.10em] text-[#8b8b8b] font-light font-[family:var(--font-openSans)]">

                {language.code}

              </p>

              <CheckCircleIcon
                className={`
                  w-4 h-4
                  ${
                    language.completed
                      ? 'text-green-500'
                      : 'text-[#d7d7d7]'
                  }
                `}
              />

            </div>

          ))}

        </div>

        {/* PROGRESS */}

        <div className="mt-8">

          <div className="flex items-center justify-between">

            <h2 className="mt-2 text-[34px] text-[#111111] editorial-light">

  {publicId}

</h2>

            <p className="text-[14px] text-[#111111] font-light">

              {completedLanguages}/{totalLanguages}

            </p>

          </div>

          <div className="mt-3 w-full h-[5px] rounded-full bg-[#f3efec] overflow-hidden">

            <div
              className={`
                h-full rounded-full transition-all duration-700
                ${
                  progress === 100
                    ? 'bg-green-500'
                    : progress >= 50
                    ? 'bg-orange-400'
                    : 'bg-red-500'
                }
              `}
              style={{
                width: `${progress}%`
              }}
            />

          </div>

        </div>

      </div>

    </div>

  )
}