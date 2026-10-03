import { NextResponse } from 'next/server'
import { authFailure, currentResearchSession } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { access } = await currentResearchSession()
    return NextResponse.json({ subject: access.subject, tier: access.tier, allowed: true, limits: access.limits }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) { return authFailure(error) }
}
