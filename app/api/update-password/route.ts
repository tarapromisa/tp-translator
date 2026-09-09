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

    // If auth_user_id not provided, look up by email
    if (!userId && email) {
      const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers()
      if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
      const found = users.find(u => u.email === email)
      if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      userId = found.id
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