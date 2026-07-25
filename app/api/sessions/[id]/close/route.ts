import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import emailjs from '@emailjs/nodejs';

emailjs.init({
    publicKey: process.env.EMAILJS_PUBLIC_KEY!,
    privateKey: process.env.EMAILJS_PRIVATE_KEY!,
});

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
    const session = await redis.get<SessionData>(key);

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

    let sent = 0;
    const failures: string[] = [];

    for (const { prayer, prayedFor } of assignments) {
        try {
            await emailjs.send(
                process.env.EMAILJS_SERVICE_ID!,
                process.env.EMAILJS_TEMPLATE_ID!,
                {
                    to_name: prayer.name,
                    to_email: prayer.email,
                    partner_name: prayedFor.name,
                    session_title: session.title,
                }
            );
            sent++;
        } catch (err) {
            console.error(`Failed to email ${prayer.email}:`, err);
            failures.push(prayer.email);
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (failures.length > 0 && sent === 0) {
        return NextResponse.json({ error: 'Failed to send any emails.' }, { status: 500 });
    }

    await redis.set(key, { ...session, closed: true, participants: [] }, { ex: 60 });

    return NextResponse.json({ ok: true, sent, failed: failures });
}