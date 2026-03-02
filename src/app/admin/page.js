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
    const [apiKeys, setApiKeys] = useState([]);
    const [selectedApiKey, setSelectedApiKey] = useState(null);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [testingKey, setTestingKey] = useState(null);
    const [envKeysInfo, setEnvKeysInfo] = useState({ count: 0, details: [] });
    const [balances, setBalances] = useState({});
    const [fetchingBalances, setFetchingBalances] = useState(false);

    // Calculate total remaining images from API keys
    const totalImagesLeft = useMemo(() => {
        let finiteTotal = 0;
        let hasUnlimited = false;

        // 1. Check Environment Keys (Always treated as unlimited/unknown capacity)
        if (envKeysInfo?.count > 0) {
            hasUnlimited = true;
        }

        // 2. Check Database Keys
        if (apiKeys && apiKeys.length > 0) {
            // Only include active keys in capacity calculation (exclude restricted/rate_limited)
            const activeKeys = apiKeys.filter(k => k.status === 'active');

            for (const key of activeKeys) {
                // If we have live balance info, use it
                const balanceInfo = balances[key.id];
                if (balanceInfo && balanceInfo.success) {
                    finiteTotal += balanceInfo.images_left;
                } else if (key.total_limit === null) {
                    hasUnlimited = true;
                } else if (key.usage?.total?.remaining !== undefined && key.usage?.total?.remaining !== null) {
                    finiteTotal += key.usage.total.remaining;
                }
            }
        }

        // Format Output
        // If we have meaningful finite count, show it (with + if there are also unlimited keys)
        if (finiteTotal > 0) {
            return hasUnlimited ? `${finiteTotal}+` : finiteTotal;
        }

        // If no finite count but we have unlimited keys, show ∞
        if (hasUnlimited) {
            return '∞';
        }

        // Otherwise 0
        return 0;
    }, [apiKeys, envKeysInfo, balances]);

    // Calculate total balance from API keys
    const totalBalance = useMemo(() => {
        let total = 0;
        if (apiKeys && apiKeys.length > 0) {
            // Only include active keys as per user request ("only count active apis")
            const activeKeys = apiKeys.filter(k => k.status === 'active');
            for (const key of activeKeys) {
                const balanceInfo = balances[key.id];
                if (balanceInfo && balanceInfo.success) {
                    total += balanceInfo.balance;
                }
            }
        }
        return total;
    }, [apiKeys, balances]);

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

    const fetchApiKeys = async (signal) => {
        try {
            const res = await fetch('/api/admin/api-keys', { signal });
            const data = await res.json();
            if (data.success) {
                setApiKeys(data.keys);
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error("Failed to fetch API keys", e);
            showToast("Failed to fetch API keys", 'error');
        }
    };

    const fetchEnvKeysInfo = async (signal) => {
        try {
            const res = await fetch('/api/admin/api-keys/env-info', { signal });
            const data = await res.json();
            if (data.success) {
                setEnvKeysInfo({ count: data.env_keys_count, details: data.env_keys_details });
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error("Failed to fetch env keys info", e);
        }
    };

    const fetchBalances = async () => {
        setFetchingBalances(true);
        try {
            const res = await fetch('/api/admin/api-keys/balance');
            const data = await res.json();
            if (data.success) {
                const balanceMap = {};
                data.balances.forEach(b => {
                    balanceMap[b.id] = b;
                });
                setBalances(balanceMap);
                showToast("Balances updated successfully");
            } else {
                showToast("Failed to fetch balances", 'error');
            }
        } catch (e) {
            console.error("Failed to fetch balances", e);
            showToast("Failed to fetch balances", 'error');
        } finally {
            setFetchingBalances(false);
        }
    };

    const [savingApiKey, setSavingApiKey] = useState(false);

    // Coin Management State
    const [showCoinModal, setShowCoinModal] = useState(false);
    const [selectedUserForCoins, setSelectedUserForCoins] = useState(null);
    const [coinAmount, setCoinAmount] = useState('');
    const [isSubmittingCoins, setIsSubmittingCoins] = useState(false);
    const [isTestingAll, setIsTestingAll] = useState(false);
    const [testAllProgress, setTestAllProgress] = useState({ current: 0, total: 0 });

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
            fetchApiKeys(controller.signal);
            fetchEnvKeysInfo(controller.signal);
        }
        return () => controller.abort();
    }, [isAdmin, showAllPayments]);

    // Automatically fetch balances when api-keys tab is active or keys are loaded
    useEffect(() => {
        if (isAdmin && activeTab === 'api-keys' && apiKeys.length > 0) {
            const hasNoBalances = apiKeys.some(k => k.provider === 'deapi' && !balances[k.id]);
            if (hasNoBalances && !fetchingBalances) {
                console.log('[Admin] auto-fetching balances...');
                fetchBalances();
            }
        }
    }, [isAdmin, activeTab, apiKeys.length]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleUpdateCoins = (user) => {
        setSelectedUserForCoins(user);
        setCoinAmount('');
        setShowCoinModal(true);
    };

    const handleSubmitCoinUpdate = async (action) => {
        if (!coinAmount || isNaN(parseInt(coinAmount)) || parseInt(coinAmount) <= 0) {
            showToast("Please enter a valid positive number", 'error');
            return;
        }

        const amount = parseInt(coinAmount);
        const finalAmount = action === 'add' ? amount : -amount;

        setIsSubmittingCoins(true);
        try {
            const res = await fetch('/api/admin/users/update-coins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserForCoins.id, coinAmount: finalAmount })
            });

            const data = await res.json();
            if (data.success) {
                showToast(data.message, 'success');
                fetchUsers(); // Refresh list
                setShowCoinModal(false);
                setSelectedUserForCoins(null);
                setCoinAmount('');
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        } finally {
            setIsSubmittingCoins(false);
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

    const handleSaveApiKey = async () => {
        if (!selectedApiKey.provider || !selectedApiKey.key_name || !selectedApiKey.api_key) {
            showToast("Please fill in all required fields", 'error');
            return;
        }

        // Check for bulk input (comma or newline separated)
        const rawKeys = selectedApiKey.api_key.split(/[\n,]+/).map(k => k.trim()).filter(k => k.length > 0);

        if (rawKeys.length > 1) {
            // Bulk Save Mode
            setSavingApiKey(true);
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < rawKeys.length; i++) {
                const currentKey = rawKeys[i];
                try {
                    // Create individual payload for each key
                    const payload = {
                        ...selectedApiKey,
                        api_key: currentKey,
                        key_name: `${selectedApiKey.key_name} ${i + 1}` // Append index to name
                    };
                    delete payload.id; // Ensure new creation

                    const res = await fetch('/api/admin/api-keys', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) successCount++;
                    else errorCount++;
                } catch (e) {
                    errorCount++;
                }
            }

            setSavingApiKey(false);
            showToast(`Bulk add complete: ${successCount} saved, ${errorCount} failed`);
            fetchApiKeys();
            setShowApiKeyModal(false);
            setSelectedApiKey(null);
            return;
        }

        // Single Key Save Mode (Existing Logic)
        setSavingApiKey(true);
        try {
            const res = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedApiKey)
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchApiKeys();
                setShowApiKeyModal(false);
                setSelectedApiKey(null);
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        } finally {
            setSavingApiKey(false);
        }
    };

    const handleTestAllKeys = async () => {
        if (isTestingAll) return;
        const enabledKeys = apiKeys.filter(k => k.is_enabled !== false);
        if (enabledKeys.length === 0) {
            showToast("No enabled keys to test", 'error');
            return;
        }

        if (!confirm(`Are you sure you want to test all ${enabledKeys.length} enabled API keys?`)) return;

        setIsTestingAll(true);
        setTestAllProgress({ current: 0, total: enabledKeys.length });

        for (let i = 0; i < enabledKeys.length; i++) {
            const key = enabledKeys[i];
            setTestAllProgress(prev => ({ ...prev, current: i + 1 }));
            try {
                await fetch('/api/admin/api-keys/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: key.provider, api_key: key.api_key })
                });
            } catch (e) {
                console.error(`Testing key ${key.id} failed`, e);
            }
        }

        setIsTestingAll(false);
        showToast("Bulk testing complete!");
        fetchApiKeys();
    };

    const handleDeleteApiKey = async (keyId) => {
        if (!confirm("Are you sure you want to delete this API key?")) return;

        try {
            const res = await fetch('/api/admin/api-keys', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: keyId })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchApiKeys();
            } else {
                showToast("Error: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Network error", 'error');
        }
    };

    const handleTestApiKey = async (provider, apiKey) => {
        // If bulk input, test only the first key
        const firstKey = apiKey.split(/[\n,]+/).map(k => k.trim()).find(k => k.length > 0);

        if (!firstKey) {
            showToast("Please enter an API key", 'error');
            return;
        }

        const isBulk = apiKey.includes('\n') || apiKey.includes(',');

        setTestingKey(apiKey); // Keep original for loading state match
        try {
            if (isBulk) showToast("Testing first key from list...");

            const res = await fetch('/api/admin/api-keys/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, api_key: firstKey })
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
            } else {
                showToast(data.message || data.error, 'error');
            }
        } catch (e) {
            showToast("Test failed: " + e.message, 'error');
        } finally {
            setTestingKey(null);
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
        } else if (activeTab === 'generations' || activeTab === 'gallery') {
            data = generations.filter(g =>
                (g.users?.email && g.users.email.toLowerCase().includes(query)) ||
                (g.prompt && g.prompt.toLowerCase().includes(query)) ||
                (g.mode && g.mode.toLowerCase().includes(query))
            );
        } else if (activeTab === 'api-keys') {
            data = apiKeys.filter(k =>
                (k.key_name && k.key_name.toLowerCase().includes(query)) ||
                (k.provider && k.provider.toLowerCase().includes(query)) ||
                (k.status && k.status.toLowerCase().includes(query))
            );
        }
        return data;
    }, [activeTab, payments, users, tickets, generations, apiKeys, searchQuery]);

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
        <div className="min-h-screen bg-[#fafbfc] pt-24 pb-28 md:pb-20 px-4 md:px-8 max-w-[1600px] mx-auto selection:bg-blue-100 selection:text-blue-900">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] grayscale invert z-0">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                    <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
                    <p className="font-bold text-sm tracking-wide">{toast.message}</p>
                </div>
            )}
            <div className="relative z-10 space-y-8 animate-slide-up">
                {/* Mobile Floating Header */}
                <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-blue-50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-black">AI</div>
                        <h1 className="text-lg font-black text-blue-950 tracking-tight">Admin <span className="text-blue-600">Pro</span></h1>
                    </div>
                    <button onClick={() => router.push('/')} className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">🏠</button>
                </div>

                {/* Header Section */}
                <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 pb-8 border-b border-blue-50 pt-12 md:pt-0">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-500 rounded-full border border-red-100 w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">System Status: Active</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-blue-950">Dashboard</h1>
                        <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">Administrative Control Center</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                        {[
                            { label: 'Revenue', value: stats?.totalVolume || 0, icon: '💰', color: 'bg-green-500', trend: '+12%', sub: 'Total Volume' },
                            { label: 'Users', value: stats?.totalUsers || 0, icon: '👥', color: 'bg-blue-600', trend: '+5%', sub: 'Global Growth' },
                            { label: 'Creations', value: generations.length, icon: '🎨', color: 'bg-purple-600', trend: '+24%', sub: 'Total Assets' },
                            { label: 'Pending', value: payments.length, icon: '⏳', color: 'bg-yellow-500', trend: '!', sub: 'Needs Review' },
                            { label: 'Capacity', value: totalImagesLeft, icon: '⚡', color: 'bg-indigo-600', trend: 'MAX', sub: 'Images Left' }
                        ].map((stat, i) => (
                            <div key={i} className="group relative p-6 bg-white border border-blue-50 rounded-[2.5rem] flex flex-col justify-between hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/[0.03] transition-all duration-500 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-100/50 transition-all duration-700"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-10 h-10 ${stat.color} rounded-2xl flex items-center justify-center text-white text-lg shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-500`}>
                                            {stat.icon}
                                        </div>
                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${stat.trend === '!' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                            {stat.trend}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em]">{stat.label}</p>
                                        <h3 className="text-3xl font-black text-blue-950 tracking-tighter">
                                            {stat.label === 'Revenue' ? `Rs ${stat.value}` : stat.value}
                                        </h3>
                                        <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">{stat.sub}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                        {['payments', 'users', 'generations', 'gallery', 'analytics', 'api-keys', 'settings', 'support'].map((tab) => (
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
                                {tab === 'api-keys' && `API Keys (${apiKeys.length}) 🔑`}
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
                    {/* API Keys Overview Section */}
                    {activeTab === 'api-keys' && (
                        <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 border-b border-blue-100">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-blue-950 uppercase tracking-widest">🔑 API Keys Management</h2>
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">DeAPI Cost: $0.035 per image (Image-to-Image / img2img)</p>
                                </div>
                                {isTestingAll && (
                                    <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-xl animate-pulse">
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Testing: {testAllProgress.current}/{testAllProgress.total}</span>
                                    </div>
                                )}
                            </div>

                            {/* Health Warning Banner */}
                            {apiKeys.length > 0 && (apiKeys.filter(k => k.status === 'active').length / apiKeys.length) < 0.5 && (
                                <div className="bg-red-500 text-white p-4 rounded-3xl flex items-center justify-between shadow-xl shadow-red-500/20 animate-bounce-subtle">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl">🚨</div>
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest">Low Key Health Detected</div>
                                            <div className="text-[10px] opacity-80 font-bold">More than 50% of your keys are Restricted or Frozen. Generation may fail.</div>
                                        </div>
                                    </div>
                                    <button onClick={handleTestAllKeys} className="px-5 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">Re-Test All 🧪</button>
                                </div>
                            )}

                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                                    <div className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Total Keys</div>
                                    <div className="text-3xl font-black text-blue-950">{apiKeys.length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                                    <div className="text-[10px] font-black text-green-900/40 uppercase tracking-widest mb-2">Active Keys</div>
                                    <div className="text-3xl font-black text-green-600">{apiKeys.filter(k => k.status === 'active').length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-yellow-100 shadow-sm">
                                    <div className="text-[10px] font-black text-yellow-900/40 uppercase tracking-widest mb-2">Restricted</div>
                                    <div className="text-3xl font-black text-yellow-600">{apiKeys.filter(k => k.status === 'rate_limited').length}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
                                    <div className="text-[10px] font-black text-purple-900/40 uppercase tracking-widest mb-2">Total Balance</div>
                                    <div className="text-3xl font-black text-purple-600">${totalBalance.toFixed(2)}</div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                                    <div className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2">Images Capacity</div>
                                    <div className="text-3xl font-black text-blue-600">{totalImagesLeft}</div>
                                </div>
                            </div>

                            {/* Environment Keys Info */}
                            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">📋 Environment Variables (.env.local)</h3>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase">Fallback Source</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2">DEAPI_API_KEYS</div>
                                        <div className="font-mono text-sm text-blue-950 bg-blue-50 p-3 rounded-xl">
                                            {(process.env.DEAPI_API_KEYS || process.env.DEAPI_API_KEY || "Not set").split(',').length} key(s) in environment
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-blue-600 font-bold">
                                        💡 Database keys take priority. If no database keys exist, system will use .env keys as fallback.
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => { setSelectedApiKey({ provider: 'deapi', key_name: '', api_key: '', daily_limit: null, total_limit: null, is_enabled: true }); setShowApiKeyModal(true); }}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                                >
                                    ➕ Add New Key
                                </button>
                                <button
                                    onClick={handleTestAllKeys}
                                    disabled={isTestingAll}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                                >
                                    🧪 Test All Keys
                                </button>
                                <button
                                    onClick={() => fetchBalances()}
                                    disabled={fetchingBalances}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                                >
                                    {fetchingBalances ? '⌛ Fetching...' : '💰 Refresh Balances'}
                                </button>
                                <button
                                    onClick={() => fetchApiKeys()}
                                    className="px-6 py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all"
                                >
                                    🔄 Refresh List
                                </button>
                            </div>
                        </div>
                    )}

                    {paginatedData.length === 0 && !['settings', 'analytics'].includes(activeTab) ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-4xl opacity-50 grayscale animate-pulse">
                                {activeTab === 'payments' ? '✅' : activeTab === 'users' ? '👥' : activeTab === 'api-keys' ? '🔑' : '📬'}
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-950 opacity-40">
                                    {activeTab === 'api-keys' ? 'No API Keys Found' : 'No Data Found'}
                                </p>
                                <p className="text-[10px] text-blue-950/20 font-bold uppercase tracking-widest">
                                    {activeTab === 'api-keys' ? 'Add your first key using the button above' : 'Try adjusting your search filters.'}
                                </p>
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
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">IP Address</th>
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
                                            {activeTab === 'api-keys' && (
                                                <>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Provider</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Key Name</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Status</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Balance</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Images Left</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Daily Usage</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Total Requests</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Lifetime Value</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40">Last Used</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-blue-950/40 text-right">Actions</th>
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
                                                                <button onClick={() => handleUpdateCoins(item)} className="text-blue-400 hover:text-blue-600">✏️</button>
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-bold text-blue-950">{item.ip_address || '---'}</span>
                                                                {item.ip_address && users.filter(u => u.ip_address === item.ip_address).length > 1 && (
                                                                    <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter mt-0.5">⚠️ Duplicate IP</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-[10px] font-bold text-blue-950/40 uppercase">{new Date(item.created_at).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => fetchUserProfile(item.id)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="View Profile">👁️</button>
                                                                {item.package === 'banned' ? (
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

                                                {/* API Keys Rows */}
                                                {activeTab === 'api-keys' && (
                                                    <>
                                                        <td className="p-6">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.provider === 'deapi' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                                {item.provider}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-bold text-blue-950 text-sm tracking-tight">{item.key_name}</div>
                                                            <div className="text-[9px] text-blue-900/30 font-black tracking-widest uppercase mt-1">...{item.api_key.slice(-8)}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span
                                                                title={item.last_error}
                                                                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest cursor-help ${item.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                                    item.status === 'invalid' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' : // Frozen look
                                                                        item.status === 'rate_limited' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                            'bg-gray-50 text-gray-600 border border-gray-100'
                                                                    }`}>
                                                                {item.status === 'rate_limited' ? 'RESTRICTED ⚠️' :
                                                                    item.status === 'invalid' ? 'FROZEN ❄️' :
                                                                        item.status === 'active' ? 'ACTIVE ✅' : item.status}
                                                                {item.last_error && <span className="ml-1 opacity-50">ⓘ</span>}
                                                            </span>
                                                            {item.updated_at && (
                                                                <div className={`text-[8px] font-bold uppercase tracking-widest mt-1.5 ${item.status === 'rate_limited' ? 'text-amber-600/70' :
                                                                    item.status === 'invalid' ? 'text-cyan-600/70' : 'text-green-600/40'
                                                                    }`}>
                                                                    {item.status === 'rate_limited' ? 'Since ' : 'Updated '}
                                                                    {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-black text-purple-600 text-sm">
                                                                {balances[item.id]?.success ? `$${balances[item.id].balance.toFixed(2)}` : (item.provider === 'deapi' ? '---' : 'N/A')}
                                                            </div>
                                                            {balances[item.id]?.success && <div className="text-[8px] text-purple-400 font-bold uppercase tracking-tight">Current Credit</div>}
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-black text-blue-600 text-sm">
                                                                {balances[item.id]?.success ? `≈${balances[item.id].images_left}` : (item.provider === 'deapi' ? '---' : 'N/A')}
                                                            </div>
                                                            {balances[item.id]?.success && <div className="text-[8px] text-blue-400 font-bold uppercase tracking-tight">Est. Images</div>}
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 bg-blue-50 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                                        style={{ width: item.daily_limit ? `${Math.min(100, (item.usage.today.requests / item.daily_limit) * 100)}%` : '0%' }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-black text-blue-950 whitespace-nowrap">
                                                                    {item.usage.today.requests}/{item.daily_limit || '∞'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 bg-purple-50 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                                                        style={{ width: item.total_limit ? `${Math.min(100, (item.usage.total.requests / item.total_limit) * 100)}%` : '0%' }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-black text-blue-950 whitespace-nowrap">
                                                                    {item.usage.total.requests}/{item.total_limit || '∞'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-black text-emerald-600 text-sm">
                                                                ${(item.usage.total.requests * (settings.deapi_cost_per_image || 0.035)).toFixed(2)}
                                                            </div>
                                                            <div className="text-[8px] text-emerald-400 font-bold uppercase tracking-tight">Est. Burned</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-[10px] font-bold text-blue-950/40 uppercase">
                                                                {item.last_used_at ? new Date(item.last_used_at).toLocaleDateString() : 'Never'}
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleTestApiKey(item.provider, item.api_key)}
                                                                    disabled={testingKey === item.api_key}
                                                                    className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                                                                    title="Test Key"
                                                                >
                                                                    {testingKey === item.api_key ? '⏳' : '🧪'}
                                                                </button>
                                                                <button
                                                                    onClick={() => { setSelectedApiKey(item); setShowApiKeyModal(true); }}
                                                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                                                    title="Edit Key"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteApiKey(item.id)}
                                                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                                                    title="Delete Key"
                                                                >
                                                                    🗑️
                                                                </button>
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
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-blue-950 text-sm break-all">{item.userEmail}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">{item.method}</p>
                                                            <span className="text-[8px] text-blue-950/30 font-bold">• {new Date(item.timestamp).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-50 text-green-600 font-black text-[10px] rounded-lg shrink-0">Rs {item.amount}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.package === 'nude' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {item.package}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.status === 'approved' ? 'bg-green-50 text-green-600' :
                                                        item.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                                            'bg-yellow-50 text-yellow-600'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                    <a href={item.proof_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Proof ↗</a>
                                                </div>
                                                {item.status === 'pending' && (
                                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                                        <button onClick={() => handleAction(item.id, 'approve')} className="py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">✓ Approve</button>
                                                        <button onClick={() => handleAction(item.id, 'reject')} className="py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">✕ Reject</button>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* User Cards */}
                                        {activeTab === 'users' && (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-blue-950 text-sm break-all">{item.email}</h3>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.role === 'admin' ? 'bg-red-50 text-red-500' : item.package === 'banned' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>{item.role === 'admin' ? 'ADMIN' : item.package === 'banned' ? 'BANNED' : 'USER'}</span>
                                                            <span className="text-[8px] text-blue-400 font-bold">Joined {new Date(item.created_at).toLocaleDateString()}</span>
                                                            {item.ip_address && (
                                                                <div className="mt-1 flex items-center gap-1.5">
                                                                    <span className="text-[8px] font-black text-blue-950/40 uppercase tracking-widest">IP: {item.ip_address}</span>
                                                                    {users.filter(u => u.ip_address === item.ip_address).length > 1 && (
                                                                        <span className="text-[7px] font-black bg-red-50 text-red-500 px-1.5 py-0.5 rounded uppercase">DUP</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-2xl">
                                                    <span className="text-[10px] font-bold text-blue-900/50 uppercase tracking-widest">Balance</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-blue-950">{item.coins || 0} Coins</span>
                                                        <button onClick={() => handleUpdateCoins(item)} className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-blue-600 shadow-sm">✏️</button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 pt-3">
                                                    <button
                                                        onClick={() => fetchUserProfile(item.id)}
                                                        className="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                    >
                                                        👁️ View Profile
                                                    </button>
                                                    {item.package === 'banned' ? (
                                                        <button
                                                            onClick={() => handleUserAction(item.id, 'unban')}
                                                            className="py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                        >
                                                            🔓 Unban
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUserAction(item.id, 'ban')}
                                                            className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                        >
                                                            🚫 Ban User
                                                        </button>
                                                    )}
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
                                                <div className="text-[9px] font-bold text-blue-950/20 uppercase tracking-widest">
                                                    {new Date(item.created_at || item.timestamp).toLocaleString()}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 pt-2">
                                                    <a
                                                        href={item.image_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                    >
                                                        📂 Open Full
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteGeneration(item.id)}
                                                        className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {/* API Keys Cards */}
                                        {activeTab === 'api-keys' && (
                                            <>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-blue-950 text-sm">{item.key_name}</h3>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${item.provider === 'deapi' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{item.provider}</span>
                                                            <span className="text-[8px] text-blue-400 font-bold">...{item.api_key.slice(-8)}</span>
                                                        </div>
                                                    </div>
                                                    <span
                                                        title={item.last_error}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-help ${item.status === 'active' ? 'bg-green-50 text-green-600' :
                                                            item.status === 'invalid' ? 'bg-cyan-50 text-cyan-600' :
                                                                item.status === 'rate_limited' ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-gray-50 text-gray-600'
                                                            }`}>
                                                        {item.status === 'rate_limited' ? 'RESTRICTED ⚠️' :
                                                            item.status === 'invalid' ? 'FROZEN ❄️' :
                                                                item.status === 'active' ? 'ACTIVE ✅' : item.status}
                                                        {item.last_error && <span className="ml-1 opacity-50">ⓘ</span>}
                                                    </span>
                                                    {item.updated_at && (
                                                        <div className={`text-[8px] font-bold uppercase tracking-widest mt-1.5 ${item.status === 'rate_limited' ? 'text-amber-600/70' :
                                                            item.status === 'invalid' ? 'text-cyan-600/70' : 'text-green-600/40'
                                                            }`}>
                                                            {item.status === 'rate_limited' ? 'Since ' : 'Updated '}
                                                            {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-bold text-blue-950/30 uppercase tracking-widest mb-3">
                                                    Added: {new Date(item.created_at).toLocaleString()}
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="bg-blue-50/50 p-3 rounded-2xl">
                                                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-2">
                                                            <span className="text-blue-900/50">Daily Usage</span>
                                                            <span className="text-blue-950">{item.usage.today.requests}/{item.daily_limit || '∞'}</span>
                                                        </div>
                                                        <div className="bg-blue-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                                style={{ width: item.daily_limit ? `${Math.min(100, (item.usage.today.requests / item.daily_limit) * 100)}%` : '0%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="bg-purple-50/50 p-3 rounded-2xl">
                                                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest mb-2">
                                                            <span className="text-purple-900/50">Total Usage</span>
                                                            <span className="text-blue-950">{item.usage.total.requests}/{item.total_limit || '∞'}</span>
                                                        </div>
                                                        <div className="bg-purple-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                                                                style={{ width: item.total_limit ? `${Math.min(100, (item.usage.total.requests / item.total_limit) * 100)}%` : '0%' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* New Analytics for Mobile */}
                                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                                        <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/30">
                                                            <p className="text-[8px] font-black text-blue-900/40 uppercase tracking-widest mb-1">Live Credit</p>
                                                            <p className="text-xs font-black text-purple-600">
                                                                {balances[item.id]?.success ? `$${balances[item.id].balance.toFixed(2)}` : (item.provider === 'deapi' ? '---' : 'N/A')}
                                                            </p>
                                                        </div>
                                                        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/30">
                                                            <p className="text-[8px] font-black text-emerald-900/40 uppercase tracking-widest mb-1">Lifetime Cost</p>
                                                            <p className="text-xs font-black text-emerald-600">
                                                                ${(item.usage.total.requests * (settings?.deapi_cost_per_image ?? 0.035)).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-bold text-blue-950/30 uppercase tracking-widest">
                                                    Last Used: {item.last_used_at ? new Date(item.last_used_at).toLocaleDateString() : 'Never'}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 pt-2">
                                                    <button
                                                        onClick={() => handleTestApiKey(item.provider, item.api_key)}
                                                        disabled={testingKey === item.api_key}
                                                        className="py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                                                    >
                                                        {testingKey === item.api_key ? '⏳' : '🧪 Test'}
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedApiKey(item); setShowApiKeyModal(true); }}
                                                        className="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteApiKey(item.id)}
                                                        className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                                                    >
                                                        🗑️
                                                    </button>
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
                                <div className="p-4 md:p-8 space-y-12 animate-slide-up">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* User Growth Chart */}
                                        <div className="bg-blue-50/20 p-6 md:p-8 rounded-[2.5rem] border border-blue-50/50 overflow-hidden relative group">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">User Base Growth</h3>
                                                    <p className="text-[10px] font-bold text-blue-400 uppercase mt-1">Last 30 Days</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-blue-950">{Math.max(...growthStats.users)}</div>
                                                    <div className="text-[8px] font-bold text-green-500 uppercase">Peak Users</div>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto pb-4 scrollbar-hide">
                                                <div className="flex items-end gap-1.5 h-48 min-w-[500px]">
                                                    {growthStats.users.map((count, i) => (
                                                        <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl transition-all duration-500 hover:scale-x-110 hover:brightness-110 relative group/bar" style={{ height: `${(count / Math.max(...growthStats.users, 1)) * 100}%` }}>
                                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-950 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                                                                {count} Users
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-4 text-[9px] font-black text-blue-900/20 uppercase tracking-widest border-t border-blue-50 pt-4">
                                                <span>30D Ago</span>
                                                <span className="md:hidden flex items-center gap-2 animate-pulse">← SWIPE TO VIEW →</span>
                                                <span>Today</span>
                                            </div>
                                        </div>

                                        {/* Revenue Growth Chart */}
                                        <div className="bg-green-50/20 p-6 md:p-8 rounded-[2.5rem] border border-green-50/50 overflow-hidden relative group">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-sm font-black text-blue-950 uppercase tracking-widest">Revenue Lifecycle</h3>
                                                    <p className="text-[10px] font-bold text-green-600 uppercase mt-1">30 Day Performance</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-blue-950">Rs {growthStats.revenue.reduce((a, b) => a + b, 0)}</div>
                                                    <div className="text-[8px] font-bold text-green-500 uppercase">Total Period</div>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto pb-4 scrollbar-hide">
                                                <div className="flex items-end gap-1.5 h-48 min-w-[500px]">
                                                    {growthStats.revenue.map((amount, i) => (
                                                        <div key={i} className="flex-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-xl transition-all duration-500 hover:scale-x-110 hover:brightness-110 relative group/bar" style={{ height: `${(amount / Math.max(...growthStats.revenue, 1)) * 100}%` }}>
                                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-950 text-white text-[9px] font-black px-3 py-1.5 rounded-xl opacity-0 group-hover/bar:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
                                                                Rs {amount}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-4 text-[9px] font-black text-green-900/20 uppercase tracking-widest border-t border-green-50 pt-4">
                                                <span>30D Ago</span>
                                                <span className="md:hidden flex items-center gap-2 animate-pulse">← SWIPE TO VIEW →</span>
                                                <span>Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Activity Widget */}
                                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-blue-100/50 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="relative z-10 flex items-center justify-between mb-10">
                                            <div>
                                                <h3 className="text-sm font-black text-blue-950 uppercase tracking-[0.2em]">Quantum Feed</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Live System Telemetry</p>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></div>
                                                <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">LIVE</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {[...users.slice(0, 5).map(u => ({ type: 'signup', email: u.email, date: u.created_at })),
                                            ...payments.slice(0, 5).map(p => ({ type: 'payment', email: p.userEmail, amount: p.amount, date: p.timestamp }))]
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between p-5 bg-blue-50/10 hover:bg-blue-50/40 border border-transparent hover:border-blue-50 rounded-[1.5rem] transition-all duration-300 group/item">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm group-hover/item:scale-110 transition-transform duration-500 ${item.type === 'signup' ? 'bg-indigo-50 text-indigo-500' : 'bg-green-50 text-green-600'}`}>
                                                                {item.type === 'signup' ? '⚡' : '💎'}
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-blue-950 uppercase tracking-tight">{item.email}</p>
                                                                <p className="text-[9px] font-bold text-blue-400/60 uppercase mt-0.5 tracking-wider">
                                                                    {item.type === 'signup' ? 'New Member Registered' : `Credit Purchase: Rs ${item.amount}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-blue-900/20 uppercase whitespace-nowrap bg-white px-2 py-1 rounded-lg">
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
                                <div className="p-4 md:p-8 space-y-12 animate-slide-up max-w-4xl">
                                    {/* Broadcast Setting */}
                                    <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-blue-100/50 shadow-sm space-y-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-blue-100 transition-all duration-1000"></div>
                                        <div className="relative z-10 flex items-center gap-6">
                                            <div className="w-16 h-16 bg-blue-600 shadow-xl shadow-blue-600/20 text-white rounded-[1.5rem] flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform duration-500">📢</div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-black text-blue-950 uppercase tracking-widest">Global Broadcast</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Notify all active sessions</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 space-y-6">
                                            <div className="relative">
                                                <textarea
                                                    className="w-full p-8 bg-blue-50/20 rounded-[2rem] border-2 border-transparent focus:border-blue-600/10 focus:bg-white text-sm font-bold text-blue-950 placeholder-blue-900/20 outline-none transition-all resize-none h-40 shadow-inner"
                                                    placeholder="Type your system message here..."
                                                    value={settings.broadcast?.message || ''}
                                                    onChange={(e) => setSettings({ ...settings, broadcast: { ...settings.broadcast, message: e.target.value } })}
                                                />
                                            </div>
                                            <div className="flex flex-col sm:flex-row items-center gap-6 bg-blue-50/30 p-4 rounded-[2rem] border border-blue-50">
                                                <label className="flex items-center gap-4 cursor-pointer group/toggle w-full sm:w-auto px-4">
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={settings.broadcast?.active || false}
                                                        onChange={(e) => setSettings({ ...settings, broadcast: { ...settings.broadcast, active: e.target.checked } })}
                                                    />
                                                    <div className={`w-14 h-7 rounded-full relative transition-all duration-500 ${settings.broadcast?.active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-sm ${settings.broadcast?.active ? 'left-8' : 'left-1'}`} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-blue-950 uppercase tracking-widest">Live Status</span>
                                                </label>
                                                <button
                                                    onClick={() => updateSetting('broadcast', settings.broadcast)}
                                                    disabled={savingSettings}
                                                    className="w-full sm:ml-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/40 transition-all disabled:opacity-50 active:scale-95"
                                                >
                                                    {savingSettings ? 'Saving...' : 'Deploy Message 🚀'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing Setting */}
                                    <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-blue-100/50 shadow-sm space-y-10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-50/50 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-green-100 transition-all duration-1000"></div>
                                        <div className="relative z-10 flex items-center gap-6">
                                            <div className="w-16 h-16 bg-green-600 shadow-xl shadow-green-600/20 text-white rounded-[1.5rem] flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform duration-500">💎</div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-black text-blue-950 uppercase tracking-widest">Revenue Config</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Real-time package valuation</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                {['starter', 'pro', 'premium'].map(pkg => (
                                                    <div key={pkg} className="group/input p-4 bg-gray-50/50 border border-gray-100 rounded-[2rem] hover:bg-white hover:border-green-500/20 transition-all">
                                                        <label className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.2em] ml-4 mb-2 block">{pkg}</label>
                                                        <div className="flex items-center">
                                                            <span className="text-lg font-black text-blue-950/20 ml-4 mr-2">Rs</span>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-transparent p-2 md:p-4 font-black text-2xl text-blue-950 outline-none"
                                                                value={settings.pricing?.[pkg] || ''}
                                                                onChange={(e) => setSettings({ ...settings, pricing: { ...settings.pricing, [pkg]: parseInt(e.target.value) || 0 } })}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => updateSetting('pricing', settings.pricing)}
                                                    disabled={savingSettings}
                                                    className="w-full sm:w-auto px-12 py-5 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-green-700 hover:shadow-2xl hover:shadow-green-600/40 transition-all disabled:opacity-50 active:scale-95"
                                                >
                                                    {savingSettings ? 'Syncing...' : 'Update Valuation'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DeAPI Valuation Card */}
                                    <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-blue-100/50 shadow-sm space-y-10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-100 transition-all duration-1000"></div>
                                        <div className="relative z-10 flex items-center gap-6">
                                            <div className="w-16 h-16 bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white rounded-[1.5rem] flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform duration-500">💰</div>
                                            <div className="space-y-1">
                                                <h3 className="text-base font-black text-blue-950 uppercase tracking-widest">System Valuation</h3>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">API burn rate calculation</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest block ml-2">DeAPI Cost Per Image (USD)</label>
                                                    <div className="relative group/input">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-300 font-black">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            className="w-full p-6 pl-12 bg-blue-50/20 rounded-[1.5rem] border-2 border-transparent focus:border-blue-600/10 focus:bg-white text-sm font-black text-blue-950 outline-none transition-all shadow-inner"
                                                            value={settings.deapi_cost_per_image || 0.035}
                                                            onChange={(e) => setSettings({ ...settings, deapi_cost_per_image: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-blue-400/60 font-medium px-2 leading-relaxed">
                                                        💡 This factor determines the "Estimated Images Left" and "Lifetime Burn" across all merchant keys.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => updateSetting('deapi_cost_per_image', settings.deapi_cost_per_image)}
                                                    disabled={savingSettings}
                                                    className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-600/40 transition-all disabled:opacity-50 active:scale-95"
                                                >
                                                    {savingSettings ? 'Syncing...' : 'Save Cost Profile'}
                                                </button>
                                            </div>
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

            {/* Coin Management Modal */}
            {
                showCoinModal && selectedUserForCoins && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/20 backdrop-blur-md animate-fade-in">
                        <div className="bg-white w-full max-w-md flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-blue-50">
                            <div className="p-6 border-b border-blue-50 flex items-center justify-between bg-blue-50/30">
                                <h2 className="text-xl font-black text-blue-950 tracking-tighter">Manage Coins</h2>
                                <button onClick={() => setShowCoinModal(false)} className="w-10 h-10 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-lg hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="bg-blue-50/50 p-4 rounded-2xl text-center space-y-2">
                                    <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">Selected User</p>
                                    <p className="text-sm font-bold text-blue-950">{selectedUserForCoins.email}</p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-100 shadow-sm mt-2">
                                        <span className="text-lg">💎</span>
                                        <span className="text-sm font-black text-blue-950">{selectedUserForCoins.coins || 0} Coins</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2 block">Amount to Change</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={coinAmount}
                                        onChange={(e) => setCoinAmount(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-2xl font-black text-center text-blue-950 outline-none transition-all placeholder-gray-300"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <button
                                        onClick={() => handleSubmitCoinUpdate('remove')}
                                        disabled={isSubmittingCoins || !coinAmount}
                                        className="py-4 bg-red-50 text-red-500 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center gap-1"
                                    >
                                        <span className="text-lg">Of Subtract</span>
                                        <span>Remove Coins</span>
                                    </button>
                                    <button
                                        onClick={() => handleSubmitCoinUpdate('add')}
                                        disabled={isSubmittingCoins || !coinAmount}
                                        className="py-4 bg-green-50 text-green-600 border border-green-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-green-600/20 transition-all disabled:opacity-50 active:scale-95 flex flex-col items-center gap-1"
                                    >
                                        <span className="text-lg">On Add</span>
                                        <span>Add Coins</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* API Key Add/Edit Modal */}
            {
                showApiKeyModal && selectedApiKey && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/20 backdrop-blur-md animate-fade-in">
                        <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
                            <div className="p-6 border-b border-blue-50 flex items-center justify-between bg-blue-50/30 flex-shrink-0">
                                <h2 className="text-xl font-black text-blue-950 tracking-tighter">
                                    {selectedApiKey.id ? 'Edit API Key' : 'Add New API Key'}
                                </h2>
                                <button onClick={() => { setShowApiKeyModal(false); setSelectedApiKey(null); }} className="w-10 h-10 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-lg hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                                {/* Provider */}
                                <div>
                                    <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2 block">Provider</label>
                                    <select
                                        className="w-full p-4 bg-blue-50/50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-sm font-bold text-blue-950 outline-none transition-all"
                                        value={selectedApiKey.provider}
                                        onChange={(e) => setSelectedApiKey({ ...selectedApiKey, provider: e.target.value })}
                                    >
                                        <option value="deapi">DeAPI</option>
                                        <option value="gradio">Gradio</option>
                                    </select>
                                </div>

                                {/* Key Name */}
                                <div>
                                    <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2 block">Key Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-blue-50/50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-sm font-bold text-blue-950 placeholder-blue-900/20 outline-none transition-all"
                                        placeholder="e.g., DeAPI Key 1"
                                        value={selectedApiKey.key_name}
                                        onChange={(e) => setSelectedApiKey({ ...selectedApiKey, key_name: e.target.value })}
                                    />
                                </div>

                                {/* API Key */}
                                <div>
                                    <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2 block">API Key</label>
                                    <div className="relative group">
                                        <textarea
                                            className="w-full p-4 pr-32 bg-blue-50/50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-sm font-black text-blue-950 placeholder-blue-900/20 outline-none transition-all font-mono tracking-tight resize-y min-h-[100px]"
                                            placeholder="Paste your API key(s) here. Separate multiple keys with commas or new lines."
                                            value={selectedApiKey.api_key}
                                            onChange={(e) => setSelectedApiKey({ ...selectedApiKey, api_key: e.target.value })}
                                        />
                                        <div className="absolute right-2 top-2 flex flex-col gap-1">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        const text = await navigator.clipboard.readText();
                                                        setSelectedApiKey({ ...selectedApiKey, api_key: text });
                                                        showToast("Pasted from clipboard!");
                                                    } catch (err) {
                                                        showToast("Failed to paste", "error");
                                                    }
                                                }}
                                                className="px-3 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 border border-blue-100 transition-all shadow-sm"
                                                title="Paste from Clipboard"
                                            >
                                                📋 Paste
                                            </button>
                                            {selectedApiKey.api_key && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleTestApiKey(selectedApiKey.provider, selectedApiKey.api_key)}
                                                    disabled={testingKey === selectedApiKey.api_key}
                                                    className={`px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${testingKey === selectedApiKey.api_key ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-600 hover:text-white'}`}
                                                    title="Test Validity"
                                                >
                                                    {testingKey === selectedApiKey.api_key ? '⏳...' : '🧪 Test'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-blue-400 font-bold mt-2 ml-2">
                                        {selectedApiKey.provider === 'deapi' ? '💡 Enter valid DeAPI key(s) (e.g. 1234|abc...). Multiple keys allowed!' : '💡 Enter your provider API key'}
                                    </p>
                                </div>

                                {/* Limits Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Daily Limit */}
                                    <div>
                                        <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2 block">Daily Limit</label>
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-blue-50/50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-sm font-bold text-blue-950 placeholder-blue-900/20 outline-none transition-all"
                                            placeholder="Unlimited"
                                            value={selectedApiKey.daily_limit || ''}
                                            onChange={(e) => setSelectedApiKey({ ...selectedApiKey, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                                        />
                                    </div>

                                    {/* Total Limit */}
                                    <div>
                                        <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-2 block">Total Limit</label>
                                        <input
                                            type="number"
                                            className="w-full p-4 bg-blue-50/50 border-2 border-transparent focus:border-blue-600/10 focus:bg-white rounded-2xl text-sm font-bold text-blue-950 placeholder-blue-900/20 outline-none transition-all"
                                            placeholder="Unlimited"
                                            value={selectedApiKey.total_limit || ''}
                                            onChange={(e) => setSelectedApiKey({ ...selectedApiKey, total_limit: e.target.value ? parseInt(e.target.value) : null })}
                                        />
                                    </div>
                                </div>

                                {/* Enabled Toggle */}
                                <div className="flex items-center justify-between bg-blue-50/30 p-4 rounded-2xl">
                                    <span className="text-sm font-black text-blue-950 uppercase tracking-widest">Enabled</span>
                                    <label className="flex items-center gap-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedApiKey.is_enabled || false}
                                            onChange={(e) => setSelectedApiKey({ ...selectedApiKey, is_enabled: e.target.checked })}
                                        />
                                        <div className={`w-12 h-6 rounded-full relative transition-all ${selectedApiKey.is_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedApiKey.is_enabled ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="p-6 border-t border-blue-50 bg-blue-50/10 flex justify-end gap-3 flex-shrink-0">
                                <button
                                    onClick={() => { setShowApiKeyModal(false); setSelectedApiKey(null); }}
                                    className="px-8 py-3 bg-gray-100 text-blue-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveApiKey}
                                    disabled={savingApiKey}
                                    className={`px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 ${savingApiKey ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {savingApiKey ? 'Saving...' : (selectedApiKey.id ? 'Update Key' : 'Add Key')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

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
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">Coin Breakdown</h3>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[8px] font-black uppercase">Paid: {selectedUser.stats.breakdown.paid}</span>
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase">Ref: {selectedUser.stats.breakdown.referral}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Paid', value: selectedUser.stats.breakdown.paid, icon: '💰', color: 'text-green-600', bg: 'bg-green-50' },
                                            { label: 'Referral', value: selectedUser.stats.breakdown.referral, icon: '🤝', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                            { label: 'Bonus', value: selectedUser.stats.breakdown.bonus, icon: '🎁', color: 'text-purple-600', bg: 'bg-purple-50' },
                                            { label: 'Manual', value: selectedUser.stats.breakdown.manual, icon: '⚙️', color: 'text-amber-600', bg: 'bg-amber-50' }
                                        ].map((item, idx) => (
                                            <div key={idx} className={`p-4 rounded-2xl border border-blue-50 ${item.bg} flex flex-col items-center justify-center text-center shadow-sm`}>
                                                <span className="text-xl mb-1">{item.icon}</span>
                                                <p className="text-[8px] font-black text-blue-900/40 uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                                            </div>
                                        ))}
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

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">Referral Network</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Referrer */}
                                        <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-3xl relative overflow-hidden group">
                                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-3">Referred By</p>
                                            {selectedUser.stats.referrer ? (
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                                                        {selectedUser.stats.referrer.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-blue-950 truncate">{selectedUser.stats.referrer.email}</p>
                                                        <button
                                                            onClick={() => fetchUserProfile(selectedUser.stats.referrer.id)}
                                                            className="text-[9px] font-black text-blue-600 uppercase hover:underline mt-1"
                                                        >
                                                            View Referrer Profile ↗
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-4 text-center">
                                                    <p className="text-[10px] text-blue-900/30 font-bold italic">No Referrer (Direct Signup)</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Referrals (Direct tree) */}
                                        <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-3xl relative overflow-hidden group">
                                            <p className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest mb-3">Direct Referrals ({selectedUser.stats.referrals.length})</p>
                                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {selectedUser.stats.referrals.map(ref => (
                                                    <div key={ref.id} className="flex items-center justify-between p-3 bg-white border border-blue-50 rounded-xl hover:border-blue-200 transition-all shadow-sm">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-blue-950 truncate">{ref.email}</p>
                                                            <p className="text-[8px] font-black text-blue-400 uppercase mt-0.5">Joined {new Date(ref.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => fetchUserProfile(ref.id)}
                                                            className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                            title="View Profile"
                                                        >
                                                            👁️
                                                        </button>
                                                    </div>
                                                ))}
                                                {selectedUser.stats.referrals.length === 0 && (
                                                    <p className="text-[10px] text-blue-900/30 font-bold italic py-6 text-center">No referrals yet.</p>
                                                )}
                                            </div>
                                        </div>
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
            {/* Mobile Bottom Navigation - Scrollable to show all tabs */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-[90] bg-white/80 backdrop-blur-2xl border border-blue-50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-2 animate-slide-up">
                <div className="overflow-x-auto scrollbar-hide px-2 py-2">
                    <div className="flex gap-2 min-w-max px-2">
                        {[
                            { id: 'payments', icon: '💳', label: 'Cash', count: payments.length },
                            { id: 'users', icon: '👥', label: 'Users', count: users.length },
                            { id: 'generations', icon: '📝', label: 'Logs', count: generations.length },
                            { id: 'gallery', icon: '🖼️', label: 'Gallery' },
                            { id: 'analytics', icon: '📈', label: 'Stats' },
                            { id: 'api-keys', icon: '🔑', label: 'Keys', count: apiKeys.length },
                            { id: 'support', icon: '💬', label: 'Tickets', count: tickets.filter(t => t.status === 'pending').length },
                            { id: 'settings', icon: '⚙️', label: 'Setup' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`relative flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl transition-all duration-500 min-w-[75px] ${activeTab === item.id
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105 -translate-y-1'
                                    : 'text-blue-400 hover:bg-blue-50'
                                    }`}
                            >
                                <span className={`text-xl ${activeTab === item.id ? 'animate-bounce' : ''}`}>{item.icon}</span>
                                <span className="text-[7px] font-black uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                                {item.count !== undefined && item.count > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[8px] font-black flex items-center justify-center border-2 border-white ${activeTab === item.id
                                        ? 'bg-white text-blue-600'
                                        : 'bg-red-500 text-white animate-pulse'
                                        }`}>
                                        {item.count > 99 ? '99+' : item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div >
    );
}
