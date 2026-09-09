import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('update-password body:', body)
    const { auth_user_id, password } = body

    if (!auth_user_id || !password) {
      console.log('Missing:', { auth_user_id: !!auth_user_id, password: !!password })
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 })
    }

    const { error } = await adminClient.auth.admin.updateUserById(auth_user_id, {
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}