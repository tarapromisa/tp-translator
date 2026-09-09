import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { auth_user_id, password, email } = body

    if ((!auth_user_id && !email) || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    let userId = auth_user_id

    if (!userId && email) {
      // Check if user exists in Auth by email
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

      if (existing) {
        userId = existing.id
      } else {
        // Create user in Auth
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
        userId = newUser.user?.id

        // Save auth_user_id back to users table
        if (userId) {
          await adminClient.from('users').update({ auth_user_id: userId }).eq('email', email)
        }

        // User created with password already set — no need to update again
        return NextResponse.json({ ok: true })
      }
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 })
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
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