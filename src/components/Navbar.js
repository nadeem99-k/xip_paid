'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="fixed top-0 left-0 right-0 z-[60] glass border-b border-blue-100 px-6 py-4">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity">
                    <span className="text-blue-950">XIP</span>
                    <span className="text-blue-600">PRO</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Home</Link>
                    <Link href="/pricing" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Pricing</Link>
                    {session && (
                        <Link href="/dashboard" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Dashboard</Link>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {session ? (
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                🪙 {session.user.coins || 0}
                            </div>
                            {session.user.role === 'admin' && (
                                <Link href="/admin" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Admin</Link>
                            )}
                            <button
                                onClick={() => signOut()}
                                className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors"
                            >
                                Sign Out
                            </button>
                            <Link href="/dashboard" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg">
                                Dashboard
                            </Link>
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Login</Link>
                            <Link href="/signup" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg hover:shadow-blue-200">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
