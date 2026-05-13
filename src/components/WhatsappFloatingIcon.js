'use client';

export default function WhatsappFloatingIcon() {
    const PHONE_NUMBER = "923422168420"; // Adjusted for Pakistan international format
    const MESSAGE = "Hello! I need help with my payment/plan on XIP AI.";
    const DIRECT_CHAT_LINK = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;

    return (
        <div className="fixed bottom-8 right-8 z-[100] group">
            {/* Pulsing Background */}
            <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-2xl group-hover:bg-green-500/30 transition-all animate-pulse"></div>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-4 px-4 py-2 bg-blue-950 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all whitespace-nowrap shadow-xl">
                Chat with Support
                <div className="absolute top-full right-6 -translate-y-1/2 border-8 border-transparent border-t-blue-950"></div>
            </div>

            {/* Icon Button */}
            <a
                href={DIRECT_CHAT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-16 h-16 bg-green-500 text-white rounded-[1.5rem] flex items-center justify-center text-3xl shadow-[0_20px_40px_rgba(34,197,94,0.3)] hover:shadow-[0_25px_50px_rgba(34,197,94,0.4)] hover:-translate-y-1.5 active:scale-95 transition-all duration-300 group-hover:rotate-12"
            >
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
            </a>
        </div>
    );
}
