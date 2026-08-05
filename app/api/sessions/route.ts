import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export async function POST(req: Request) {
    const { title, adminName, adminEmail } = await req.json();

    if (!title?.trim() || !adminName?.trim() || !adminEmail?.includes('@')) {
        return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const adminToken = crypto.randomUUID();

    await redis.set(`session:${id}`, {
        title: title.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        participants: [{ name: adminName.trim(), email: adminEmail.trim() }],
        closed: false,
        createdAt: Date.now(),
    });

    await redis.set(`admin:${id}`, adminToken, { ex: ADMIN_TOKEN_TTL_SECONDS });

    return NextResponse.json({ id, adminToken });
}