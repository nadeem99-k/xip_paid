'use client';
import React, { useState } from 'react';

export default function SupportPage() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');

        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message }),
            });
            const data = await res.json();
            if (data.success) {
                setSubmitted(true);
            } else {
                alert("Submission failed: " + data.error);
            }
        } catch (err) {
            alert("Connection error");
        }
    };

    return (
        <div className="pt-32 pb-20 px-6 min-h-screen bg-white text-blue-950">
            <div className="max-w-4xl mx-auto space-y-16 animate-slide-up">
                <div className="space-y-4 text-center">
                    <h1 className="text-6xl font-black tracking-tighter">Support <span className="text-blue-600">Hub</span></h1>
                    <p className="text-blue-900/40 font-bold uppercase tracking-widest text-[10px]">Neural Node Connection: Stable</p>
                </div>

                <div className="grid md:grid-cols-2 gap-16">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black">Get in Touch</h2>
                            <p className="text-blue-900/60 font-medium leading-relaxed">Have questions about your coin balance or technical issues with the studio? Our team is ready to transmit solutions.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-6 p-6 glass rounded-2xl border-white shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-xl">📧</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-600">Direct Protocol</p>
                                    <p className="font-bold">support@xippro.ai</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 p-6 glass rounded-2xl border-white shadow-sm">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-xl">⏱️</div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-600">Response Latency</p>
                                    <p className="font-bold">Under 2 Hours</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass p-10 rounded-[2.5rem] border-white shadow-2xl relative overflow-hidden">
                        {submitted ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
                                <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl">✓</div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black">Signal Transmitted</h3>
                                    <p className="text-blue-900/50 text-sm font-medium">We've received your data packet. Stand by for response.</p>
                                </div>
                                <button onClick={() => setSubmitted(false)} className="text-blue-600 font-bold uppercase tracking-widest text-[10px] hover:underline">Send Another</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900/30 ml-2">Identity Name</label>
                                    <input name="name" type="text" required className="w-full h-14 bg-white border border-blue-50 rounded-2xl px-6 focus:border-blue-500 focus:outline-none transition-all" placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900/30 ml-2">Email Address</label>
                                    <input name="email" type="email" required className="w-full h-14 bg-white border border-blue-50 rounded-2xl px-6 focus:border-blue-500 focus:outline-none transition-all" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900/30 ml-2">Message Packet</label>
                                    <textarea name="message" required className="w-full h-32 bg-white border border-blue-50 rounded-2xl p-6 focus:border-blue-500 focus:outline-none transition-all resize-none" placeholder="Describe your query..."></textarea>
                                </div>
                                <button type="submit" className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95">Transfrom Signal</button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
