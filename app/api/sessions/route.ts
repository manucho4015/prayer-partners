import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
    const { title, adminName, adminEmail } = await req.json();

    if (!title?.trim() || !adminName?.trim() || !adminEmail?.includes('@')) {
        return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const adminToken = crypto.randomUUID();

    await kv.set(`session:${id}`, {
        title: title.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminToken,
        participants: [{ name: adminName.trim(), email: adminEmail.trim() }],
        closed: false,
        createdAt: Date.now(),
    });

    return NextResponse.json({ id, adminToken });
}
