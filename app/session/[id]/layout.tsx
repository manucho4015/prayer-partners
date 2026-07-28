import type { Metadata } from 'next';
import { redis } from '@/lib/redis';

interface SessionData {
    title: string;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const session = await redis.get<SessionData>(`session:${id}`);

    if (!session) {
        return { title: 'Session not found' };
    }

    return {
        title: session.title,
        description: `Join "${session.title}" — add your name and get privately matched with someone to pray for.`,
        openGraph: {
            title: session.title,
            description: `Join "${session.title}" — add your name and get privately matched with someone to pray for.`,
        },
    };
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}