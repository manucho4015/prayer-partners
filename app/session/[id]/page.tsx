'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AsyncSelect from 'react-select/async';

interface SessionInfo {
    title: string;
    closed: boolean;
    participantNames: string[];
}

interface JoinedRecord {
    name: string;
    email: string;
}

interface NameOption {
    label: string;
    value: string;
}

const selectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        borderRadius: '0.5rem',
        borderColor: state.isFocused ? '#0f172a' : '#cbd5e1',
        boxShadow: 'none',
        fontSize: '0.875rem',
        minHeight: '38px',
        '&:hover': { borderColor: '#0f172a' },
    }),
    placeholder: (base: any) => ({ ...base, color: '#94a3b8' }),
    menu: (base: any) => ({ ...base, fontSize: '0.875rem', zIndex: 20 }),
};

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
    const [copied, setCopied] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [joinedHere, setJoinedHere] = useState<JoinedRecord[]>([]);
    const [selectedCheck, setSelectedCheck] = useState<NameOption | null>(null);

    async function handleRefresh() {
        setRefreshing(true);
        await loadInfo();
        setRefreshing(false);
    }

    function loadJoinedHere() {
        try {
            const raw = localStorage.getItem(`joined_${id}`);
            setJoinedHere(raw ? JSON.parse(raw) : []);
        } catch {
            setJoinedHere([]);
        }
    }

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
        loadJoinedHere();
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

            const updated = [...joinedHere, { name: name.trim(), email: email.trim() }];
            localStorage.setItem(`joined_${id}`, JSON.stringify(updated));
            setJoinedHere(updated);

            setName('');
            setEmail('');
            setJoinStatus('idle');
            await loadInfo();
        } catch (err) {
            setJoinStatus('error');
            setJoinError(err instanceof Error ? err.message : 'Something went wrong');
        }
    }

    async function loadNameOptions(inputValue: string): Promise<NameOption[]> {
        if (!inputValue.trim()) return [];
        const res = await fetch(`/api/sessions/${id}/search?q=${encodeURIComponent(inputValue)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.names.map((n: string) => ({ label: n, value: n }));
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

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Copy this link:', window.location.href);
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

    const otherCount = Math.max(0, info.participantNames.length - joinedHere.length);

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-slate-200 p-8">
                <div className="flex items-start justify-between gap-3 mb-1">
                    <h1 className="text-2xl font-semibold text-slate-900">{info.title}</h1>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            aria-label="Refresh"
                            className="shrink-0 border border-slate-300 rounded-full p-2 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                            >
                                <path d="M21 12a9 9 0 1 1-3-6.7" />
                                <path d="M21 3v6h-6" />
                            </svg>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="text-xs font-medium text-slate-600 border border-slate-300 rounded-full px-3 py-1.5 hover:bg-slate-50 transition-colors"
                        >
                            {copied ? 'Copied!' : 'Copy link'}
                        </button>
                    </div>
                </div>

                {info.closed ? (
                    <p className="text-sm text-green-700 mt-4">
                        This session has closed. Assignments were emailed to everyone — check your inbox!
                    </p>
                ) : (
                    <>
                        <p className="text-slate-500 text-sm mb-3">
                            {info.participantNames.length} joined so far. Add your name and email below
                        </p>

                        {(joinedHere.length > 0 || otherCount > 0) && (
                            <div className="flex items-center gap-3 flex-wrap mb-6">
                                {joinedHere.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {joinedHere.map((p) => (
                                            <span
                                                key={p.email}
                                                className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full"
                                            >
                                                {p.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {joinedHere.length > 0 && otherCount > 0 && (
                                    <div className="w-px h-4 bg-slate-300" />
                                )}

                                {otherCount > 0 && (
                                    <span className="bg-slate-200 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">
                                        {otherCount} other{otherCount === 1 ? '' : 's'}
                                    </span>
                                )}
                            </div>
                        )}

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

                        <div className="mt-6 pt-5 border-t border-slate-200">
                            <p className="text-xs text-slate-500 mb-2">
                                Joined on someone else's phone? Search your name:
                            </p>
                            <AsyncSelect
                                cacheOptions
                                loadOptions={loadNameOptions}
                                onChange={(option) => setSelectedCheck(option as NameOption | null)}
                                value={selectedCheck}
                                placeholder="Start typing your name…"
                                noOptionsMessage={({ inputValue }) =>
                                    inputValue ? 'No match found' : 'Type to search'
                                }
                                isClearable
                                styles={selectStyles}
                            />

                            {selectedCheck && (
                                <p className="text-xs text-green-700 mt-2">
                                    You're all set — {selectedCheck.value} is registered.
                                </p>
                            )}
                        </div>

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