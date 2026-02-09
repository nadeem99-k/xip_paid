'use client';

export default function TermsPage() {
    return (
        <div className="pt-32 pb-20 px-6 min-h-screen bg-white text-blue-950">
            <div className="max-w-4xl mx-auto space-y-12 animate-slide-up">
                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter">Terms of <span className="text-blue-600">Service</span></h1>
                    <p className="text-blue-900/40 font-bold uppercase tracking-widest text-[10px]">Effective Date: February 9, 2026</p>
                </div>

                <div className="prose prose-blue max-w-none space-y-8 text-blue-900/70 font-medium">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">1. Services Provided</h2>
                        <p>XIP PRO provides AI-driven image generation and transformation services. These services are provided "as-is" and are subject to coin consumption and subscription levels.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">2. User Conduct</h2>
                        <p>Users must not use the service to generate illegal, defamatory, or harmful content. We reserve the right to terminate accounts that violate these guidelines without refund.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">3. Payments & Coins</h2>
                        <p>All sales of coins and subscriptions are final. Coins are non-transferable and have no cash value. Deductions occur only upon successful initiation of a generation signal.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-blue-950">4. Intellectual Property</h2>
                        <p>You retain rights to the inputs and the synthesized output created through your account. However, you grant us a limited license to process and store this data to provide the service.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
