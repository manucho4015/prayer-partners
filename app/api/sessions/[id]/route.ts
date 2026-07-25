import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface SessionData {
    title: string;
    closed: boolean;
    participants: { name: string; email: string }[];
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await redis.get<SessionData>(`session:${id}`);

    if (!session) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
        title: session.title,
        closed: session.closed,
        participantNames: session.participants.map((p) => p.name),
    });
}