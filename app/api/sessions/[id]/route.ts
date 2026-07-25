import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface SessionData {
    title: string;
    closed: boolean;
    participants: { name: string; email: string }[];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const session = await kv.get<SessionData>(`session:${params.id}`);

    if (!session) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only expose what's safe: title, status, and names (never emails, never the token).
    return NextResponse.json({
        title: session.title,
        closed: session.closed,
        participantNames: session.participants.map((p) => p.name),
    });
}