import { NextResponse } from 'next/server';
import { ALL_MATCHES } from '@/lib/matches';

export async function GET() {
  return NextResponse.json({ matches: ALL_MATCHES });
}
