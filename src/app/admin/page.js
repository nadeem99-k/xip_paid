'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalVolume: 0 });
    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('payments');

    useEffect(() => {
        const init = async () => {
            await Promise.all([
                fetchPayments(),
                fetchUsers(),
                fetchTickets()
            ]);
            setLoading(false);
        };
        init();
    }, [session]);

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
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (e) {
            console.error("Failed to fetch users");
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
        }
    };

    const handleUpdateCoins = async (userId, currentCoins) => {
        const amount = prompt("Enter amount to add (e.g., 10) or remove (e.g., -5):", "10");
        if (amount === null) return;
        const coinAmount = parseInt(amount);
        if (isNaN(coinAmount)) return alert("Please enter a valid number");

        try {
            const res = await fetch('/api/admin/users/update-coins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, coinAmount })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchUsers(); // Refresh list
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Network error");
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
                alert("Ticket status updated");
                fetchTickets();
            }
        } catch (e) {
            alert("Update error");
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
                alert(data.message);
                fetchPayments(); // Refresh list
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Network error");
        }
    };

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace('/login?callbackUrl=/admin');
        }
    }, [status, router]);

    if (status === "loading") return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!session || session?.user?.role !== 'admin') {
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
        <div className="min-h-screen bg-white pt-32 pb-20 px-6">
            <div className="max-w-7xl mx-auto space-y-12 animate-slide-up">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-blue-50">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full border border-red-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">Admin Control</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-blue-950">Payment <span className="text-blue-600">Verification</span></h1>
                        <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">Processing manual approvals for Neural Access</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 min-w-[140px]">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-1">Total Revenue</p>
                            <p className="text-2xl font-black text-blue-950 tracking-tighter">Rs {stats?.totalVolume || 0}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 min-w-[140px]">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-1">Total Users</p>
                            <p className="text-2xl font-black text-blue-950 tracking-tighter">{stats?.totalUsers || 0}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 min-w-[140px]">
                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-1">Pending Orders</p>
                            <p className="text-2xl font-black text-blue-950 tracking-tighter">{payments.length}</p>
                        </div>
                    </div>
                </header>

                <div className="flex gap-4 border-b border-blue-50">
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-blue-900/30 hover:text-blue-950'}`}
                    >
                        Pending Payments ({payments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-blue-900/30 hover:text-blue-950'}`}
                    >
                        User Directory ({users.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('support')}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'support' ? 'border-blue-600 text-blue-600' : 'border-transparent text-blue-900/30 hover:text-blue-950'}`}
                    >
                        Support Tickets ({tickets.filter(t => t.status === 'pending').length})
                    </button>
                </div>

                <div className="bg-white border border-blue-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-950/[0.02]">
                    {activeTab === 'payments' ? (
                        payments.length === 0 ? (
                            <div className="p-32 text-center space-y-6">
                                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-4xl opacity-50 grayscale">✅</div>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-950 opacity-40">Queue Cleared</p>
                                    <p className="text-[10px] text-blue-950/20 font-bold uppercase tracking-widest">No pending orders found in the central repository.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-blue-50/50 border-b border-blue-50">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Identity</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Module</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Value</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Gateway</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Timestamp</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Proof</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50/50">
                                        {payments.map(p => (
                                            <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="p-6">
                                                    <div className="font-bold text-blue-950 text-sm tracking-tight">{p.userEmail || 'Unknown'}</div>
                                                    <div className="text-[9px] text-blue-900/30 font-black tracking-widest uppercase mt-1">{p.user_id?.slice(-8)}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.package === 'nude' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                        {p.package}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="font-black text-blue-950 text-sm">Rs {p.amount}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{p.method}</span>
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-[10px] font-bold text-blue-950/40 uppercase">{new Date(p.timestamp).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-6">
                                                    <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                        Open Document ↗
                                                    </a>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAction(p.id, 'approve')}
                                                            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/10"
                                                        >
                                                            Finalize
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(p.id, 'reject')}
                                                            className="px-5 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                                        >
                                                            Discard
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : activeTab === 'users' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-blue-50/50 border-b border-blue-50">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">User Identity</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Role</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Active Pack</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Coin Balance</th>
                                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Registered</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-50/50">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-6">
                                                <div className="font-bold text-blue-950 text-sm">{u.email}</div>
                                                <div className="text-[9px] text-blue-900/30 font-black tracking-widest uppercase mt-1">{u.id.slice(-12)}</div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[10px] font-bold text-blue-950/60 uppercase">{u.package || 'None'}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">🪙</span>
                                                        <span className="font-black text-blue-950">{u.coins || 0}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpdateCoins(u.id, u.coins)}
                                                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[10px] font-bold text-blue-950/40 uppercase">{new Date(u.created_at).toLocaleDateString()}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'support' ? (
                        tickets.length === 0 ? (
                            <div className="p-32 text-center space-y-6">
                                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-4xl opacity-50 grayscale">📬</div>
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-950 opacity-40">Inbox Empty</p>
                                    <p className="text-[10px] text-blue-950/20 font-bold uppercase tracking-widest">No active support requests found.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-blue-50/50 border-b border-blue-50">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Sender</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Message</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Status</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50/50">
                                        {tickets.map(t => (
                                            <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="p-6">
                                                    <div className="font-bold text-blue-950 text-sm">{t.name}</div>
                                                    <div className="text-[10px] text-blue-900/40 font-bold">{t.email}</div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-xs text-blue-950/80 max-w-md line-clamp-2">{t.message}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${t.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {t.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleTicketStatus(t.id, 'resolved')}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                        >
                                                            Resolve
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}
