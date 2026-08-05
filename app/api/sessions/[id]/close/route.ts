import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import emailjs from '@emailjs/nodejs';

emailjs.init({
    publicKey: process.env.EMAILJS_PUBLIC_KEY!,
    privateKey: process.env.EMAILJS_PRIVATE_KEY!,
});

const RETENTION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface Participant {
    name: string;
    email: string;
}

interface SessionData {
    title: string;
    closed: boolean;
    participants: Participant[];
}

interface FailureRecord {
    name: string;
    email: string;
    error: string;
    attemptedAt: number;
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

    const storedAdminToken = await redis.get<string>(`admin:${id}`);
    if (!storedAdminToken || adminToken !== storedAdminToken) {
        return NextResponse.json({ error: 'Not authorized to close this session.' }, { status: 403 });
    }

    const key = `session:${id}`;
    const session = await redis.get<SessionData>(key);

    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    if (session.closed) return NextResponse.json({ error: 'Already closed.' }, { status: 400 });
    if (session.participants.length < 3) {
        return NextResponse.json({ error: 'Need at least 3 participants.' }, { status: 400 });
    }

    const shuffled = sattoloCycle(session.participants);
    const assignments = session.participants.map((prayer, i) => ({
        prayer,
        prayedFor: shuffled[i],
    }));

    let sent = 0;
    const failures: FailureRecord[] = [];

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
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Failed to email ${prayer.email}:`, err);
            failures.push({ name: prayer.name, email: prayer.email, error: message, attemptedAt: Date.now() });
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (failures.length > 0 && sent === 0) {
        return NextResponse.json({ error: 'Failed to send any emails.' }, { status: 500 });
    }

    // Only failed entries are kept, so you can follow up manually — everyone
    // else's data is cleared as before.
    if (failures.length > 0) {
        await redis.set(`failures:${id}`, failures, { ex: RETENTION_TTL_SECONDS });
    }

    // Extended so the session page (and the failures check) stays reachable
    // long enough for you to actually notice and investigate a report.
    await redis.set(key, { ...session, closed: true, participants: [] }, { ex: RETENTION_TTL_SECONDS });

    return NextResponse.json({ ok: true, sent, failed: failures.length });
}