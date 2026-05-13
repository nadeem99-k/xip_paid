'use client';
import { useState, useEffect } from 'react';

const notifications = [
    { text: "Someone from Karachi just bought 100 Coins! 👑", type: "payment" },
    { text: "New user from Lahore just signed up! ✨", type: "signup" },
    { text: "Rashed just approved a new payment! ✅", type: "admin" },
    { text: "User just earned 10 Free Coins via Referral! 🤝", type: "referral" },
    { text: "Someone just generated a Nude Mode masterpiece! 🔞", type: "generation" },
    { text: "New Master Pack unlock from Islamabad! 💎", type: "payment" },
    { text: "Studio is currently processing 42 active renders... ⚡", type: "system" },
    { text: "Limited Time Sale: 50% OFF ends in 2 hours! 🕒", type: "promo" },
];

export default function FomoNotification() {
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const showNext = () => {
            // Random delay between 15 and 30 seconds
            const nextDelay = Math.floor(Math.random() * (30000 - 15000) + 15000);
            
            setTimeout(() => {
                setCurrentIndex(Math.floor(Math.random() * notifications.length));
                setIsVisible(true);
                
                // Hide after 6 seconds
                setTimeout(() => {
                    setIsVisible(false);
                }, 6000);

                showNext();
            }, nextDelay);
        };

        showNext();
    }, []);

    if (currentIndex === -1) return null;

    return (
        <div className={`fixed bottom-8 left-8 z-[100] transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
            <div className="bg-white/90 backdrop-blur-xl border border-blue-100 p-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-4 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-600/20">
                    {notifications[currentIndex].type === 'payment' ? '💰' : 
                     notifications[currentIndex].type === 'referral' ? '🤝' : 
                     notifications[currentIndex].type === 'signup' ? '🔥' : '✨'}
                </div>
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Recent Activity</p>
                    <p className="text-[11px] font-bold text-blue-950 tracking-tight leading-relaxed">
                        {notifications[currentIndex].text}
                    </p>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-blue-950/20 hover:text-blue-950 p-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
