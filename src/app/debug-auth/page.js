'use client';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';

export default function DebugPage() {
    const { user, isLoading, refreshUser } = useUser();
    const [dbCheck, setDbCheck] = useState(null);
    const [checkingDb, setCheckingDb] = useState(false);

    const checkDatabase = async () => {
        if (!user?.email) return;

        setCheckingDb(true);
        try {
            const response = await fetch(`/api/check-user-role?email=${encodeURIComponent(user.email)}`);
            const data = await response.json();
            setDbCheck(data);
        } catch (error) {
            setDbCheck({ success: false, error: error.message });
        } finally {
            setCheckingDb(false);
        }
    };

    useEffect(() => {
        if (user?.email && !dbCheck) {
            checkDatabase();
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-blue-950">Debug User Session</h1>
                    <p className="text-sm text-blue-900/50 font-bold mt-2">Check your authentication status and role</p>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm font-bold text-blue-900">Loading session...</p>
                    </div>
                )}

                {/* User Info from useUser Hook */}
                <div className="bg-white border-2 border-blue-100 rounded-2xl p-6">
                    <h2 className="text-xl font-black text-blue-950 mb-4">📱 Client Session (useUser hook)</h2>
                    {user ? (
                        <div className="space-y-3 font-mono text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <span className="text-blue-900/50 font-bold">Email:</span>
                                <span className="text-blue-950 font-bold">{user.email}</span>

                                <span className="text-blue-900/50 font-bold">Role:</span>
                                <span className={`font-black uppercase ${user.role === 'admin' ? 'text-red-600' : 'text-gray-600'}`}>
                                    {user.role || 'user'}
                                </span>

                                <span className="text-blue-900/50 font-bold">Coins:</span>
                                <span className="text-blue-950 font-bold">{user.coins || 0}</span>

                                <span className="text-blue-900/50 font-bold">Package:</span>
                                <span className="text-blue-950 font-bold">{user.package || 'free'}</span>

                                <span className="text-blue-900/50 font-bold">User ID:</span>
                                <span className="text-blue-950 font-bold text-xs">{user.id}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-600 font-bold">❌ Not logged in</p>
                    )}

                    <button
                        onClick={refreshUser}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700"
                    >
                        🔄 Refresh Session
                    </button>
                </div>

                {/* Database Check */}
                <div className="bg-white border-2 border-green-100 rounded-2xl p-6">
                    <h2 className="text-xl font-black text-blue-950 mb-4">💾 Database Record</h2>
                    {checkingDb ? (
                        <p className="text-sm text-blue-900 font-bold">Checking database...</p>
                    ) : dbCheck ? (
                        dbCheck.success ? (
                            <div className="space-y-3 font-mono text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <span className="text-blue-900/50 font-bold">Email:</span>
                                    <span className="text-blue-950 font-bold">{dbCheck.user.email}</span>

                                    <span className="text-blue-900/50 font-bold">Role:</span>
                                    <span className={`font-black uppercase ${dbCheck.user.role === 'admin' ? 'text-red-600' : 'text-gray-600'}`}>
                                        {dbCheck.user.role}
                                    </span>

                                    <span className="text-blue-900/50 font-bold">Coins:</span>
                                    <span className="text-blue-950 font-bold">{dbCheck.user.coins}</span>

                                    <span className="text-blue-900/50 font-bold">Is Admin:</span>
                                    <span className={`font-black ${dbCheck.isAdmin ? 'text-green-600' : 'text-gray-600'}`}>
                                        {dbCheck.isAdmin ? '✅ YES' : '❌ NO'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-600 font-bold">❌ {dbCheck.error}</p>
                        )
                    ) : (
                        <p className="text-gray-500 font-bold">Not checked yet</p>
                    )}

                    <button
                        onClick={checkDatabase}
                        disabled={!user || checkingDb}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 disabled:opacity-50"
                    >
                        🔍 Check Database
                    </button>
                </div>

                {/* Diagnosis */}
                {user && dbCheck?.success && (
                    <div className={`rounded-2xl p-6 ${user.role === 'admin' && dbCheck.user.role === 'admin'
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-yellow-50 border-2 border-yellow-200'
                        }`}>
                        <h2 className="text-xl font-black text-blue-950 mb-4">🔬 Diagnosis</h2>
                        {user.role === 'admin' && dbCheck.user.role === 'admin' ? (
                            <div>
                                <p className="text-green-800 font-bold mb-3">✅ Everything looks good!</p>
                                <p className="text-sm text-green-700 mb-4">Both your session and database show admin role.</p>
                                <a
                                    href="/admin"
                                    className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-black text-sm hover:bg-green-700"
                                >
                                    Go to Admin Panel →
                                </a>
                            </div>
                        ) : dbCheck.user.role !== 'admin' ? (
                            <div>
                                <p className="text-yellow-800 font-bold mb-3">⚠️ Database role is not 'admin'</p>
                                <p className="text-sm text-yellow-700 mb-4">You need to set the admin role in the database first.</p>
                                <a
                                    href="/test-admin-setup"
                                    className="inline-block px-6 py-3 bg-yellow-600 text-white rounded-xl font-black text-sm hover:bg-yellow-700"
                                >
                                    Set Admin Role →
                                </a>
                            </div>
                        ) : (
                            <div>
                                <p className="text-yellow-800 font-bold mb-3">⚠️ Session not synced</p>
                                <p className="text-sm text-yellow-700 mb-4">Database shows admin, but session doesn't. Try refreshing.</p>
                                <button
                                    onClick={refreshUser}
                                    className="inline-block px-6 py-3 bg-yellow-600 text-white rounded-xl font-black text-sm hover:bg-yellow-700"
                                >
                                    🔄 Refresh Session
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Browser Console Logs */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <h2 className="text-xl font-black text-blue-950 mb-4">📋 Browser Console</h2>
                    <p className="text-sm text-gray-700 mb-3">
                        Open browser console (Press <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">F12</kbd>) to see detailed logs:
                    </p>
                    <ul className="text-xs font-mono text-gray-600 space-y-1">
                        <li>• <span className="text-blue-600">[useUser]</span> - Authentication hook logs</li>
                        <li>• <span className="text-blue-600">[Admin Page]</span> - Admin page logs</li>
                        <li>• <span className="text-blue-600">[Navbar]</span> - Navbar logs</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
