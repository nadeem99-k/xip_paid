'use client';
import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginContent() {
    const { data: session, status } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
        }
    }, [status, router, callbackUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError(res.error);
                setIsLoading(false);
            } else {
                router.replace(callbackUrl);
            }
        } catch (e) {
            setError("An unexpected error occurred.");
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        setIsLoading(true);
        signIn('google', { callbackUrl });
    };

    if (status === 'loading') {
        return (
            <div className="flex justify-center items-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-center items-center min-h-screen pt-20 px-6 bg-white">
            <div className="w-full max-w-md space-y-10 animate-fade-in-up">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest">Secure Entry</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-blue-950">Welcome <span className="text-blue-600">Back</span></h1>
                    <p className="text-blue-950/40 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Neural Studio Authentication</p>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-blue-50 space-y-8 shadow-2xl shadow-blue-950/[0.03]">
                    <div className="space-y-4">
                        <button
                            disabled={isLoading}
                            onClick={handleGoogleSignIn}
                            className="w-full h-16 bg-white border-2 border-blue-50 rounded-2xl flex items-center justify-center gap-4 hover:bg-blue-50 transition-all font-black text-xs uppercase tracking-widest text-blue-950 disabled:opacity-50"
                        >
                            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="Google" />
                            {isLoading ? "Launching..." : "Continue with Google"}
                        </button>

                        <div className="flex items-center gap-4 text-[9px] font-black text-blue-950/20 uppercase tracking-widest">
                            <div className="h-px bg-blue-50 flex-1"></div>
                            <span>Or Secure Login</span>
                            <div className="h-px bg-blue-50 flex-1"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900/30 ml-2">Access ID (Email)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-16 bg-blue-50/50 rounded-2xl border border-blue-100 focus:border-blue-500 focus:outline-none px-6 text-sm transition-all text-blue-950 placeholder:text-blue-950/20"
                                    placeholder="name@domain.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900/30 ml-2">Security Key (Password)</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-16 bg-blue-50/50 rounded-2xl border border-blue-100 focus:border-blue-500 focus:outline-none px-6 text-sm transition-all text-blue-950 placeholder:text-blue-950/20"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            disabled={isLoading}
                            type="submit"
                            className="group relative w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden shadow-xl shadow-blue-600/10"
                        >
                            <span className="relative z-10">{isLoading ? "Validating..." : "Initialize Session"}</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1000ms]"></div>
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] font-black text-blue-950/20 uppercase tracking-[0.2em] mt-8">
                    New to XIP PRO? <Link href={`/signup${callbackUrl !== '/dashboard' ? `?callbackUrl=${callbackUrl}` : ''}`} className="text-blue-600 hover:text-blue-700 ml-2 transition-colors">Register Node</Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
