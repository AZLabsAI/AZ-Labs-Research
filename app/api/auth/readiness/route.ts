import { NextResponse } from 'next/server'
import { publicAuthReadiness } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const ready = await publicAuthReadiness()
  return NextResponse.json({ ready }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
