'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    return (
        <footer className="w-full py-16 md:py-24 px-6 border-t border-blue-50 border-white bg-blue-50/30">
            <div className="max-w-7xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-16 text-center md:text-left">
                <div className="sm:col-span-2 space-y-6 md:space-y-8">
                    <div className="text-3xl md:text-4xl font-black text-blue-950 tracking-tighter">
                        XIP<span className="text-blue-600">PRO</span>
                    </div>
                    <p className="text-blue-950/50 font-medium leading-relaxed max-w-sm mx-auto md:mx-0 text-sm md:text-base">
                        Pushing the boundaries of generative aesthetics through research and design excellence. Join the vanguard of AI synthesis.
                    </p>
                    <div className="flex justify-center md:justify-start gap-4">
                        {['𝕏', '📷', '📺'].map((icon, i) => (
                            <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full glass border-white flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                                {icon}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    <h4 className="text-blue-950 font-black uppercase tracking-widest text-[10px] md:text-xs">Resources</h4>
                    <ul className="space-y-3 md:space-y-4 text-blue-900/60 font-bold text-xs md:text-sm">
                        <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
                        {!isAuthPage && (
                            <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                        )}
                        <li><Link href="/support" className="hover:text-blue-600 transition-colors">Support</Link></li>
                    </ul>
                </div>

                <div className="space-y-6 md:space-y-8">
                    <h4 className="text-blue-950 font-black uppercase tracking-widest text-[10px] md:text-xs">Navigation</h4>
                    <ul className="space-y-3 md:space-y-4 text-blue-900/60 font-bold text-xs md:text-sm">
                        <li><Link href="/dashboard" className="hover:text-blue-600 transition-colors">Studio</Link></li>
                        <li><Link href="/profile" className="hover:text-blue-600 transition-colors">Account</Link></li>
                        <li><Link href="/login" className="hover:text-blue-600 transition-colors">Login</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto pt-12 md:pt-20 mt-12 md:mt-20 border-t border-blue-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[8px] md:text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em] text-center">
                <p>© 2026 XIP PRO LABS. ALL RIGHTS RESERVED.</p>
                <div className="flex gap-6 md:gap-10">
                    <Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-blue-600">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
