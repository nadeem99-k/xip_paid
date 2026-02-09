'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-white pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto space-y-16">
                <header className="space-y-4 text-center md:text-left">
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-widest uppercase">System Registry</div>
                    <h1 className="text-4xl md:text-6xl font-black text-blue-950 tracking-tighter leading-tight">
                        User <span className="text-blue-600 italic">Profile</span>
                    </h1>
                </header>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Identity Card */}
                    <div className="md:col-span-1 space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-blue-50 shadow-2xl shadow-blue-900/[0.03] flex flex-col items-center text-center space-y-6">
                            <div className="w-32 h-32 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl font-black shadow-xl shadow-blue-600/20">
                                {session.user.name?.[0].toUpperCase()}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-blue-950">{session.user.name}</h2>
                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{session.user.role} Status</p>
                            </div>
                            <div className="w-full pt-6 border-t border-blue-50">
                                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-yellow-700 tracking-widest">Available Credits</span>
                                    <span className="text-xl font-black text-yellow-700">🪙 {session.user.coins || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Details */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-[3rem] border border-blue-50 shadow-2xl shadow-blue-900/[0.03] space-y-12">
                            <div className="space-y-8">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-900/30">System Credentials</h3>
                                <div className="grid gap-8">
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-blue-950/30 tracking-widest">Network ID (Email)</p>
                                        <p className="text-sm font-bold text-blue-950">{session.user.email}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-blue-950/30 tracking-widest">Subscription Module</p>
                                        <p className="text-sm font-bold text-blue-950 uppercase tracking-tight">{session.user.package || 'Neutral'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-blue-950/30 tracking-widest">Account Created</p>
                                        <p className="text-sm font-bold text-blue-950">Active Session</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-blue-50 flex flex-wrap gap-4">
                                <Link href="/dashboard" className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10">
                                    Enter Studio
                                </Link>
                                <Link href="/pricing" className="px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
                                    Buy Credits
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
