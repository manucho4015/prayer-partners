import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface SessionData {
    participants: { name: string; email: string }[];
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? '';

    if (!q) {
        return NextResponse.json({ names: [] });
    }

    const session = await redis.get<SessionData>(`session:${id}`);
    if (!session) {
        return NextResponse.json({ names: [] });
    }

    const matches = session.participants
        .filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => p.name)
        .slice(0, 8);

    return NextResponse.json({ names: matches });
}