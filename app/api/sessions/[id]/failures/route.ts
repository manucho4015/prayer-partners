import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface FailureRecord {
    name: string;
    email: string;
    error: string;
    attemptedAt: number;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { adminToken } = await req.json();

    const storedAdminToken = await redis.get<string>(`admin:${id}`);
    if (!storedAdminToken || adminToken !== storedAdminToken) {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }

    const failures = (await redis.get<FailureRecord[]>(`failures:${id}`)) ?? [];
    return NextResponse.json({ failures });
}