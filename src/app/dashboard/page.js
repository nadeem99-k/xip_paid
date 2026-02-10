'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    // UI State
    const [prompt, setPrompt] = useState('');
    const [inputImage, setInputImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState('');
    const [activeTab, setActiveTab] = useState('studio');
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [user, setUser] = useState(null);
    const [userPayments, setUserPayments] = useState([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);
    const [selectedMode, setSelectedMode] = useState('bikini');
    const [provider, setProvider] = useState('deapi');
    const [selectedModel, setSelectedModel] = useState('Flux_2_Klein_4B_BF16');
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [paymentProof, setPaymentProof] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState({ type: null, text: null });

    const COIN_PACKS = [
        {
            id: '3_coins',
            name: 'Starter Pack',
            coins: 3,
            price: 50,
            icon: '🪙',
            description: 'Perfect to start your journey.',
            features: ['3 High Quality Credits', 'Bikini Mode (1.5 Images)', 'Nude Mode (0.5 Images)', 'Standard Speed']
        },
        {
            id: '9_coins',
            name: 'Pro Pack',
            coins: 9,
            price: 100,
            originalPrice: 150,
            icon: '💎',
            description: 'Most popular for regular users.',
            features: ['9 Premium Credits', 'Bikini Mode (4.5 Images)', 'Nude Mode (1.5 Images)', 'Priority Queue']
        },
        {
            id: '21_coins',
            name: 'Elite Pack',
            coins: 21,
            price: 300,
            icon: '🔥',
            description: 'Best value for creators.',
            features: ['21 Elite Credits', 'Bikini Mode (10.5 Images)', 'Nude Mode (3.5 Images)', 'Ultra Fast Speed']
        }
    ];

    const PAYMENT_INFO = {
        easypaisa: "03422168420",
        title: "Rashed Ali",
    };

    const NAME_MAP = {
        providers: {
            gradio: "Standard Slow",
            pollinations: "Rapid Fire",
            deapi: "Power Pro"
        },
        models: {
            "Flux_2_Klein_4B_BF16": "Neural Flux v2.0",
            "Flux_2_Einstein_BF16": "Einstein Gen 3"
        }
    };

    const getCleanName = (type, key) => {
        if (!key) return "Neural Core";
        return NAME_MAP[type][key] || key;
    };

    useEffect(() => {
        if (inputImage) {
            const url = URL.createObjectURL(inputImage);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [inputImage]);

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        } else if (activeTab === 'payments') {
            fetchUserPayments();
        }
    }, [activeTab]);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                update({
                    coins: data.user.coins
                });
            }
        } catch (err) {
            console.error("Fetch user error:", err);
        }
    };

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            if (data.success) {
                setHistory(data.history);
            }
        } catch (err) {
            console.error("Fetch history error:", err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const fetchUserPayments = async () => {
        setIsLoadingPayments(true);
        try {
            const res = await fetch('/api/user/payments');
            const data = await res.json();
            if (data.success) {
                setUserPayments(data.payments);
            }
        } catch (err) {
            console.error("Fetch payments error:", err);
        } finally {
            setIsLoadingPayments(false);
        }
    };

    const handleDelete = async (imageId) => {
        if (!confirm("Are you sure you want to delete this visual log?")) return;
        try {
            const res = await fetch(`/api/history?id=${imageId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setHistory(prev => prev.filter(img => img.id !== imageId));
            } else {
                alert("Deletion failed: " + data.error);
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const handlePaymentUpload = async (e) => {
        e.preventDefault();
        const pack = COIN_PACKS.find(p => p.id === selectedPackage);
        if (!paymentProof || !pack) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('proof', paymentProof);
        formData.append('amount', pack.price);
        formData.append('method', 'easypaisa');
        formData.append('package', `${pack.coins} Coins`);
        if (inputImage) {
            formData.append('source', inputImage);
        }

        try {
            const res = await fetch('/api/payment/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setPaymentMessage({
                    type: 'success',
                    text: "Payment details successfully submitted! Please allow some time for admin verification."
                });
                setSelectedPackage(null);
                setPaymentProof(null);

                // Clear success message after 8 seconds
                setTimeout(() => setPaymentMessage({ type: null, text: null }), 8000);
            } else {
                setPaymentMessage({ type: 'error', text: "Upload failed: " + data.error });
            }
        } catch (err) {
            setPaymentMessage({ type: 'error', text: "An error occurred during upload. Please try again." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (url, filename = 'xip-pro-render.png') => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed:", err);
            window.open(url, '_blank');
        }
    };

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace('/login?callbackUrl=/dashboard');
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session && status !== "loading") {
        return (
            <div className="pt-32 pb-20 px-6 text-center space-y-8 animate-slide-up bg-white min-h-screen">
                <div className="text-6xl">👤</div>
                <h1 className="text-4xl font-black text-blue-950">Session <span className="text-blue-600">Expired</span></h1>
                <p className="text-blue-900/50 font-bold uppercase tracking-widest text-[10px]">Please sign in again to access your creator studio.</p>
                <Link href="/login" className="inline-block px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg">Sign In</Link>
            </div>
        );
    }

    // Removal of Access Restricted gateway as per user request
    // All authenticated users can now access XIP AI Studio layout

    const handleGenerate = async (e) => {
        if (e) e.preventDefault();

        // Check for sufficient coins
        const cost = selectedMode === 'nude' ? 6 : 2;
        if ((user?.coins || 0) < cost) {
            alert(`Insufficient credits. ${selectedMode === 'nude' ? 'Nude' : 'Bikini'} mode requires ${cost} coins. Redirecting to plans...`);
            router.push('/pricing');
            return;
        }

        if (!inputImage) {
            setGenError("Please upload a source image.");
            return;
        }
        setGenError("");
        setIsGenerating(true);
        setGeneratedImages([]);

        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("image", inputImage);
        formData.append("mode", selectedMode);
        formData.append("provider", provider);
        formData.append("model", selectedModel);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedImages(data.images);
                // Update coins locally
                if (user) {
                    setUser({ ...user, coins: data.remainingCoins });
                }
                // Update navbar session coins
                update({ coins: data.remainingCoins });

                // Optimistically add to history state
                const newGen = {
                    id: data.generationId || Date.now(),
                    image_url: data.images[0],
                    prompt: prompt || "Visual transformation",
                    mode: selectedMode,
                    provider: provider,
                    model: selectedModel,
                    timestamp: new Date().toISOString()
                };
                setHistory(prev => [newGen, ...prev]);

                // No redirection - User stays on Studio to see result
            } else {
                setGenError(data.error || "Generation failed.");
            }
        } catch (err) {
            setGenError("Network sync failure. Please retry.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen flex text-blue-950 pt-20 bg-white">
            {/* Dashboard Navigation (Responsive) */}
            {/* Desktop Sidebar */}
            <aside className="w-80 bg-white border-r border-blue-50 p-10 hidden lg:flex flex-col fixed h-[calc(100vh-80px)] top-20 left-0">
                <div className="space-y-12 flex-1">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30 ml-4">Workspace</h3>
                        <nav className="space-y-2">
                            <div className="px-4 space-y-1">
                                <button onClick={() => setActiveTab('studio')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'studio' ? 'bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.15)]' : 'text-blue-900/50 hover:text-blue-600 hover:bg-blue-50'}`}>
                                    <span className="text-xl">✨</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em]">Studio</span>
                                </button>
                                <button onClick={() => setActiveTab('history')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.15)]' : 'text-blue-900/50 hover:text-blue-600 hover:bg-blue-50'}`}>
                                    <span className="text-xl">🕰️</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em]">History</span>
                                </button>
                                <button onClick={() => setActiveTab('billing')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'billing' ? 'bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.15)]' : 'text-blue-900/50 hover:text-blue-600 hover:bg-blue-50'}`}>
                                    <span className="text-xl">💳</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em]">Billing</span>
                                </button>
                                <button onClick={() => setActiveTab('payments')} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'payments' ? 'bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.15)]' : 'text-blue-900/50 hover:text-blue-600 hover:bg-blue-50'}`}>
                                    <span className="text-xl">💸</span>
                                    <span className="text-[10px] uppercase tracking-[0.2em]">Payments</span>
                                </button>
                            </div>
                        </nav>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30 ml-4">Account</h3>
                        <div className="p-4 border-t border-blue-50">
                            <div className="p-6 rounded-3xl border border-blue-100 bg-blue-50/30 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black">
                                        {(session?.user?.name?.[0] || session?.user?.email?.[0] || 'U').toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-blue-950 text-sm font-bold tracking-tight line-clamp-1">{session?.user?.name}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">Elite Account</p>
                                    </div>
                                </div>
                                <div className="h-[2px] bg-blue-100 rounded-full overflow-hidden">
                                    <div className="h-full w-[85%] bg-blue-600"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-10 border-t border-blue-50 flex justify-between items-center text-[10px] font-black text-blue-900/20 uppercase tracking-widest">
                    <span>CORE 2.0.4</span>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-50 z-50 flex items-center justify-around p-2 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => setActiveTab('studio')}
                    className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'studio' ? 'text-blue-600' : 'text-blue-900/30'}`}
                >
                    <span className="text-xl">✨</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Studio</span>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'history' ? 'text-blue-600' : 'text-blue-900/30'}`}
                >
                    <span className="text-xl">🕰️</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Logs</span>
                </button>
                <button
                    onClick={() => setActiveTab('billing')}
                    className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'billing' ? 'text-blue-600' : 'text-blue-900/30'}`}
                >
                    <span className="text-xl">💳</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Refill</span>
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'payments' ? 'text-blue-600' : 'text-blue-900/30'}`}
                >
                    <span className="text-xl">💸</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">Vault</span>
                </button>
            </nav>

            {/* Main Stage */}
            <main className="flex-1 lg:ml-80 p-6 md:p-16 pb-32 lg:pb-16">
                <div className="max-w-6xl mx-auto space-y-16 animate-slide-up">
                    {activeTab === 'studio' ? (
                        <div className="space-y-16">
                            <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 pb-12 border-b border-blue-50">
                                <div className="space-y-2">
                                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-blue-950">AI Synthesis <span className="text-blue-600">Studio</span></h1>
                                    <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">Identity-Preserving Generative Engine</p>
                                </div>
                                <div className="flex items-center gap-5 bg-blue-50/50 p-2 pr-8 rounded-2xl border border-blue-100">
                                    <div className="px-4 py-2 bg-yellow-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20">🪙 {user?.coins || 0} Coins</div>
                                    <span className="text-xs font-black uppercase tracking-widest text-blue-950">{user?.package || session?.user?.package || 'Starter'} Plan</span>
                                </div>
                            </header>

                            <div className="grid lg:grid-cols-11 gap-8 md:gap-16">
                                {/* Left Side: Controls */}
                                <div className="lg:col-span-5 space-y-12">
                                    {/* Buy Coins Info */}
                                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pricing Offer</p>
                                            <p className="text-xs font-bold text-blue-950">3 Coins for RS 50</p>
                                        </div>
                                        <Link href="/pricing" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Buy Now</Link>
                                    </div>

                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30 ml-1">1. AI Synthesis Core</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setProvider('gradio')}
                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${provider === 'gradio' ? 'border-blue-600 bg-blue-50/50' : 'border-blue-50 bg-white hover:border-blue-200'}`}
                                            >
                                                <span className="text-xl">🦾</span>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-950">{NAME_MAP.providers.gradio}</p>
                                                    <p className="text-[8px] font-bold text-blue-600">Stable Node</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setProvider('deapi')}
                                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${provider === 'deapi' ? 'border-blue-600 bg-blue-50/50' : 'border-blue-50 bg-white hover:border-blue-200'}`}
                                            >
                                                <span className="text-xl">💎</span>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-950">{NAME_MAP.providers.deapi}</p>
                                                    <p className="text-[8px] font-bold text-blue-600">High Precision</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {provider === 'deapi' && (
                                        <div className="space-y-4 animate-fade-in-down">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30 ml-1">2. Advanced Neural Engine</label>
                                            <select
                                                value={selectedModel}
                                                onChange={(e) => setSelectedModel(e.target.value)}
                                                className="w-full p-4 bg-white border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-blue-600 focus:outline-none transition-all cursor-pointer"
                                            >
                                                <option value="Flux_2_Klein_4B_BF16">{NAME_MAP.models.Flux_2_Klein_4B_BF16}</option>
                                                <option value="Flux_2_Einstein_BF16">{NAME_MAP.models.Flux_2_Einstein_BF16 || "Quantum Render v3"}</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30 ml-1">{provider === 'deapi' ? '3' : '2'}. Generation Mode</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setSelectedMode('bikini')}
                                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${selectedMode === 'bikini' ? 'border-blue-600 bg-blue-50/50' : 'border-blue-50 bg-white hover:border-blue-200'}`}
                                            >
                                                <span className="text-2xl">👙</span>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-950">Bikini Mode</p>
                                                    <p className="text-[9px] font-bold text-blue-600">2 Coins</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setSelectedMode('nude')}
                                                disabled={(user?.coins || 0) < 6}
                                                className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${(user?.coins || 0) < 6 ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' : selectedMode === 'nude' ? 'border-blue-600 bg-blue-50/50' : 'border-blue-50 bg-white hover:border-blue-200'}`}
                                            >
                                                <span className="text-2xl">🔞</span>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-950">Nude Mode</p>
                                                    <p className="text-[9px] font-bold text-blue-600">6 Coins</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30">{provider === 'deapi' ? '4' : '3'}. Source Reference</label>
                                            {previewUrl && <button onClick={() => setInputImage(null)} className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:opacity-70 transition-colors">Reset</button>}
                                        </div>
                                        <div className={`relative group aspect-[3/4] rounded-[3rem] border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden ${previewUrl ? 'border-blue-200 bg-blue-50/30' : 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                                            {previewUrl ? (
                                                <img src={previewUrl} className="w-full h-full object-cover animate-fade-in" alt="Source" />
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-6">
                                                    <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-4xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 text-blue-600">🖼️</div>
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-950">Select Base Identity</p>
                                                        <p className="text-[10px] text-blue-900/30 font-bold uppercase tracking-widest leading-relaxed">Ensure the face is clearly visible for optimal synthesis.</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => {
                                                            if ((user?.coins || 0) === 0) {
                                                                alert("You have 0 coins. Redirecting to plans to recharge...");
                                                                router.push('/pricing');
                                                                return;
                                                            }
                                                            setInputImage(e.target.files[0]);
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        accept="image/*"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6 text-left">
                                        <div className="flex items-center gap-3 ml-1">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30">{provider === 'deapi' ? '5' : '4'}. Synthesis Modifiers</label>
                                            <img src="/logo.png" alt="XIP AI" className="h-4 w-auto opacity-30" />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] group-focus-within:opacity-[0.05] transition-opacity">
                                                <img src="/logo.png" alt="" className="w-1/2 grayscale" />
                                            </div>
                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                className="w-full h-40 bg-white/50 backdrop-blur-sm border border-blue-100 rounded-[2.5rem] p-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all shadow-sm resize-none placeholder:text-blue-950/20 font-serif italic text-blue-950 relative z-10"
                                                placeholder="Enter bespoke instructions for the AI..."
                                            ></textarea>
                                            <div className="absolute bottom-6 right-8 text-[9px] font-black text-blue-950/20 uppercase tracking-widest z-20">
                                                Tokens: {prompt.length}/500
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !inputImage}
                                        className="group relative w-full h-20 bg-blue-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-30 overflow-hidden shadow-2xl shadow-blue-600/10"
                                    >
                                        <span className="relative z-10">{isGenerating ? "Synthesizing Identity..." : "Initiate Transformation"}</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1500ms]"></div>
                                    </button>

                                    {genError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-shake">{genError}</p>}
                                </div>

                                {/* Right Side: Display */}
                                <div className="lg:col-span-6 space-y-12">
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-900/30 ml-1">{provider === 'deapi' ? '6' : '5'}. Neural Render Output</label>
                                        <div className="aspect-[3/4] glass rounded-[3rem] border-blue-100 flex items-center justify-center relative overflow-hidden group shadow-2xl shadow-blue-900/[0.03]">
                                            {isGenerating ? (
                                                <div className="text-center space-y-10 z-10 px-12">
                                                    <div className="relative w-40 h-40 mx-auto">
                                                        <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
                                                        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                        <div className="absolute -inset-4 border border-blue-100 rounded-full animate-pulse"></div>
                                                        <div className="absolute inset-0 flex items-center justify-center font-black text-3xl text-blue-600 tracking-tighter">AI</div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <p className="text-sm font-black uppercase tracking-[0.5em] text-blue-600 animate-pulse">Running Neural Synthesis</p>
                                                        <p className="text-[10px] text-blue-950/30 font-bold uppercase tracking-widest leading-relaxed">Cross-referencing weights via decentralized studio nodes...</p>
                                                    </div>
                                                </div>
                                            ) : generatedImages.length > 0 ? (
                                                <>
                                                    <img src={generatedImages[0]} className="w-full h-full object-cover animate-fade-in" alt="Result" />
                                                    <div className="absolute inset-x-12 bottom-12 flex gap-4 translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700 ease-out">
                                                        <button
                                                            onClick={() => handleDownload(generatedImages[0])}
                                                            className="flex-1 h-20 bg-blue-600 text-white rounded-3xl font-black text-xs flex items-center justify-center uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-blue-600/20"
                                                        >
                                                            Download Masterpiece
                                                        </button>
                                                        <button onClick={() => setGeneratedImages([])} className="w-20 h-20 bg-red-50 border border-red-100 text-red-500 rounded-3xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/10">🗑️</button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-16 space-y-8">
                                                    <img
                                                        src="https://images.unsplash.com/photo-1614728263952-84ea256f9479?auto=format&fit=crop&q=80&w=1000"
                                                        className="absolute inset-0 w-full h-full object-cover opacity-5 grayscale group-hover:opacity-10 transition-opacity duration-1000"
                                                        alt="Awaiting"
                                                    />
                                                    <div className="relative z-10 space-y-6 opacity-40 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110">
                                                        <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-5xl group-hover:rotate-12 transition-transform shadow-lg shadow-blue-950/5 text-blue-600">✨</div>
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-950">Neural Manifestation</p>
                                                            <p className="text-[10px] text-blue-950/30 font-bold uppercase tracking-widest leading-relaxed">Synthesis node idle. Awaiting configuration signal.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-8 glass rounded-[2.5rem] border-blue-100 space-y-4 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-950/20">Latency</h4>
                                            <div className="text-2xl font-black tracking-tighter text-blue-950">0.8s <span className="text-[10px] text-blue-600 ml-2">ULTRA</span></div>
                                        </div>
                                        <div className="p-8 glass rounded-[2.5rem] border-blue-100 space-y-4 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-950/20">Security</h4>
                                            <div className="text-2xl font-black tracking-tighter text-blue-950">Active <span className="text-[10px] text-blue-600 ml-2">PRO</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'history' ? (
                        <div className="space-y-12">
                            <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 pb-12 border-b border-blue-50">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black tracking-tighter text-blue-950">Generation <span className="text-blue-600">Archive</span></h1>
                                    <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">Historical Visual logs from your Neural Node</p>
                                </div>
                                <button onClick={fetchHistory} className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">Refresh logs</button>
                            </header>

                            {isLoadingHistory ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                            ) : history.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                    {history.map((item) => (
                                        <div key={item.id} className="group relative aspect-[3/4] rounded-[2rem] overflow-hidden border border-blue-50 shadow-lg hover:-translate-y-2 transition-all">
                                            <img src={item.image_url} alt={item.prompt} className="w-full h-full object-cover" />
                                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-blue-950/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">{item.mode} Mode</p>
                                                        <p className="text-[7px] text-blue-400 font-bold uppercase tracking-widest">
                                                            {getCleanName('providers', item.provider)} • {item.provider === 'deapi' ? getCleanName('models', item.model) : 'Neural Sync'}
                                                        </p>
                                                    </div>
                                                    <p className="text-[7px] text-white/30 font-bold">{new Date(item.timestamp).toLocaleDateString()}</p>
                                                </div>
                                                <p className="text-[10px] text-white font-bold tracking-tight line-clamp-2 italic mb-4">"{item.prompt}"</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleDownload(item.image_url)}
                                                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest text-center hover:bg-blue-500 transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(item.prompt);
                                                            alert("Prompt copied to clipboard!");
                                                        }}
                                                        className="px-4 py-2.5 bg-white/10 text-white rounded-xl text-[10px] hover:bg-white/20 transition-colors"
                                                        title="Copy Prompt"
                                                    >
                                                        📋
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="px-4 py-2.5 bg-white/10 text-white rounded-xl text-[10px] hover:bg-red-500 transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center space-y-6">
                                    <div className="text-5xl opacity-20">📭</div>
                                    <p className="text-blue-950/20 font-black uppercase tracking-widest text-xs">No visual logs found in this module.</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'payments' ? (
                        <div className="space-y-12">
                            <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 pb-12 border-b border-blue-50">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black tracking-tighter text-blue-950">Payment <span className="text-blue-600">Logs</span></h1>
                                    <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">Transaction verification status registry</p>
                                </div>
                                <button onClick={fetchUserPayments} className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">Update logs</button>
                            </header>

                            {isLoadingPayments ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                            ) : userPayments.length > 0 ? (
                                <div className="bg-white border border-blue-50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-950/[0.02] animate-slide-up">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-blue-50/50 border-b border-blue-50">
                                                <tr>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-blue-950/40">Module Packet</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-blue-950/40">Value</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-blue-950/40">Status</th>
                                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-blue-950/40 text-right">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50/50">
                                                {userPayments.map(p => (
                                                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="p-6">
                                                            <div className="font-black text-blue-950 text-sm uppercase tracking-tight">{p.package}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-bold text-blue-600 text-sm">Rs {p.amount}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                                p.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                                                                    'bg-red-50 text-red-600 border border-red-100'
                                                                }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="text-[10px] font-black text-blue-900/30 uppercase">{new Date(p.timestamp).toLocaleDateString()}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center space-y-6">
                                    <div className="text-5xl opacity-20">💸</div>
                                    <p className="text-blue-950/20 font-black uppercase tracking-widest text-xs">No transaction records detected.</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'billing' ? (
                        <div className="space-y-12">
                            <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 pb-12 border-b border-blue-50">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black tracking-tighter text-blue-950">Billing <span className="text-blue-600">& Refill</span></h1>
                                    <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">Purchase coins to unlock advanced neural modes</p>
                                </div>
                                {selectedPackage && (
                                    <button onClick={() => setSelectedPackage(null)} className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">← Back to Plans</button>
                                )}
                            </header>

                            {paymentMessage.text && (
                                <div className={`max-w-7xl mx-auto p-6 rounded-[2rem] border animate-fade-in-down mb-8 ${paymentMessage.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${paymentMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {paymentMessage.type === 'success' ? '✅' : '❌'}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Notification</p>
                                            <p className="text-sm font-bold tracking-tight">{paymentMessage.text}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!selectedPackage ? (
                                <div className="grid md:grid-cols-3 gap-8">
                                    {COIN_PACKS.map((pack) => (
                                        <div
                                            key={pack.id}
                                            onClick={() => setSelectedPackage(pack.id)}
                                            className={`group relative p-8 rounded-[3rem] transition-all cursor-pointer shadow-xl hover:-translate-y-2 border ${pack.name === 'Pro Pack' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-blue-50 hover:border-blue-200 text-blue-950'}`}
                                        >
                                            <div className="space-y-8 relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${pack.name === 'Pro Pack' ? 'bg-white/10' : 'bg-blue-50'}`}>{pack.icon}</div>
                                                    <div className="text-right">
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${pack.name === 'Pro Pack' ? 'text-white/40' : 'text-blue-900/30'}`}>{pack.name}</p>
                                                        <div className="flex flex-col items-end">
                                                            {pack.originalPrice && <span className="text-[10px] line-through opacity-40 font-black italic">Rs {pack.originalPrice}</span>}
                                                            <p className="text-3xl font-black tracking-tighter">Rs {pack.price}</p>
                                                            {pack.originalPrice && <span className="text-[8px] font-black bg-white text-blue-600 px-2 py-0.5 rounded-full mt-1 animate-pulse">SAVE 33%</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black tracking-tight">{pack.coins} Coins</h3>
                                                    <p className={`text-xs font-bold mt-2 ${pack.name === 'Pro Pack' ? 'text-white/40' : 'text-blue-950/40'}`}>{pack.description}</p>
                                                </div>
                                                <ul className="space-y-4">
                                                    {pack.features.map((feature) => (
                                                        <li key={feature} className={`flex items-center gap-3 text-[11px] font-black uppercase tracking-widest ${pack.name === 'Pro Pack' ? 'text-white/60' : 'text-blue-950/60'}`}>
                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] ${pack.name === 'Pro Pack' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'}`}>✓</span>
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="max-w-2xl mx-auto bg-white border border-blue-50 p-12 rounded-[3.5rem] space-y-10 shadow-2xl shadow-blue-950/[0.03] animate-fade-in-up">
                                    <div className="space-y-4 text-center">
                                        <h2 className="text-4xl font-black text-blue-950 tracking-tighter">Complete <span className="text-blue-600">Sync</span></h2>
                                        <p className="text-blue-950/40 text-[10px] font-black uppercase tracking-widest">Verify via EasyPaisa to activate your Neural Node.</p>
                                    </div>

                                    <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-50 space-y-6">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-blue-950/30">
                                            <span>Method</span>
                                            <span className="text-green-600">EasyPaisa</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-blue-100 pb-6">
                                            <span className="text-[9px] font-black text-blue-950/30 uppercase tracking-[0.2em]">Node Identifier</span>
                                            <span className="text-3xl font-black text-blue-950 tracking-tighter font-mono">{PAYMENT_INFO.easypaisa}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-blue-950/30">
                                            <span>Account Title</span>
                                            <span className="text-blue-950">{PAYMENT_INFO.title}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-6 border-t border-blue-100 font-black tracking-tighter">
                                            <span className="text-blue-950/30 text-[9px] uppercase tracking-[0.2em]">Total Payload</span>
                                            <span className="text-3xl text-blue-600">Rs {COIN_PACKS.find(p => p.id === selectedPackage)?.price}</span>
                                        </div>
                                    </div>

                                    <form onSubmit={handlePaymentUpload} className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-blue-950/30 uppercase tracking-[0.3em] ml-2">Upload Visual Logs (Screenshot)</label>
                                            <div className="relative h-20 bg-blue-50 border border-blue-100 rounded-2xl flex items-center px-6 group hover:border-blue-300 transition-colors">
                                                <input
                                                    type="file"
                                                    onChange={(e) => setPaymentProof(e.target.files[0])}
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    required
                                                />
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-xs font-black text-blue-950/60 uppercase tracking-widest">{paymentProof ? paymentProof.name : "Select Log File..."}</span>
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:-rotate-6">📎</div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            disabled={isUploading}
                                            type="submit"
                                            className="w-full h-20 bg-blue-600 text-white font-black rounded-3xl text-sm uppercase tracking-[0.4em] hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-blue-600/20"
                                        >
                                            {isUploading ? "Transmitting..." : "Authorize Access"}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8 animate-slide-up bg-white">
                            <div className="text-8xl opacity-10">⚙️</div>
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-blue-950 opacity-20">{activeTab} Module</h2>
                                <p className="text-[10px] font-black text-blue-900/10 uppercase tracking-[0.3em]">Optimizing segment for production...</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
