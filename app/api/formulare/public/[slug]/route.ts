import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS but we verify manually
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Verify form is public and not expired
  const { data: form, error } = await serviceClient
    .from('forms')
    .select('id, titlu, descriere, visibility, expires_at, public_slug')
    .eq('public_slug', slug)
    .eq('visibility', 'public')
    .single()

  if (error || !form) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 })
  }

  const { data: questions } = await serviceClient
    .from('form_questions')
    .select('id, type, label, options, required, order_index, prefill_field')
    .eq('form_id', form.id)
    .order('order_index')

  return NextResponse.json({ form, questions: questions ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await req.json()

  // Verify form is public
  const { data: form, error } = await serviceClient
    .from('forms')
    .select('id, visibility, expires_at')
    .eq('public_slug', slug)
    .eq('visibility', 'public')
    .single()

  if (error || !form) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 })
  }

  // Insert response
  const { data: response, error: respErr } = await serviceClient
    .from('form_responses')
    .insert({
      form_id: form.id,
      submitted_by: body.submitted_by ?? null,
      is_anonymous: body.is_anonymous ?? true,
    })
    .select('id')
    .single()

  if (respErr || !response) {
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
  }

  // Insert answers
  if (body.answers?.length > 0) {
    await serviceClient.from('form_answers').insert(
      body.answers.map((a: any) => ({
        response_id: response.id,
        question_id: a.question_id,
        value: a.value,
      }))
    )
  }

  return NextResponse.json({ ok: true })
}