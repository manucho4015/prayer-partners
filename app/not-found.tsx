import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg shadow-slate-200 p-8 text-center">
                <h1 className="text-5xl font-semibold text-slate-900 mb-2">404</h1>
                <p className="text-slate-500 text-sm mb-6">We couldn't find the page you're looking for.</p>
                <Link
                    href="/"
                    className="inline-block rounded-lg bg-slate-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-slate-800 transition-colors"
                >
                    Go back home
                </Link>
            </div>
        </main>
    );
}