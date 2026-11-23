// app/api/agents/models/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { availableFallbacks, DEFAULT_MODEL } from '@/lib/agents/llm';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: 'NVIDIA_API_KEY not set',
      tried: availableFallbacks(),
      default: DEFAULT_MODEL,
    });
  }
  // Ask NVIDIA for the list (some endpoints, not all, advertise this).
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      const ids: string[] = (data?.data || []).map((m: any) => m.id).filter(Boolean);
      return NextResponse.json({ ok: true, default: DEFAULT_MODEL, available: ids, fallbackOrder: availableFallbacks() });
    }
    return NextResponse.json({
      ok: false,
      status: res.status,
      default: DEFAULT_MODEL,
      available: [],
      fallbackOrder: availableFallbacks(),
      hint: 'Set /v1/models not exposed on your account — the runtime will try the fallback list.',
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, default: DEFAULT_MODEL, fallbackOrder: availableFallbacks() });
  }
}
