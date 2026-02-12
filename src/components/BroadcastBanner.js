'use client';
import { useState, useEffect } from 'react';

export default function BroadcastBanner() {
    const [broadcast, setBroadcast] = useState(null);
    const [closed, setClosed] = useState(false);

    useEffect(() => {
        const fetchBroadcast = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data.success) {
                    const broadcastSetting = data.settings.find(s => s.key === 'broadcast');
                    if (broadcastSetting?.value?.active && broadcastSetting.value.message) {
                        setBroadcast(broadcastSetting.value);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch broadcast", e);
            }
        };

        fetchBroadcast();
    }, []);

    if (!broadcast || closed) return null;

    return (
        <div className="bg-blue-600 text-white py-2 px-4 flex items-center justify-between animate-fade-in relative z-[100]">
            <div className="flex-1 text-center flex items-center justify-center gap-3">
                <span className="text-lg">📢</span>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none">
                    {broadcast.message}
                </p>
            </div>
            <button
                onClick={() => setClosed(true)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-sm opacity-50 hover:opacity-100"
            >
                ✕
            </button>
        </div>
    );
}
