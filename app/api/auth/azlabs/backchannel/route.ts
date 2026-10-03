import { NextResponse } from 'next/server'
import { authFailure, receiveCentralLogout } from '@/lib/auth/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    if (body.length > 16000) return NextResponse.json({ error: 'Invalid logout request' }, { status: 400 })
    const token = new URLSearchParams(body).get('logout_token')
    if (!token) return NextResponse.json({ error: 'A signed logout token is required.' }, { status: 400 })
    return NextResponse.json(await receiveCentralLogout(token), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return authFailure(error) }
}
