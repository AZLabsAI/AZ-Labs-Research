import { NextResponse } from 'next/server'
import { authFailure, signOutResearch } from '@/lib/auth/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    return NextResponse.json({ redirectTo: await signOutResearch(request) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return authFailure(error) }
}
