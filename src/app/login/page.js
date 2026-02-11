'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace(callbackUrl);
            }
        };
        checkUser();
    }, [router, callbackUrl, supabase]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        const safeCallbackUrl = callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
            ? callbackUrl
            : '/dashboard';

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=${safeCallbackUrl}`,
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

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
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            disabled={isLoading}
                            onClick={handleGoogleSignIn}
                            className="w-full h-16 bg-white border-2 border-blue-50 rounded-2xl flex items-center justify-center gap-4 hover:bg-blue-50 transition-all font-black text-xs uppercase tracking-widest text-blue-950 disabled:opacity-50"
                        >
                            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="Google" />
                            {isLoading ? "Launching..." : "Continue with Google"}
                        </button>
                    </div>

                    <div className="pt-4 text-center">
                        <p className="text-[10px] font-black text-blue-950/20 uppercase tracking-[0.2em]">
                            Secure OAuth 2.0 Encryption Active
                        </p>
                    </div>
                </div>

                <p className="text-center text-[10px] font-black text-blue-950/20 uppercase tracking-[0.2em] mt-8">
                    Need technical help? <Link href="/support" className="text-blue-600 hover:text-blue-700 ml-2 transition-colors">Contact Support</Link>
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
