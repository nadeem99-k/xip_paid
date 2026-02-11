'use client';
import { useState } from 'react';

export default function SetAdminPage() {
    const [email, setEmail] = useState('nadeemalikalhoro310@gmail.com');
    const [secret, setSecret] = useState('secret');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSetAdmin = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/set-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, secret })
            });

            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-black text-blue-950 mb-2">Set Admin Role</h1>
                    <p className="text-sm text-blue-900/50 font-bold">Quick admin setup tool</p>
                </div>

                <div className="bg-blue-50/50 rounded-3xl p-8 space-y-6 border border-blue-100">
                    <div>
                        <label className="block text-xs font-black text-blue-950 uppercase tracking-widest mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-blue-950 focus:border-blue-600 outline-none"
                            placeholder="admin@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-blue-950 uppercase tracking-widest mb-2">
                            Admin Secret
                        </label>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-blue-950 focus:border-blue-600 outline-none"
                            placeholder="From ADMIN_SECRET in .env.local"
                        />
                        <p className="mt-2 text-[10px] text-blue-900/40 font-bold">
                            Current value: "secret"
                        </p>
                    </div>

                    <button
                        onClick={handleSetAdmin}
                        disabled={loading || !email || !secret}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                    >
                        {loading ? 'Setting Admin...' : 'Set as Admin'}
                    </button>

                    {result && (
                        <div className={`p-4 rounded-2xl ${result.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            }`}>
                            {result.success ? (
                                <div>
                                    <p className="text-sm font-bold text-green-800 mb-2">
                                        ✅ {result.message}
                                    </p>
                                    <p className="text-xs text-green-600">
                                        Email: {result.user?.email}
                                        <br />
                                        Role: <span className="uppercase font-black">{result.user?.role}</span>
                                        <br />
                                        Coins: {result.user?.coins}
                                    </p>
                                    <div className="mt-4">
                                        <a
                                            href="/admin"
                                            className="inline-block px-6 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase hover:bg-green-700"
                                        >
                                            Go to Admin Panel →
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-bold text-red-800 mb-1">
                                        ❌ Error
                                    </p>
                                    <p className="text-xs text-red-600">
                                        {result.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-yellow-800 mb-2">⚠️ About Coins Issue</p>
                    <p className="text-[10px] text-yellow-700 leading-relaxed">
                        New signups should get <strong>3 coins</strong>. If you're seeing 2 coins, it might be:
                        <br />• Database default value is set to 2
                        <br />• User was created before code update
                        <br /><br />
                        Use the SQL scripts in <code className="bg-yellow-100 px-1">fix-admin-and-coins.sql</code> to diagnose.
                    </p>
                </div>
            </div>
        </div>
    );
}
