'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function PricingPage() {
    const { data: session } = useSession();
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [paymentProof, setPaymentProof] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const PAYMENT_INFO = {
        easypaisa: "03422168420",
        title: "Rashed Ali",
    };

    const COIN_PACKS = [
        {
            id: '3_coins',
            name: 'Starter Pack',
            coins: 3,
            price: 50,
            icon: '🪙',
            description: 'Perfect to start your journey.',
            features: ['3 High Quality Credits', 'Bikini Mode (1.5 Images)', 'Nude Mode (0.5 Images)', 'Standard Speed']
        },
        {
            id: '9_coins',
            name: 'Pro Pack',
            coins: 9,
            price: 100, // Discounted from 150
            originalPrice: 150,
            icon: '💎',
            description: 'Most popular for regular users.',
            features: ['9 Premium Credits', 'Bikini Mode (4.5 Images)', 'Nude Mode (1.5 Images)', 'Priority Queue']
        },
        {
            id: '21_coins',
            name: 'Elite Pack',
            coins: 21,
            price: 300,
            icon: '🔥',
            description: 'Best value for creators.',
            features: ['21 Elite Credits', 'Bikini Mode (10.5 Images)', 'Nude Mode (3.5 Images)', 'Ultra Fast Speed']
        }
    ];

    const handlePaymentUpload = async (e) => {
        e.preventDefault();
        const pack = COIN_PACKS.find(p => p.id === selectedPackage);
        if (!paymentProof || !pack) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('proof', paymentProof);
        formData.append('amount', pack.price);
        formData.append('method', 'easypaisa');
        formData.append('package', `${pack.coins} Coins`); // Matches .includes('coin') in admin

        try {
            const res = await fetch('/api/payment/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                alert("Payment proof uploaded! Admin will verify shortly.");
                setSelectedPackage(null);
            } else {
                alert("Upload failed: " + data.error);
            }
        } catch (err) {
            alert("Upload error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="pt-32 pb-20 px-6 min-h-screen bg-white">
            <div className="max-w-6xl mx-auto space-y-20 animate-slide-up">
                <div className="text-center space-y-4 md:space-y-6 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/60">Coin System Active</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-blue-950">Fuel Your <span className="text-blue-600">Creativity</span></h1>
                    <p className="text-blue-950/40 font-bold uppercase tracking-widest text-[9px] md:text-[10px] leading-relaxed">Purchase coins to unlock advanced neural modes. <br className="hidden md:block" />Bikini (2 Coins) | Nude (6 Coins)</p>
                </div>

                {!selectedPackage ? (
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {COIN_PACKS.map((pack) => (
                            <div
                                key={pack.id}
                                onClick={() => setSelectedPackage(pack.id)}
                                className={`group relative p-8 rounded-[3rem] transition-all cursor-pointer shadow-xl hover:-translate-y-2 border ${pack.id === '9_coins' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-blue-50 hover:border-blue-200 text-blue-950'}`}
                            >
                                {pack.id === '9_coins' && <div className="absolute top-0 right-0 p-8 text-white/5 text-8xl font-black -rotate-12 translate-x-10 -translate-y-10">PRO</div>}
                                <div className="space-y-8 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${pack.id === '9_coins' ? 'bg-white/10' : 'bg-blue-50'}`}>{pack.icon}</div>
                                        <div className="text-right">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${pack.name === 'Pro Pack' ? 'text-white/40' : 'text-blue-900/30'}`}>{pack.name}</p>
                                            <div className="flex flex-col items-end">
                                                {pack.originalPrice && (
                                                    <span className={`text-[10px] line-through opacity-40 font-black italic`}>Rs {pack.originalPrice}</span>
                                                )}
                                                <p className="text-3xl font-black tracking-tighter">Rs {pack.price}</p>
                                                {pack.originalPrice && (
                                                    <span className="text-[8px] font-black bg-white text-blue-600 px-2 py-0.5 rounded-full mt-1 animate-pulse">SAVE 33%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">{pack.coins} Coins</h3>
                                        <p className={`text-xs font-bold mt-2 ${pack.id === '9_coins' ? 'text-white/40' : 'text-blue-950/40'}`}>{pack.description}</p>
                                    </div>
                                    <ul className="space-y-4">
                                        {pack.features.map((feature) => (
                                            <li key={feature} className={`flex items-center gap-3 text-[11px] font-black uppercase tracking-widest ${pack.id === '9_coins' ? 'text-white/60' : 'text-blue-950/60'}`}>
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${pack.id === '9_coins' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'}`}>✓</span>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className={`py-5 text-center rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg ${pack.id === '9_coins' ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                        Get Pack
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto bg-white border border-blue-50 p-12 rounded-[3.5rem] space-y-10 shadow-2xl shadow-blue-950/[0.03] animate-fade-in-up">
                        <button onClick={() => setSelectedPackage(null)} className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:opacity-70 transition-opacity">
                            <span>←</span> Choose Different Module
                        </button>

                        <div className="space-y-4 text-center">
                            <h2 className="text-4xl font-black text-blue-950 tracking-tighter">Complete <span className="text-blue-600">Sync</span></h2>
                            <p className="text-blue-950/40 text-[10px] font-black uppercase tracking-widest">Verify via EasyPaisa to activate your Neural Node.</p>
                        </div>

                        <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-50 space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-blue-950/30 uppercase tracking-[0.2em]">Transmission Mode</span>
                                <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-full text-[9px] font-black uppercase tracking-widest">EasyPaisa</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-blue-100 pb-6">
                                <span className="text-[9px] font-black text-blue-950/30 uppercase tracking-[0.2em]">Node Identifier</span>
                                <span className="text-3xl font-black text-blue-950 tracking-tighter font-mono">{PAYMENT_INFO.easypaisa}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-blue-950/30 uppercase tracking-[0.2em]">Account Key</span>
                                <span className="text-sm font-black text-blue-950 uppercase tracking-widest">{PAYMENT_INFO.title}</span>
                            </div>
                            <div className="flex justify-between items-center pt-6 border-t border-blue-100">
                                <span className="text-[9px] font-black text-blue-950/30 uppercase tracking-[0.2em]">Total Payload</span>
                                <span className="text-3xl font-black text-blue-600 tracking-tighter">Rs {COIN_PACKS.find(p => p.id === selectedPackage)?.price}</span>
                            </div>
                        </div>

                        <form onSubmit={handlePaymentUpload} className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-blue-950/30 uppercase tracking-[0.3em] ml-2">Upload Visual Logs (Screenshot)</label>
                                <div className="relative h-20 bg-blue-50 border border-blue-100 rounded-2xl flex items-center px-6 group hover:border-blue-300 transition-colors">
                                    <input
                                        type="file"
                                        onChange={(e) => setPaymentProof(e.target.files[0])}
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        required
                                    />
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-black text-blue-950/60 uppercase tracking-widest">{paymentProof ? paymentProof.name : "Select Log File..."}</span>
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:-rotate-6">📎</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={isUploading}
                                type="submit"
                                className="w-full h-20 bg-blue-600 text-white font-black rounded-3xl text-sm uppercase tracking-[0.4em] hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-blue-600/20"
                            >
                                {isUploading ? "Transmitting..." : "Authorize Access"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
