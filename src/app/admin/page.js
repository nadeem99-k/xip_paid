'use client';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const { user, isLoading, refreshUser } = useUser();
    const router = useRouter();
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalVolume: 0, revenueToday: 0, monthlyVolume: 0 });
    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [generations, setGenerations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('payments');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(25);
    const [showAllPayments, setShowAllPayments] = useState(false);
    const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
    const [growthStats, setGrowthStats] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null); // For profile modal
    const [profileLoading, setProfileLoading] = useState(false);
    const [settings, setSettings] = useState({});
    const [savingSettings, setSavingSettings] = useState(false);

    // Admin email whitelist - add your admin emails here
    const ADMIN_EMAILS = [
        'nadeemalikalhoro310@gmail.com',
        // Add more admin emails here
    ];

    // Simple check: is user's email in the admin list?
    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchPayments = async (signal) => {
        try {
            const url = showAllPayments ? '/api/admin/payments?status=all' : '/api/admin/payments?status=pending';
            const res = await fetch(url, { signal });
            const data = await res.json();
            if (data.success) {
                setPayments(data.payments);
                if (data.stats) setStats(data.stats);
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error("Failed to fetch payments", e);
            showToast("Failed to fetch payments", 'error');
        }
    };

    const fetchUsers = async (signal) => {
        try {
            const res = await fetch('/api/admin/users', { signal });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error("Failed to fetch users", e);
            showToast("Failed to fetch users", 'error');
        }
    };

    const fetchTickets = async (signal) => {
        try {
            const res = await fetch('/api/admin/support', { signal });
            const data = await res.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error("Failed to fetch tickets", e);
            showToast("Failed to fetch tickets", 'error');
        }
    };

    const fetchGenerations = async (signal) => {
        try {
            const res = await fetch('/api/admin/generations', { signal });
            const data = await res.json();
            if (data.success) {
                setGenerations(data.generations);
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error("Failed to fetch generations", e);
            showToast("Failed to fetch generations", 'error');
        }
    };

    const fetchGrowthStats = async (signal) => {
        try {
            const res = await fetch('/api/admin/stats/growth', { signal });
            const data = await res.json();
            if (data.success) {
                setGrowthStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch growth stats", e);
        }
    };

    const fetchSettings = async (signal) => {
        try {
            const res = await fetch('/api/admin/settings', { signal });
            const data = await res.json();
            if (data.success) {
                const settingsObj = {};
                data.settings.forEach(s => settingsObj[s.key] = s.value);
                setSettings(settingsObj);
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        }
    };

    const updateSetting = async (key, value) => {
        setSavingSettings(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Setting "${key}" updated`);
                fetchSettings();
            }
        } catch (e) {
            showToast("Failed to update setting", 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const fetchUserProfile = async (userId) => {
        setProfileLoading(true);
        try {
            const res = await fetch(`/api/admin/users/profile?userId=${userId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedUser(data);
            } else {
                showToast(data.error, 'error');
            }
        } catch (e) {
            showToast("Failed to load profile", 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (isAdmin) {
            fetchPayments(controller.signal);
            fetchUsers(controller.signal);
            fetchTickets(controller.signal);
            fetchGenerations(controller.signal);
            fetchGrowthStats(controller.signal);
            fetchSettings(controller.signal);
        }
        return () => controller.abort();
    }, [isAdmin, showAllPayments]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleUpdateCoins = async (userId, currentCoins) => {
        const amount = prompt("Enter amount to add (e.g., 10) or remove (e.g., -5):", "10");
        if (amount === null) return;
        const coinAmount = parseInt(amount);
        if (isNaN(coinAmount)) {
            showToast("Please enter a valid number", 'error');
            return;
        }

        try {
            const res = await fetch('/api/admin/users/update-coins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, coinAmount })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchUsers(); // Refresh list
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        }
    };

    const handleTicketStatus = async (ticketId, status) => {
        try {
            const res = await fetch('/api/admin/support', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, status })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Ticket status updated");
                fetchTickets();
            }
        } catch (e) {
            showToast("Update error", 'error');
        }
    };

    const handleAction = async (paymentId, action) => {
        if (!confirm(`Are you sure you want to ${action} this payment?`)) return;

        try {
            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, action })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchPayments(); // Refresh list
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        }
    };

    const handleUserAction = async (userId, action) => {
        const confirmMsg =
            action === 'promote' ? "Make this user an ADMIN?" :
                action === 'demote' ? "Remove admin rights from this user?" :
                    action === 'ban' ? "BAN this user? They will lose access to the platform." :
                        "Unban this user?";

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/admin/users/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchUsers(); // Refresh list
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        }
    };

    const handleDeleteGeneration = async (genId) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this generation? This cannot be undone.")) return;
        try {
            const res = await fetch('/api/admin/generations/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ generationId: genId })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchGenerations(); // Refresh logs
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        }
    };

    const handleExportPayments = () => {
        window.location.href = '/api/admin/payments/export';
    };

    // --- Filtering & Pagination Logic ---

    const filteredData = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let data = [];

        if (activeTab === 'payments') {
            data = payments.filter(p =>
                (p.userEmail && p.userEmail.toLowerCase().includes(query)) ||
                (p.user_id && p.user_id.toLowerCase().includes(query)) ||
                (p.amount && p.amount.toString().includes(query)) ||
                (p.method && p.method.toLowerCase().includes(query))
            );
        } else if (activeTab === 'users') {
            data = users.filter(u =>
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.id && u.id.toLowerCase().includes(query)) ||
                (u.role && u.role.toLowerCase().includes(query))
            );
        } else if (activeTab === 'support') {
            data = tickets.filter(t =>
                (t.email && t.email.toLowerCase().includes(query)) ||
                (t.message && t.message.toLowerCase().includes(query)) ||
                (t.name && t.name.toLowerCase().includes(query))
            );
        } else if (activeTab === 'generations' || activeTab === 'gallery') {
            data = generations.filter(g =>
                (g.users?.email && g.users.email.toLowerCase().includes(query)) ||
                (g.prompt && g.prompt.toLowerCase().includes(query)) ||
                (g.mode && g.mode.toLowerCase().includes(query))
            );
        }
        return data;
    }, [activeTab, payments, users, tickets, generations, searchQuery]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // Reset page on tab/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);


    if ((isLoading || loading) && !isAdmin) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <p className="text-sm font-bold text-blue-950 mb-2">Loading admin panel...</p>
            <p className="text-xs text-blue-900/40">Checking authentication...</p>
        </div>
    );

    if (!user || !isAdmin) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-6 bg-white px-6">
                <div className="text-6xl animate-bounce">⚠️</div>
                <h1 className="text-3xl font-black text-blue-950">Access <span className="text-red-500">Denied</span></h1>
                <p className="text-blue-900/40 font-bold uppercase tracking-widest text-[10px]">Restricted Administrative Zone</p>
                {user && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl max-w-md">
                        <p className="text-xs text-yellow-800 font-bold">Your email: {user.email}</p>
                        <p className="text-[10px] text-yellow-600 mt-2">This email is not in the admin whitelist.</p>
                    </div>
                )}
                <div className="flex gap-3">
                    <button onClick={() => router.push('/')} className="px-8 py-3 bg-gray-100 text-blue-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Back to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
                    }`}>
                    <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
                    <p className="font-bold text-sm tracking-wide">{toast.message}</p>
                </div>
            )}

            <div className="space-y-8 animate-slide-up">
                {/* Header Section */}
                <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 pb-8 border-b border-blue-50">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full border border-red-100 w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">Admin Control</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-blue-950">Dashboard <span className="text-blue-600">Overview</span></h1>
                        <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">System Management Center</p>
                    </div>

                    {/* Stats Grid - Now scrollable on mobile */}
                    <div className="flex xl:grid xl:grid-cols-4 gap-4 w-full xl:w-auto overflow-x-auto pb-4 xl:pb-0 scrollbar-hide snap-x">
                        <div className="min-w-[280px] xl:min-w-0 snap-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Total Revenue</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">Rs {stats?.totalVolume || 0}</p>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Rs {stats?.revenueToday || 0} Today</p>
                                    <p className="text-[8px] font-bold text-blue-400">Rs {stats?.monthlyVolume || 0} Month</p>
                                </div>
                            </div>
                        </div>
                        <div className="min-w-[200px] xl:min-w-0 snap-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Total Users</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">{stats?.totalUsers || 0}</p>
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                        <div className="min-w-[200px] xl:min-w-0 snap-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Creations</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">{generations.length}</p>
                                <span className="text-2xl">🎨</span>
                            </div>
                        </div>
                        <div className="min-w-[200px] xl:min-w-0 snap-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Pending Orders</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">{payments.length}</p>
                                <span className="text-2xl">⏳</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Status Bar for History Toggle & Export */}
                {activeTab === 'payments' && (
                    <div className="flex justify-between items-center px-4">
                        <button
                            onClick={handleExportPayments}
                            className="px-6 py-2 bg-green-50 text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        >
                            📊 Export CSV
                        </button>
                        <button
                            onClick={() => setShowAllPayments(!showAllPayments)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showAllPayments ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-100 text-blue-950'
                                }`}
                        >
                            <span>{showAllPayments ? 'Showing All' : 'Showing Pending'}</span>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${showAllPayments ? 'bg-blue-400' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-2.5 h-2.5 rounded-full bg-white transition-all ${showAllPayments ? 'left-5' : 'left-1'}`}></div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Controls Section - Hidden Navigation on Mobile (moved to bottom nav) */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center sticky top-20 z-30 bg-white/80 backdrop-blur-xl p-4 -mx-4 rounded-3xl border border-blue-50/50 shadow-sm">
                    <div className="hidden md:flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
                        {['payments', 'users', 'generations', 'gallery', 'analytics', 'settings', 'support'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105'
                                    : 'bg-blue-50 text-blue-400 hover:bg-blue-100 hover:text-blue-600'
                                    }`}
                            >
                                {tab === 'payments' && `Payments (${payments.length})`}
                                {tab === 'users' && `Users (${users.length})`}
                                {tab === 'generations' && `Log (${generations.length})`}
                                {tab === 'gallery' && `Gallery`}
                                {tab === 'analytics' && `Analytics 📈`}
                                {tab === 'settings' && `Settings ⚙️`}
                                {tab === 'support' && `Support (${tickets.filter(t => t.status === 'pending').length})`}
                            </button>
                        ))}
                    </div>

                    <div className="md:hidden w-full flex items-center justify-between mb-2 px-2">
                        <h2 className="text-lg font-black text-blue-950 uppercase tracking-tighter">{activeTab}</h2>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Admin Panel</span>
                    </div>

                    <div className="w-full lg:w-auto relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-blue-300 group-focus-within:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search data..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full lg:w-80 pl-12 pr-6 py-4 bg-blue-50/50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-sm font-bold text-blue-950 placeholder-blue-900/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white border border-blue-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-950/[0.02] min-h-[400px]">
                    {paginatedData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-4xl opacity-50 grayscale animate-pulse">
                                {activeTab === 'payments' ? '✅' : activeTab === 'users' ? '👥' : '📬'}
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-950 opacity-40">No Data Found</p>
                                <p className="text-[10px] text-blue-950/20 font-bold uppercase tracking-widest">Try adjusting your search filters.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop View (Table) - Hidden on Mobile */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-blue-50/50 border-b border-blue-50">
                                        <tr>
                                            {activeTab === 'payments' && (
                                                <>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Identity</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Module</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Value</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Date</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Proof</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Status</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Actions</th>
                                                </>
                                            )}
                                            {activeTab === 'users' && (
                                                <>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">User</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Role</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Coins</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Joined</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Actions</th>
                                                </>
                                            )}
                                            {activeTab === 'support' && (
                                                <>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Sender</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Message</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Status</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Action</th>
                                                </>
                                            )}
                                            {activeTab === 'generations' && (
                                                <>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">User</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Prompt</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Mode</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Creation</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Timestamp</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50/50">
                                        {paginatedData.map((item) => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                {/* Payment Rows */}
                                                {activeTab === 'payments' && (
                                                    <>
                                                        <td className="p-6">
                                                            <div className="font-bold text-blue-950 text-sm tracking-tight">{item.userEmail || 'Unknown'}</div>
                                                            <div className="text-[9px] text-blue-900/30 font-black tracking-widest uppercase mt-1">{item.user_id?.slice(-8)}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.package === 'nude' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                                {item.package}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-black text-blue-950 text-sm">Rs {item.amount}</div>
                                                            <div className="text-[9px] text-green-600 uppercase tracking-widest font-bold mt-1">{item.method}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-[10px] font-bold text-blue-950/40 uppercase">{new Date(item.timestamp).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <a href={item.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest group-hover:underline">
                                                                View ↗
                                                            </a>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                                item.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                    'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                                                }`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            {item.status === 'pending' && (
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleAction(item.id, 'approve')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20">A</button>
                                                                    <button onClick={() => handleAction(item.id, 'reject')} className="px-4 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white">R</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </>
                                                )}

                                                {/* Users Rows */}
                                                {activeTab === 'users' && (
                                                    <>
                                                        <td className="p-6">
                                                            <div className="font-bold text-blue-950 text-sm">{item.email}</div>
                                                            <div className="text-[9px] text-blue-900/30 font-black tracking-widest uppercase mt-1">{item.id.slice(-8)}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.role === 'admin' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                                                                {item.role}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-black text-blue-950">{item.coins || 0}</span>
                                                                <button onClick={() => handleUpdateCoins(item.id, item.coins)} className="text-blue-400 hover:text-blue-600">✏️</button>
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-[10px] font-bold text-blue-950/40 uppercase">{new Date(item.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-[10px] font-bold text-blue-950/40 uppercase">{new Date(item.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => fetchUserProfile(item.id)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="View Profile">👁️</button>
                                                                {item.role === 'banned' ? (
                                                                    <button onClick={() => handleUserAction(item.id, 'unban')} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all" title='Unban User'>🔓</button>
                                                                ) : (
                                                                    <button onClick={() => handleUserAction(item.id, 'ban')} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all" title='Ban User'>🚫</button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}

                                                {/* Support Rows */}
                                                {activeTab === 'support' && (
                                                    <>
                                                        <td className="p-6">
                                                            <div className="font-bold text-blue-950 text-sm">{item.name}</div>
                                                            <div className="text-[9px] text-blue-900/40 font-bold">{item.email}</div>
                                                        </td>
                                                        <td className="p-6 w-1/3">
                                                            <div className="text-xs text-blue-950/80 line-clamp-2">{item.message}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            {item.status === 'pending' && (
                                                                <button onClick={() => handleTicketStatus(item.id, 'resolved')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700">Resolve</button>
                                                            )}
                                                        </td>
                                                    </>
                                                )}

                                                {/* Generations Rows */}
                                                {activeTab === 'generations' && (
                                                    <>
                                                        <td className="p-6">
                                                            <div className="font-bold text-blue-950 text-sm tracking-tight">{item.users?.email || 'Unknown'}</div>
                                                            <div className="text-[9px] text-blue-950/20 font-black tracking-widest uppercase mt-1">UID: {item.user_id?.slice(-8)}</div>
                                                        </td>
                                                        <td className="p-6 max-w-xs">
                                                            <div className="text-xs text-blue-950 line-clamp-2">{item.prompt}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                                                {item.mode}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 rounded-xl overflow-hidden border border-blue-100 hover:scale-110 transition-transform shadow-sm">
                                                                <img src={item.image_url} className="w-full h-full object-cover" alt="Gen" />
                                                            </a>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-[10px] font-bold text-blue-950/40 uppercase whitespace-nowrap">
                                                                {new Date(item.created_at || item.timestamp).toLocaleString()}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View (Cards) - Visible on Mobile */}
                            <div className="md:hidden p-4 space-y-4">
                                {paginatedData.map((item) => (
                                    <div key={item.id} className="bg-white p-5 rounded-3xl border border-blue-50 shadow-sm space-y-4">
                                        {/* Payment Cards */}
                                        {activeTab === 'payments' && (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-blue-950 text-sm">{item.userEmail}</h3>
                                                        <p className="text-[9px] text-blue-400 font-bold mt-1 uppercase tracking-wider">{item.method}</p>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-50 text-green-600 font-black text-[10px] rounded-lg">Rs {item.amount}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.package === 'nude' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {item.package}
                                                    </span>
                                                    <a href={item.proof_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Proof ↗</a>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    <button onClick={() => handleAction(item.id, 'approve')} className="py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">Approve</button>
                                                    <button onClick={() => handleAction(item.id, 'reject')} className="py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest">Reject</button>
                                                </div>
                                            </>
                                        )}

                                        {/* User Cards */}
                                        {activeTab === 'users' && (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-blue-950 text-sm break-all">{item.email}</h3>
                                                        <span className={`mt-2 inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.role === 'admin' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>{item.role}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-2xl">
                                                    <span className="text-[10px] font-bold text-blue-900/50 uppercase tracking-widest">Balance</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-blue-950">{item.coins} Coins</span>
                                                        <button onClick={() => handleUpdateCoins(item.id, item.coins)} className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-blue-600 shadow-sm">✏️</button>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Support Cards */}
                                        {activeTab === 'support' && (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-blue-950 text-sm">{item.name}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{item.status}</span>
                                                </div>
                                                <p className="text-xs text-blue-950/70">{item.email}</p>
                                                <div className="p-3 bg-blue-50/30 rounded-xl text-xs text-blue-950 leading-relaxed">
                                                    {item.message}
                                                </div>
                                                {item.status === 'pending' && (
                                                    <button onClick={() => handleTicketStatus(item.id, 'resolved')} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Mark Resolved</button>
                                                )}
                                            </>
                                        )}

                                        {/* Generation Cards */}
                                        {activeTab === 'generations' && (
                                            <>
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-blue-950 text-sm truncate">{item.users?.email}</h3>
                                                        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">{item.mode} Mode</p>
                                                    </div>
                                                    <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-blue-50 shadow-sm">
                                                        <img src={item.image_url} className="w-full h-full object-cover" alt="Gen" />
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-blue-50/30 rounded-xl text-xs text-blue-950 italic line-clamp-3">
                                                    "{item.prompt}"
                                                </div>
                                                <div className="flex justify-between items-center pt-2">
                                                    <span className="text-[9px] font-bold text-blue-950/20 uppercase tracking-widest">
                                                        {new Date(item.created_at || item.timestamp).toLocaleString()}
                                                    </span>
                                                    <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-black text-[10px] uppercase tracking-widest underline decoration-blue-200 underline-offset-4">Open ↗</a>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Gallery View - Grid of images */}
                            {activeTab === 'gallery' && (
                                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-slide-up">
                                    {(searchQuery ? filteredData : paginatedData).map((gen) => (
                                        <div key={gen.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-blue-50 shadow-sm bg-blue-50/20">
                                            <img
                                                src={gen.image_url}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt="Generation"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-x-0 top-0 p-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.preventDefault(); handleDeleteGeneration(gen.id); }}
                                                    className="w-8 h-8 bg-red-500/80 backdrop-blur-md text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                                    title="Delete Generation"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                                                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest truncate">{gen.users?.email}</p>
                                                <p className="text-[8px] font-black text-blue-400 uppercase mt-1 italic line-clamp-2">"{gen.prompt}"</p>
                                                <div className="pointer-events-auto">
                                                    <a href={gen.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block w-full py-2 bg-white/20 backdrop-blur-md rounded-lg text-center text-[8px] font-black text-white uppercase tracking-widest hover:bg-white hover:text-blue-950 transition-all">View Full</a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Analytics View */}
                            {activeTab === 'analytics' && growthStats && (
                                <div className="p-8 space-y-12 animate-slide-up">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* User Growth Chart */}
                                        <div className="bg-blue-50/30 p-8 rounded-[2rem] border border-blue-50 overflow-hidden">
                                            <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-8">User Growth (30 Days)</h3>
                                            <div className="overflow-x-auto pb-4 scrollbar-hide">
                                                <div className="flex items-end gap-1 h-48 min-w-[600px]">
                                                    {growthStats.users.map((count, i) => (
                                                        <div key={i} className="flex-1 bg-blue-600 rounded-t-lg transition-all hover:bg-blue-700 relative group" style={{ height: `${(count / Math.max(...growthStats.users, 1)) * 100}%` }}>
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-950 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                                                {count} Users
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-4 text-[8px] font-bold text-blue-900/30 uppercase">
                                                <span>30 Days Ago</span>
                                                <span className="md:hidden">← Swipe to view →</span>
                                                <span>Today</span>
                                            </div>
                                        </div>

                                        {/* Revenue Growth Chart */}
                                        <div className="bg-green-50/30 p-8 rounded-[2rem] border border-green-50 overflow-hidden">
                                            <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest mb-8">Revenue Trends (30 Days)</h3>
                                            <div className="overflow-x-auto pb-4 scrollbar-hide">
                                                <div className="flex items-end gap-1 h-48 min-w-[600px]">
                                                    {growthStats.revenue.map((amount, i) => (
                                                        <div key={i} className="flex-1 bg-green-600 rounded-t-lg transition-all hover:bg-green-700 relative group" style={{ height: `${(amount / Math.max(...growthStats.revenue, 1)) * 100}%` }}>
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-950 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                                                Rs {amount}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-4 text-[8px] font-bold text-green-900/30 uppercase">
                                                <span>30 Days Ago</span>
                                                <span className="md:hidden">← Swipe to view →</span>
                                                <span>Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Activity Widget */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">Live Activity</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Real-time system events</p>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live"></div>
                                        </div>

                                        <div className="space-y-4">
                                            {[...users.slice(0, 5).map(u => ({ type: 'signup', email: u.email, date: u.created_at })),
                                            ...payments.slice(0, 5).map(p => ({ type: 'payment', email: p.userEmail, amount: p.amount, date: p.timestamp }))]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl hover:bg-blue-50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${item.type === 'signup' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                                                {item.type === 'signup' ? '👤' : '💰'}
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-blue-950 uppercase tracking-tight">{item.email}</p>
                                                                <p className="text-[8px] font-bold text-blue-400 uppercase mt-0.5">
                                                                    {item.type === 'signup' ? 'Joined the platform' : `Purchased for Rs ${item.amount}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] font-black text-blue-900/20 uppercase whitespace-nowrap">
                                                            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Settings View */}
                            {activeTab === 'settings' && (
                                <div className="p-8 space-y-12 animate-slide-up max-w-4xl">
                                    {/* Broadcast Setting */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">📢</div>
                                            <div>
                                                <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">Site-wide Broadcast</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Push alerts to all users</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <textarea
                                                className="w-full p-6 bg-blue-50/30 rounded-3xl border border-blue-50 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none h-32"
                                                placeholder="Enter broadcast message..."
                                                value={settings.broadcast?.message || ''}
                                                onChange={(e) => setSettings({ ...settings, broadcast: { ...settings.broadcast, message: e.target.value } })}
                                            />
                                            <div className="flex items-center gap-6 px-4">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={settings.broadcast?.active || false}
                                                        onChange={(e) => setSettings({ ...settings, broadcast: { ...settings.broadcast, active: e.target.checked } })}
                                                    />
                                                    <div className={`w-12 h-6 rounded-full relative transition-all ${settings.broadcast?.active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.broadcast?.active ? 'left-7' : 'left-1'}`} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-blue-950 uppercase tracking-widest">Show Banner</span>
                                                </label>
                                                <button
                                                    onClick={() => updateSetting('broadcast', settings.broadcast)}
                                                    disabled={savingSettings}
                                                    className="ml-auto px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                                                >
                                                    {savingSettings ? 'Saving...' : 'Update Broadcast'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing Setting */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-xl">💰</div>
                                            <div>
                                                <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">Price Management</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Live Pricing Control (Rs)</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6">
                                            {['starter', 'pro', 'premium'].map(pkg => (
                                                <div key={pkg} className="space-y-2">
                                                    <label className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest ml-1">{pkg}</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 font-black text-blue-950 outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                                                        value={settings.pricing?.[pkg] || ''}
                                                        onChange={(e) => setSettings({ ...settings, pricing: { ...settings.pricing, [pkg]: parseInt(e.target.value) } })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => updateSetting('pricing', settings.pricing)}
                                                disabled={savingSettings}
                                                className="px-8 py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50"
                                            >
                                                {savingSettings ? 'Saving...' : 'Update Prices'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 py-8">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors"
                        >
                            ←
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-950/40">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>

            {/* Member Profile Modal */}
            {
                selectedUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/20 backdrop-blur-md animate-fade-in">
                        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up">
                            <div className="p-5 md:p-8 border-b border-blue-50 flex items-center justify-between bg-blue-50/30">
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-xl md:text-2xl text-white font-black">
                                        {selectedUser.profile.email[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-2xl font-black text-blue-950 tracking-tighter truncate">{selectedUser.profile.email}</h2>
                                        <p className="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">
                                            ID: {selectedUser.profile.id.slice(-8)} • Joined {new Date(selectedUser.profile.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-lg md:text-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm shrink-0 ml-2">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Current Balance</p>
                                        <p className="text-3xl font-black text-blue-950 tracking-tighter">{selectedUser.profile.coins} <span className="text-sm text-blue-400 uppercase">Coins</span></p>
                                    </div>
                                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Total Generations</p>
                                        <p className="text-3xl font-black text-blue-950 tracking-tighter">{selectedUser.generations.length}</p>
                                    </div>
                                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Status / Role</p>
                                        <span className="inline-block px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{selectedUser.profile.role}</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">Recent Generations</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {selectedUser.generations.map(gen => (
                                            <a key={gen.id} href={gen.image_url} target="_blank" rel="noopener noreferrer" className="aspect-[3/4] rounded-xl overflow-hidden border border-blue-50 hover:scale-105 transition-all shadow-sm">
                                                <img src={gen.image_url} className="w-full h-full object-cover" alt="Gen" />
                                            </a>
                                        ))}
                                        {selectedUser.generations.length === 0 && <p className="text-[10px] text-blue-900/30 font-bold col-span-full py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">No generations yet.</p>}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">Payment History</h3>
                                    <div className="space-y-2">
                                        {selectedUser.payments.map(pay => (
                                            <div key={pay.id} className="p-4 bg-white border border-blue-50 rounded-2xl flex items-center justify-between hover:bg-blue-50/30 transition-all">
                                                <div>
                                                    <p className="text-[10px] font-black text-blue-950 uppercase">{pay.package} Package</p>
                                                    <p className="text-[8px] font-bold text-blue-400 uppercase mt-1">{new Date(pay.timestamp).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-sm font-black text-blue-950">Rs {pay.amount}</p>
                                                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${pay.status === 'approved' ? 'bg-green-50 text-green-600' : pay.status === 'rejected' ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-600'}`}>
                                                        {pay.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedUser.payments.length === 0 && <p className="text-[10px] text-blue-900/30 font-bold py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">No payments found.</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-blue-50 bg-blue-50/10 flex flex-wrap justify-between gap-4">
                                <div className="flex gap-2">
                                    {selectedUser.profile.role === 'admin' ? (
                                        <button onClick={() => { handleUserAction(selectedUser.profile.id, 'demote'); setSelectedUser(null); }} className="px-6 py-3 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-600 hover:text-white transition-all">Demote to User</button>
                                    ) : (
                                        <button onClick={() => { handleUserAction(selectedUser.profile.id, 'promote'); setSelectedUser(null); }} className="px-6 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Promote to Admin</button>
                                    )}
                                </div>
                                <button onClick={() => setSelectedUser(null)} className="px-8 py-3 bg-gray-100 text-blue-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Close Profile</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/80 backdrop-blur-2xl border-t border-blue-50 px-6 py-4 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {[
                    { id: 'payments', icon: '💳', label: 'Pay' },
                    { id: 'users', icon: '👥', label: 'Users' },
                    { id: 'gallery', icon: '🖼️', label: 'Gallery' },
                    { id: 'analytics', icon: '📈', label: 'Stats' },
                    { id: 'settings', icon: '⚙️', label: 'Set' }
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-blue-600 scale-110' : 'text-blue-300'}`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
