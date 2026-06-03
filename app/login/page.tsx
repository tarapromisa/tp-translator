'use client'

import { useEffect, useState } from 'react'

import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

import {
  motion,
  AnimatePresence
} from 'framer-motion'

import { supabase } from '@/lib/supabase'

import { useRouter } from 'next/navigation'

const slides = [

  {
    title: 'Gestionăm traducerile.',
    accent: 'Profesional.',
    description:
      'Platformă premium pentru citate, versete și validări.'
  },

  {
    title: 'Asigurăm consistența.',
    accent: 'În toate limbile.',
    description:
      'Controlează traducătorii, validările și progresul.'
  },

  {
    title: 'Construim calitatea.',
    accent: 'În timp real.',
    description:
      'TP Translator centralizează întreaga activitate.'
  }

]

export default function LoginPage() {

  const router =
    useRouter()

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [showPassword, setShowPassword] =
    useState(false)

  const [slide, setSlide] =
    useState(0)

  useEffect(() => {

    const interval =
      setInterval(() => {

        setSlide((prev) =>
          prev === slides.length - 1
            ? 0
            : prev + 1
        )

      }, 4000)

    return () =>
      clearInterval(interval)

  }, [])

  const handleLogin = async () => {

    try {

      setLoading(true)

      const { error } =
        await supabase.auth.signInWithPassword({

          email,
          password

        })

      if (error) {

        alert(error.message)

        setLoading(false)

        return

      }

      window.location.href = '/'

    } catch (err) {

      console.error(err)

      alert('Eroare la autentificare.')

    } finally {

      setLoading(false)

    }

  }

  return (

    <main
      className="
        min-h-screen
        bg-[#fcfbfa]
        overflow-hidden
        flex
        items-center
        justify-center
        p-[30px]
        relative
      "
    >

      {/* BG SHAPES */}

      <div
        className="
          absolute
          top-[-200px]
          left-[-200px]
          w-full md:w-[500px]
          h-[500px]
          rounded-full
          bg-[#ce0100]/[0.04]
          blur-[80px]
        "
      />

      <div
        className="
          absolute
          bottom-[-200px]
          right-[-200px]
          w-full md:w-[500px]
          h-[500px]
          rounded-full
          bg-[#ce0100]/[0.05]
          blur-[100px]
        "
      />

      {/* CARD */}

      <div
        className="
          w-full
          max-w-[1450px]
          h-[880px]
          bg-white
          rounded-[40px]
          border
          border-[#f2ece8]
          shadow-[0_40px_120px_rgba(0,0,0,0.06)]
          overflow-hidden
          grid
          grid-cols-1 md:grid-cols-2
          relative
        "
      >

        {/* LEFT */}

        <div
          className="
            relative
            overflow-hidden
            bg-gradient-to-br
            from-[#fffefe]
            to-[#fff4f4]
            p-[70px]
            flex
            flex-col
            justify-between
          "
        >

          {/* LINES */}

          <svg
            className="
              absolute
              inset-0
              w-full
              h-full
              opacity-[0.4]
            "
            viewBox="0 0 800 800"
            fill="none"
          >

            <path
              d="M0 500C180 350 260 650 500 500C650 400 720 250 800 320"
              stroke="#ce0100"
              strokeWidth="1.5"
            />

            <path
              d="M0 650C180 520 320 760 520 620C650 520 740 470 800 510"
              stroke="#ce0100"
              strokeWidth="1"
              opacity="0.4"
            />

          </svg>

          {/* TOP */}

          <div className="relative z-10">

            <img
              src="/logo.png"
              alt="logo"
              className="w-[150px]"
            />

            <p
              className="
                mt-[20px]
                tracking-[0.4em]
                text-[#6d6d6d]
              "
              style={{
                fontSize: '13px',
                fontFamily: 'var(--font-montserrat)',
                fontWeight: 500
              }}
            >

              TP TRANSLATOR

            </p>

          </div>

          {/* CENTER */}

          <div className="relative z-10">

            <AnimatePresence mode="wait">

              <motion.div
                key={slide}
                initial={{
                  opacity: 0,
                  y: 30,
                  filter: 'blur(10px)'
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)'
                }}
                exit={{
                  opacity: 0,
                  y: -30,
                  filter: 'blur(10px)'
                }}
                transition={{
                  duration: 0.6
                }}
              >

                <h1
                  className="
                    leading-[1]
                    tracking-[-0.06em]
                    max-w-[560px]
                  "
                  style={{
                    fontSize: '74px',
                    fontFamily: 'var(--font-openSans)',
                    fontWeight: 300
                  }}
                >

                  {slides[slide].title}

                  <span className="text-[#ce0100]">

                    {' '}
                    {slides[slide].accent}

                  </span>

                </h1>

                <p
                  className="
                    mt-[30px]
                    text-[#666666]
                    leading-[1.7]
                    max-w-[540px]
                  "
                  style={{
                    fontSize: '22px',
                    fontFamily: 'var(--font-openSans)',
                    fontWeight: 300
                  }}
                >

                  {slides[slide].description}

                </p>

              </motion.div>

            </AnimatePresence>

            {/* PAGINATION */}

            <div className="flex items-center gap-[18px] mt-[50px]">

              {slides.map((_, index) => (

                <button
                  key={index}
                  onClick={() =>
                    setSlide(index)
                  }
                  className="
                    flex
                    items-center
                    gap-[10px]
                  "
                >

                  <span
                    className={`
                      text-[20px]
                      transition-all
                      ${
                        slide === index
                          ? 'text-[#ce0100]'
                          : 'text-[#b7b7b7]'
                      }
                    `}
                    style={{
                      fontFamily:
                        'var(--font-montserrat)',
                      fontWeight: 700
                    }}
                  >

                    0{index + 1}

                  </span>

                  <div
                    className={`
                      h-[4px]
                      rounded-full
                      transition-all
                      duration-500
                      ${
                        slide === index
                          ? 'w-[80px] bg-[#ce0100]'
                          : 'w-[40px] bg-[#e7dede]'
                      }
                    `}
                  />

                </button>

              ))}

            </div>

          </div>

          {/* BOTTOM MOCKUP */}

          <div className="relative z-10">

            <motion.div
              animate={{
                y: [0, -12, 0]
              }}
              transition={{
                duration: 5,
                repeat: Infinity
              }}
              className="
                relative
                w-[520px]
                h-[280px]
                rounded-[34px]
                bg-white
                border
                border-[#f2ece8]
                shadow-[0_30px_60px_rgba(0,0,0,0.08)]
                overflow-hidden
              "
            >

              <div
                className="
                  h-[60px]
                  border-b
                  border-[#f4efec]
                  px-[24px]
                  flex
                  items-center
                  gap-[10px]
                "
              >

                <div className="w-[12px] h-[12px] rounded-full bg-[#ff5f57]" />
                <div className="w-[12px] h-[12px] rounded-full bg-[#ffbd2e]" />
                <div className="w-[12px] h-[12px] rounded-full bg-[#28c840]" />

              </div>

              <div className="p-[26px]">

                <div className="grid grid-cols-3 gap-[16px]">

                  {[1, 2, 3].map((item) => (

                    <div
                      key={item}
                      className="
                        h-[120px]
                        rounded-[22px]
                        bg-[#fff7f7]
                        border
                        border-[#ffe3e3]
                        p-[16px]
                      "
                    >

                      <div
                        className="
                          w-[40px]
                          h-[40px]
                          rounded-[14px]
                          bg-[#ce0100]
                        "
                      />

                      <div className="mt-[20px]">

                        <div className="w-[90px] h-[10px] rounded-full bg-[#e7dede]" />

                        <div className="w-[60px] h-[10px] rounded-full bg-[#f0e8e8] mt-[10px]" />

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </motion.div>

          </div>

        </div>

        {/* RIGHT */}

        <div
          className="
            bg-white
            flex
            items-center
            justify-center
            relative
          "
        >

          <div className="w-full max-w-[520px] px-[50px]">

            <div>

              <h2
                className="
                  text-[#111111]
                  tracking-[-0.04em]
                "
                style={{
                  fontSize: '58px',
                  fontFamily: 'var(--font-openSans)',
                  fontWeight: 300
                }}
              >

                Bine ai revenit

              </h2>

              <div
                className="
                  w-[52px]
                  h-[3px]
                  rounded-full
                  bg-[#ce0100]
                  mt-[18px]
                "
              />

              <p
                className="
                  mt-[24px]
                  text-[#707070]
                  leading-[1.6]
                "
                style={{
                  fontSize: '18px',
                  fontFamily: 'var(--font-openSans)',
                  fontWeight: 300
                }}
              >

                Autentifică-te pentru a accesa
                platforma TP Translator.

              </p>

            </div>

            {/* FORM */}

            <div className="mt-[50px] space-y-[24px]">

              {/* EMAIL */}

              <div>

                <label
                  className="text-[#1a1a1a]"
                  style={{
                    fontSize: '16px',
                    fontFamily: 'var(--font-openSans)',
                    fontWeight: 400
                  }}
                >

                  Email

                </label>

                <div
                  className="
                    mt-[12px]
                    h-[68px]
                    rounded-[22px]
                    border
                    border-[#ece7e4]
                    px-[22px]
                    flex
                    items-center
                    bg-[#fcfbfa]
                  "
                >

                  <EnvelopeIcon className="w-5 h-5 text-[#8f8f8f]" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="nume@email.com"
                    className="
                      ml-[14px]
                      flex-1
                      bg-transparent
                      outline-none
                    "
                    style={{
                      fontSize: '17px',
                      fontFamily:
                        'var(--font-openSans)',
                      fontWeight: 300
                    }}
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div>

                <label
                  className="text-[#1a1a1a]"
                  style={{
                    fontSize: '16px',
                    fontFamily: 'var(--font-openSans)',
                    fontWeight: 400
                  }}
                >

                  Parolă

                </label>

                <div
                  className="
                    mt-[12px]
                    h-[68px]
                    rounded-[22px]
                    border
                    border-[#ece7e4]
                    px-[22px]
                    flex
                    items-center
                    bg-[#fcfbfa]
                  "
                >

                  <LockClosedIcon className="w-5 h-5 text-[#8f8f8f]" />

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    placeholder="••••••••"
                    className="
                      ml-[14px]
                      flex-1
                      bg-transparent
                      outline-none
                    "
                    style={{
                      fontSize: '17px',
                      fontFamily:
                        'var(--font-openSans)',
                      fontWeight: 300
                    }}
                  />

                  <button
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >

                    {showPassword ? (

                      <EyeSlashIcon className="w-5 h-5 text-[#8f8f8f]" />

                    ) : (

                      <EyeIcon className="w-5 h-5 text-[#8f8f8f]" />

                    )}

                  </button>

                </div>

              </div>

              {/* REMEMBER */}

              <div className="flex items-center justify-between">

                <label className="flex items-center gap-[12px]">

                  <input type="checkbox" />

                  <span
                    className="text-[#666666]"
                    style={{
                      fontSize: '15px',
                      fontFamily:
                        'var(--font-openSans)',
                      fontWeight: 300
                    }}
                  >

                    Ține-mă minte

                  </span>

                </label>

                <button
                  className="text-[#ce0100]"
                  style={{
                    fontSize: '15px',
                    fontFamily:
                      'var(--font-openSans)',
                    fontWeight: 400
                  }}
                >

                  Ai uitat parola?

                </button>

              </div>

              {/* BUTTON */}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="
                  w-full
                  h-[68px]
                  rounded-[22px]
                  bg-[#ce0100]
                  text-white
                  shadow-[0_16px_40px_rgba(206,1,0,0.22)]
                  transition-all
                  duration-300
                  hover:translate-y-[-2px]
                "
                style={{
                  fontSize: '18px',
                  fontFamily: 'var(--font-montserrat)',
                  fontWeight: 700
                }}
              >

                {loading
                  ? 'Se autentifică...'
                  : 'Autentifică-te'}

              </button>

            </div>

          </div>

        </div>

      </div>

    </main>

  )

}