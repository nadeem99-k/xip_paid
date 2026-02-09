'use client';

export default function PrivacyPage() {
    return (
        <div className="pt-32 pb-20 px-6 min-h-screen bg-white text-blue-950">
            <div className="max-w-4xl mx-auto space-y-12 animate-slide-up">
                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter">Privacy <span className="text-blue-600">Policy</span></h1>
                    <p className="text-blue-900/40 font-bold uppercase tracking-widest text-[10px]">Effective Date: February 9, 2026</p>
                </div>

                <div className="prose prose-blue max-w-none space-y-8 text-blue-900/70 font-medium">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">1. Data Collection</h2>
                        <p>We collect minimal information required to provide our services. This includes your email address for account management and any configuration data you provide for AI generation.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">2. Processing & Storage</h2>
                        <p>All image transformations are processed in real-time. We do not store original raw upload files permanently unless you explicitly save them to your history module. Your generation history is private to your account.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">3. Identity Preservation</h2>
                        <p>Our AI models use identity-preserving technology. We do not use your provided images to train general-purpose models. Your data remains your own.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">4. Third-Party Services</h2>
                        <p>We use encrypted payment gateways and secure neural engine nodes. We do not sell or trade your personal information to third-party marketing firms.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
