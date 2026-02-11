'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export default function Navbar() {
    const { user, isLoading, signOut } = useUser();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Debugging coins
    useEffect(() => {
        if (user) {
            console.log(`[Navbar] User detected: ${user.email}, Coins: ${user.coins}`);
        }
    }, [user]);

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleSignOut = async () => {
        if (isSigningOut) return; // Prevent double-clicks

        setIsSigningOut(true);
        setIsMenuOpen(false); // Close menu if open

        try {
            console.log('[Navbar] Starting logout process...');
            await signOut();

            // Force clear any stale state
            console.log('[Navbar] Redirecting to login...');
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('[Navbar] Logout error:', error);
        } finally {
            setIsSigningOut(false);
        }
    };

    // Admin email whitelist - must match admin page
    const ADMIN_EMAILS = [
        'nadeemalikalhoro310@gmail.com',
        // Add more admin emails here
    ];

    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    return (
        <nav className="fixed top-0 left-0 right-0 z-[60] glass border-b border-blue-100 px-6 py-4">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src="/logo.png" alt="XIP AI" className="h-10 w-auto" />
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="/" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Home</Link>
                    {!isAuthPage && (
                        <Link href="/pricing" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Pricing</Link>
                    )}
                    <Link href="/support" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Support</Link>
                    {user && (
                        <Link href="/dashboard" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Dashboard</Link>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {isLoading ? (
                        <div className="h-10 w-24 bg-blue-50/50 animate-pulse rounded-xl"></div>
                    ) : user ? (
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                                🪙 {user.coins || 0}
                            </div>
                            {isAdmin && (
                                <Link href="/admin" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Admin</Link>
                            )}
                            <button
                                onClick={handleSignOut}
                                disabled={isSigningOut}
                                className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSigningOut ? 'Signing out...' : 'Sign Out'}
                            </button>
                            <Link href="/dashboard" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg">
                                Dashboard
                            </Link>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login" className="text-sm font-bold text-blue-900/60 hover:text-blue-600 transition-colors">Login</Link>
                            <Link href="/signup" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg hover:shadow-blue-200">
                                Get Started
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={toggleMenu}
                        className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 bg-blue-50 rounded-xl"
                    >
                        <div className={`w-5 h-0.5 bg-blue-600 transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                        <div className={`w-5 h-0.5 bg-blue-600 transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                        <div className={`w-5 h-0.5 bg-blue-600 transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Content */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-[73px] left-0 right-0 bg-white border-b border-blue-50 p-6 animate-fade-in-down shadow-2xl">
                    <div className="flex flex-col gap-6">
                        <Link href="/" onClick={toggleMenu} className="text-lg font-black text-blue-950 uppercase tracking-widest">Home</Link>
                        {!isAuthPage && (
                            <Link href="/pricing" onClick={toggleMenu} className="text-lg font-black text-blue-950 uppercase tracking-widest">Pricing</Link>
                        )}
                        <Link href="/support" onClick={toggleMenu} className="text-lg font-black text-blue-950 uppercase tracking-widest">Support</Link>
                        {user ? (
                            <>
                                <Link href="/dashboard" onClick={toggleMenu} className="text-lg font-black text-blue-950 uppercase tracking-widest">Dashboard</Link>
                                <Link href="/profile" onClick={toggleMenu} className="text-lg font-black text-blue-950 uppercase tracking-widest text-blue-600">My Profile ({user.coins || 0} 🪙)</Link>
                                <button
                                    onClick={() => { handleSignOut(); toggleMenu(); }}
                                    disabled={isSigningOut}
                                    className="text-left text-lg font-black text-red-500 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSigningOut ? 'Signing out...' : 'Sign Out'}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" onClick={toggleMenu} className="text-lg font-black text-blue-950 uppercase tracking-widest">Login</Link>
                                <Link href="/signup" onClick={toggleMenu} className="w-full py-4 bg-blue-600 text-white text-center rounded-2xl font-black text-sm uppercase tracking-[0.2em]">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
