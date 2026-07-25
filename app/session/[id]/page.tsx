'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface SessionInfo {
    title: string;
    closed: boolean;
    participantNames: string[];
}

export default function SessionPage() {
    const params = useParams();
    const id = params.id as string;

    const [info, setInfo] = useState<SessionInfo | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [joinError, setJoinError] = useState('');
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState('');
    const [notFound, setNotFound] = useState(false);

    async function loadInfo() {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) {
            setNotFound(true);
            return;
        }
        setInfo(await res.json());
    }

    useEffect(() => {
        loadInfo();
        setIsAdmin(!!localStorage.getItem(`admin_token_${id}`));
    }, [id]);

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        setJoinStatus('loading');
        setJoinError('');

        try {
            const res = await fetch(`/api/sessions/${id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to join');

            setName('');
            setEmail('');
            setJoinStatus('idle');
            await loadInfo();
        } catch (err) {
            setJoinStatus('error');
            setJoinError(err instanceof Error ? err.message : 'Something went wrong');
        }
    }

    async function handleClose() {
        if (!confirm('This will match everyone and email their assignments. Continue?')) return;

        setClosing(true);
        setCloseError('');

        try {
            const adminToken = localStorage.getItem(`admin_token_${id}`);
            const res = await fetch(`/api/sessions/${id}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminToken }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to close session');

            localStorage.removeItem(`admin_token_${id}`);
            await loadInfo();
        } catch (err) {
            setCloseError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setClosing(false);
        }
    }

    if (notFound) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500">This session doesn't exist or has already ended.</p>
            </main>
        );
    }

    if (!info) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-400 text-sm">Loading…</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-slate-200 p-8">
                <h1 className="text-2xl font-semibold text-slate-900 mb-1">{info.title}</h1>

                {info.closed ? (
                    <p className="text-sm text-emerald-600 mt-4">
                        This session has closed. Assignments were emailed to everyone — check your inbox!
                    </p>
                ) : (
                    <>
                        <p className="text-slate-500 text-sm mb-6">
                            {info.participantNames.length} joined so far. Add your name below.
                        </p>

                        <ul className="flex flex-wrap gap-2 mb-6">
                            {info.participantNames.map((n) => (
                                <li
                                    key={n}
                                    className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full"
                                >
                                    {n}
                                </li>
                            ))}
                        </ul>

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Your email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>

                            {joinError && <p className="text-sm text-red-600">{joinError}</p>}

                            <button
                                type="submit"
                                disabled={joinStatus === 'loading'}
                                className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {joinStatus === 'loading' ? 'Joining…' : 'Join session'}
                            </button>
                        </form>

                        {isAdmin && (
                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <button
                                    onClick={handleClose}
                                    disabled={closing || info.participantNames.length < 3}
                                    className="w-full rounded-lg bg-red-600 text-white text-sm font-medium py-2.5 hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {closing ? 'Sending assignments…' : 'End session & send emails'}
                                </button>
                                {info.participantNames.length < 3 && (
                                    <p className="text-xs text-slate-400 mt-2 text-center">
                                        Need at least 3 participants to close.
                                    </p>
                                )}
                                {closeError && <p className="text-sm text-red-600 mt-2">{closeError}</p>}
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}