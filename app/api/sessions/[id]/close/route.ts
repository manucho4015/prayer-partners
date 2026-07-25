import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Participant {
    name: string;
    email: string;
}

interface SessionData {
    title: string;
    closed: boolean;
    adminToken: string;
    participants: Participant[];
}

function sattoloCycle<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { adminToken } = await req.json();
    const key = `session:${id}`;
    const session = await kv.get<SessionData>(key);

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    if (session.closed) return NextResponse.json({ error: 'Already closed.' }, { status: 400 });
    if (adminToken !== session.adminToken) {
        return NextResponse.json({ error: 'Not authorized to close this session.' }, { status: 403 });
    }
    if (session.participants.length < 3) {
        return NextResponse.json({ error: 'Need at least 3 participants.' }, { status: 400 });
    }

    const shuffled = sattoloCycle(session.participants);
    const assignments = session.participants.map((prayer, i) => ({
        prayer,
        prayedFor: shuffled[i],
    }));

    try {
        await Promise.all(
            assignments.map(({ prayer, prayedFor }) =>
                resend.emails.send({
                    from: 'Prayer Partners <onboarding@resend.dev>',
                    to: prayer.email,
                    subject: `Your Prayer Partner — ${session.title}`,
                    text: `Hi ${prayer.name},\n\nFor "${session.title}", you've been matched to pray for ${prayedFor.name}.\n\nKeep it between you and God — that's the whole point!`,
                })
            )
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to send one or more emails.' }, { status: 500 });
    }

    await kv.set(key, { ...session, closed: true, participants: [] }, { ex: 60 });

    return NextResponse.json({ ok: true, sent: assignments.length });
}