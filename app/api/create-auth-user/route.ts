import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json()

    // Check if user already exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existing?.users?.find(u => u.email === email)

    if (existingUser) {
      // Update password if user exists
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, updated: true })
    }

    // Create new user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Link auth user to users table
    await supabaseAdmin
      .from('users')
      .update({ auth_user_id: data.user.id })
      .eq('email', email)

    return NextResponse.json({ ok: true, user: data.user })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}