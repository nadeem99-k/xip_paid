'use client';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const { user, isLoading } = useUser();
    const router = useRouter();
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalVolume: 0 });
    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('payments');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([
                fetchPayments(),
                fetchUsers(),
                fetchTickets()
            ]);
            setLoading(false);
        };
        if (user && user.role === 'admin') {
            init();
        }
    }, [user]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const fetchPayments = async () => {
        try {
            const res = await fetch('/api/admin/payments');
            const data = await res.json();
            if (data.success) {
                setPayments(data.payments);
                setStats(data.stats);
            }
        } catch (e) {
            console.error("Failed to fetch payments");
            showToast("Failed to fetch payments", 'error');
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            }
            // Ensure stats are updated if they come from users endpoint too, or keep existing
        } catch (e) {
            console.error("Failed to fetch users");
            showToast("Failed to fetch users", 'error');
        }
    };

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/admin/support');
            const data = await res.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (e) {
            console.error("Failed to fetch tickets");
            showToast("Failed to fetch tickets", 'error');
        }
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
        }
        return data;
    }, [activeTab, payments, users, tickets, searchQuery]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // Reset page on tab/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);


    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'admin')) {
            // router.replace('/login?callbackUrl=/admin'); 
            // Better to show access denied or redirect home if logged in but not admin
        }
    }, [isLoading, user, router]);

    if (isLoading || loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-6 bg-white px-6">
                <div className="text-6xl animate-bounce">⚠️</div>
                <h1 className="text-3xl font-black text-blue-950">Access <span className="text-red-500">Denied</span></h1>
                <p className="text-blue-900/40 font-bold uppercase tracking-widest text-[10px]">Restricted Administrative Zone</p>
                <button onClick={() => router.push('/')} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">Back to Safety</button>
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

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full xl:w-auto">
                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Total Revenue</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">Rs {stats?.totalVolume || 0}</p>
                                <span className="text-2xl">💰</span>
                            </div>
                        </div>
                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Total Users</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">{stats?.totalUsers || 0}</p>
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col justify-between hover:bg-blue-50 transition-colors">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Pending Orders</p>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl font-black text-blue-950 tracking-tighter">{payments.length}</p>
                                <span className="text-2xl">⏳</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Controls Section */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center sticky top-20 z-30 bg-white/80 backdrop-blur-xl p-4 -mx-4 rounded-3xl border border-blue-50/50 shadow-sm">
                    {/* Use overflow-x-auto for scrollable tabs on small screens */}
                    <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
                        {['payments', 'users', 'support'].map((tab) => (
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
                                {tab === 'support' && `Support (${tickets.filter(t => t.status === 'pending').length})`}
                            </button>
                        ))}
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
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Actions</th>
                                                </>
                                            )}
                                            {activeTab === 'users' && (
                                                <>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">User</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Role</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Coins</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Joined</th>
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
                                                        <td className="p-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handleAction(item.id, 'approve')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20">A</button>
                                                                <button onClick={() => handleAction(item.id, 'reject')} className="px-4 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white">R</button>
                                                            </div>
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
                                    </div>
                                ))}
                            </div>
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
        </div>
    );
}
