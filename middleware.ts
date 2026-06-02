import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible by role
const ROLE_ROUTES: Record<string, string[]> = {
  'Traducător': ['/setari'],
  'Traducător_RO': ['/citate-ro', '/setari'],
  'Coordonator': ['/citate', '/versete', '/citate-ro', '/limbi', '/utilizatori', '/mail-tlp', '/productivitate', '/setari'],
  'Coordonator principal': ['/citate', '/versete', '/citate-ro', '/limbi', '/utilizatori', '/validari', '/mail-tlp', '/productivitate', '/setari'],
  'Admin': ['/citate', '/versete', '/citate-ro', '/limbi', '/utilizatori', '/validari', '/mail-tlp', '/productivitate', '/setari'],
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Not logged in → redirect to login
  if (!user && !path.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in on login page → redirect to home
  if (user && path.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Check role-based access for protected routes
  if (user && path !== '/' && !path.startsWith('/login') && !path.startsWith('/api')) {
    const { data: profile } = await supabase
      .from('users').select('role, language').eq('auth_user_id', user.id).single()

    if (profile) {
      const role = profile.role === 'Traducător' && profile.language === 'RO'
        ? 'Traducător_RO' : profile.role

      const allowedRoutes = ROLE_ROUTES[role] ?? []
      const isProtected = Object.values(ROLE_ROUTES).some(routes =>
        routes.some(r => path.startsWith(r))
      )

      if (isProtected && !allowedRoutes.some(r => path.startsWith(r))) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}