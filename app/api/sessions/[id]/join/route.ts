import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface SessionData {
    title: string;
    closed: boolean;
    adminToken: string;
    participants: { name: string; email: string }[];
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { name, email } = await req.json();

    if (!name?.trim() || !email?.includes('@')) {
        return NextResponse.json({ error: 'Please provide a valid name and email.' }, { status: 400 });
    }

    const key = `session:${id}`;
    const session = await kv.get<SessionData>(key);

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    if (session.closed) return NextResponse.json({ error: 'This session has already closed.' }, { status: 400 });

    const alreadyJoined = session.participants.some(
        (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (alreadyJoined) {
        return NextResponse.json({ error: 'This email has already joined.' }, { status: 400 });
    }

    session.participants.push({ name: name.trim(), email: email.trim() });
    await kv.set(key, session);

    return NextResponse.json({ ok: true });
}