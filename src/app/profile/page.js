'use client';

import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) return null;

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
                                {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-blue-950">{user.name}</h2>
                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{user.role} Status</p>
                            </div>
                            <div className="w-full pt-6 border-t border-blue-50">
                                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-yellow-700 tracking-widest">Available Credits</span>
                                    <span className="text-xl font-black text-yellow-700">🪙 {user.coins || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Details */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-[3rem] border border-blue-50 shadow-2xl shadow-blue-900/[0.03] space-y-12">
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-900/30">System Credentials</h3>
                                    <div className="grid gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase text-blue-950/30 tracking-widest">Network ID (Email)</p>
                                            <p className="text-sm font-bold text-blue-950">{user.email}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase text-blue-950/30 tracking-widest">Subscription Module</p>
                                            <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${user.package === 'free' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                {user.package || 'Free Agent'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-900/30">Affiliate Status</h3>
                                    <div className="grid gap-8">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase text-blue-950/30 tracking-widest">Your Referral Link</p>
                                            <div className="flex items-center gap-2 bg-blue-50/50 p-1.5 rounded-xl border border-blue-50">
                                                <input readOnly value={`https://xip-paid.vercel.app?ref=${user.referral_code}`} className="bg-transparent text-[10px] font-bold text-blue-950 flex-1 ml-2 outline-none" />
                                                <button onClick={() => {
                                                    navigator.clipboard.writeText(`https://xip-paid.vercel.app?ref=${user.referral_code}`);
                                                    alert("Link Copied!");
                                                }} className="px-3 py-1.5 bg-white text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-lg shadow-sm border border-blue-100">Copy</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-2xl border border-blue-50 text-center">
                                                <p className="text-[8px] font-black uppercase text-blue-900/30 tracking-widest mb-1">Total Referrals</p>
                                                <p className="text-xl font-black text-blue-950">{user.referral_count || 0}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl border border-blue-50 text-center">
                                                <p className="text-[8px] font-black uppercase text-blue-900/30 tracking-widest mb-1">Rewards Won</p>
                                                <p className="text-xl font-black text-blue-600">{user.referral_rewarded_count || 0}</p>
                                            </div>
                                        </div>
                                        <p className="text-[8px] font-bold text-blue-900/40 leading-relaxed italic bg-blue-50/50 p-3 rounded-xl">
                                            💡 Reward of 10 coins is granted only when your referred friend completes their first purchase. Self-referrals will be blocked.
                                        </p>
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
