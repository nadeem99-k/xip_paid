"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { useRouter } from 'next/navigation';

const slides = [
  {
    image: "/images/slider-1.png",
    title: "Celestial Synthesis",
    subtitle: "Define the Future of Realism",
    tag: "Flux Architecture"
  },
  {
    image: "/images/slider-2.png",
    title: "Pure Aesthetics",
    subtitle: "Unmatched Identity Preservation",
    tag: "Pro Edition"
  },
  {
    image: "/images/slider-3.png",
    title: "Infinite Detail",
    subtitle: "8K Neural Upscaling Standard",
    tag: "Ultra HD"
  }
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-white min-h-screen">
      {/* Hero Section with Slider */}
      <section className="w-full h-[90vh] md:h-screen relative overflow-hidden bg-white">
        {/* Background Images Layer */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
            >
              <div className="absolute inset-0 bg-blue-900/10 pointer-events-none z-10"></div>
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover scale-105 animate-slow-zoom"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white pointer-events-none z-20"></div>
            </div>
          ))}
        </div>

        {/* Persistent Content Layer */}
        < div className="relative h-full flex flex-col items-center justify-center text-center z-50 px-6 pointer-events-none" >
          <div key={currentSlide} className="animate-fade-in-up flex flex-col items-center pointer-events-auto">
            <div className="inline-block px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black tracking-[0.4em] uppercase rounded-full mb-6 md:mb-8">
              {slides[currentSlide].tag}
            </div>
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-blue-950 mb-4 md:mb-6 drop-shadow-sm leading-tight px-4">
              {slides[currentSlide].title.split(' ')[0]} <br />
              <span className="text-blue-600 italic font-light">{slides[currentSlide].title.split(' ')[1]}</span>
            </h1>
            <p className="text-lg md:text-2xl text-blue-900/70 font-medium tracking-tight max-w-2xl mb-8 md:mb-12">
              {slides[currentSlide].subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full sm:w-auto">
              {session ? (
                <Link href="/dashboard" className="px-10 md:px-12 py-4 md:py-5 bg-blue-600 text-white rounded-2xl text-lg font-bold hover:bg-blue-700 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:-translate-y-1 text-center">
                  Enter Studio
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="px-10 md:px-12 py-4 md:py-5 bg-blue-600 text-white rounded-2xl text-lg font-bold hover:bg-blue-700 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:-translate-y-1 text-center">
                    Start Generating
                  </Link>
                  <Link href="/pricing" className="px-10 md:px-12 py-4 md:py-5 glass border border-blue-200 text-blue-950 rounded-2xl text-lg font-bold hover:bg-blue-50 transition-all text-center">
                    View Pricing
                  </Link>
                </>
              )}
            </div>
          </div>
        </div >

        {/* Slider Indicators */}
        < div className="absolute bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-40" >
          {
            slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${index === currentSlide ? "w-10 md:w-12 bg-blue-600" : "w-3 bg-blue-200"
                  }`}
              />
            ))
          }
        </div >
      </section >

      {/* Trust Stats */}
      < section className="w-full max-w-7xl mx-auto px-6 -mt-12 md:-mt-20 relative z-40" >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-center glass rounded-[2rem] md:rounded-[2.5rem] p-2 md:p-4 border border-blue-100 shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8 border-r border-blue-50">
            <div className="text-2xl md:text-4xl font-black text-blue-950">50k+</div>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-2">Creations</div>
          </div>
          <div className="p-6 md:p-8 md:border-r border-blue-50">
            <div className="text-2xl md:text-4xl font-black text-blue-600 underline decoration-blue-200 decoration-4 md:decoration-8 underline-offset-4">0.8s</div>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-2">Latency</div>
          </div>
          <div className="p-6 md:p-8 border-r border-blue-50">
            <div className="text-2xl md:text-4xl font-black text-blue-950">99%</div>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-2">Precision</div>
          </div>
          <div className="p-6 md:p-8">
            <div className="text-2xl md:text-4xl font-black text-blue-600">4.9/5</div>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-2">User Score</div>
          </div>
        </div>
      </section >

      {/* Workflow Section */}
      < section className="w-full py-24 md:py-40 px-6 max-w-7xl mx-auto" >
        <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="space-y-6 md:space-y-8">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-widest uppercase">The Process</div>
            <h2 className="text-4xl md:text-6xl font-black text-blue-950 tracking-tighter leading-tight">
              Simple. Fast. <br /><span className="text-blue-600 italic">Breathtaking.</span>
            </h2>
            <div className="space-y-8 md:space-y-10 pt-4">
              <div className="flex gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg md:text-xl shadow-lg">1</div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-blue-950 mb-1 md:mb-2">Input Prompt</h3>
                  <p className="text-blue-900/60 leading-relaxed font-medium text-sm md:text-base">Describe your vision with simple text. Our AI handles the semantic complexity.</p>
                </div>
              </div>
              <div className="flex gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-white border-2 border-blue-100 text-blue-600 flex items-center justify-center font-black text-lg md:text-xl">2</div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-blue-950 mb-1 md:mb-2">Select Mode</h3>
                  <p className="text-blue-900/60 leading-relaxed font-medium text-sm md:text-base">Choose from Bikini, Nude, or Hot modes tailored for specific artistic goals.</p>
                </div>
              </div>
              <div className="flex gap-4 md:gap-6">
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-white border-2 border-blue-100 text-blue-600 flex items-center justify-center font-black text-lg md:text-xl">3</div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-blue-950 mb-1 md:mb-2">Download 8K</h3>
                  <p className="text-blue-900/60 leading-relaxed font-medium text-sm md:text-base">Instant generation with one-click high-resolution master output.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative mt-8 md:mt-0">
            <div className="absolute -inset-4 bg-blue-100/50 rounded-[2rem] md:rounded-[3rem] blur-2xl -z-10"></div>
            <div className="glass p-2 md:p-3 rounded-[2.5rem] md:rounded-[3rem] border-white shadow-2xl relative overflow-hidden group">
              <img
                src="/images/showcase.png"
                className="w-full rounded-[2rem] md:rounded-[2.5rem] transition-transform duration-1000 group-hover:scale-105"
                alt="Process Showcase"
              />
              <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 p-4 md:p-6 glass border-white/20 rounded-2xl animate-float">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">✨</div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-950">AI Processing</p>
                    <div className="w-24 md:w-32 h-1.5 bg-blue-50 rounded-full mt-1 overflow-hidden">
                      <div className="w-2/3 h-full bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Bento Showcase */}
      < section className="w-full py-24 md:py-40 px-6 bg-blue-50/50" >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24 space-y-4">
            <h2 className="text-4xl md:text-7xl font-black text-blue-950 tracking-tighter">Elite <span className="text-blue-600">Features</span></h2>
            <p className="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">Powered by H100 GPU Clusters</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[250px] md:auto-rows-[300px]">
            <div className="sm:col-span-2 glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col justify-end border-white shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative">
              <div className="absolute top-10 right-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-all"></div>
              <div className="space-y-4 relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-blue-950 tracking-tight">Dynamic Scaling</h3>
                <p className="text-blue-900/60 leading-relaxed max-w-sm text-sm md:text-base">Infinite resolution scaling without losing structural fidelity or skin texture.</p>
              </div>
            </div>

            <div className="glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 flex flex-col justify-between border-white shadow-xl bg-blue-600 text-white group hover:scale-[1.02] transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl md:text-2xl">⚡</div>
              <div className="space-y-1">
                <h3 className="text-lg md:text-xl font-bold">Turbo Speed</h3>
                <p className="text-white/70 text-xs md:text-sm">Under 1 second per gen</p>
              </div>
            </div>

            <div className="glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 flex flex-col justify-between border-white shadow-xl group hover:-translate-y-2 transition-all">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-xl md:text-2xl">🔒</div>
              <div className="space-y-1">
                <h3 className="text-lg md:text-xl font-bold text-blue-950">Privately Yours</h3>
                <p className="text-blue-900/50 text-xs md:text-sm">Zero data retention</p>
              </div>
            </div>

            <div className="glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col justify-center gap-6 border-white shadow-xl sm:col-span-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent"></div>
              <h3 className="text-2xl md:text-3xl font-black text-blue-950 relative z-10">Neural Fidelity</h3>
              <div className="flex gap-2 relative z-10">
                {[60, 40, 85, 50, 75, 42].map((height, i) => (
                  <div key={i} className="h-20 md:h-24 w-4 bg-blue-600/10 rounded-full overflow-hidden">
                    <div className={`w-full bg-blue-600 rounded-full animate-bounce`} style={{ height: `${height}%`, animationDelay: `${i * 0.1}s` }}></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 glass rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between border-white shadow-xl group gap-6 overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-blue-950 tracking-tight mb-2">Identity Vault</h3>
                <p className="text-blue-900/60 max-w-xs text-sm md:text-base">Preserve character consistency across sessions with custom LoRA weights.</p>
              </div>
              <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 group">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-200 animate-spin-slow"></div>
                <img
                  src="/images/gallery-2.png"
                  className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] object-cover rounded-full grayscale group-hover:grayscale-0 transition-all duration-500"
                  alt="Identity Vault"
                />
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* Gallery Showcase */}
      < section className="w-full py-24 md:py-40 px-6" >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-24 gap-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-blue-950 tracking-tighter">The <span className="text-blue-600">Masterpieces</span></h2>
              <p className="text-blue-900/50 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">Curated Artificial Excellence</p>
            </div>
            <Link href="/dashboard" className="group flex items-center gap-3 text-blue-600 font-bold uppercase tracking-widest text-xs hover:gap-5 transition-all">
              View All Creations <span className="text-xl">→</span>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            {[1, 2, 3].map((item) => (
              <div key={item} className="group cursor-none">
                <div className="aspect-[4/5] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                  <img
                    src={
                      item === 1 ? "/images/slider-1.png" :
                        item === 2 ? "/images/slider-2.png" :
                          "/images/slider-3.png"
                    }
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                    alt={`Gallery ${item}`}
                  />
                  <div className="absolute inset-x-4 md:inset-x-6 bottom-4 md:bottom-6 p-4 md:p-6 glass rounded-2xl flex justify-between items-center translate-y-20 group-hover:translate-y-0 transition-all duration-500 opacity-0 group-hover:opacity-100">
                    <div>
                      <p className="text-[10px] font-black text-blue-950 uppercase">Serial #00{item}</p>
                      <p className="text-[8px] font-bold text-blue-600 uppercase mt-1">Flux Model V4</p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">↗</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      < footer className="w-full py-16 md:py-24 px-6 border-t border-blue-50 border-white bg-blue-50/30" >
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-16 text-center md:text-left">
          <div className="sm:col-span-2 space-y-6 md:space-y-8">
            <div className="text-3xl md:text-4xl font-black text-blue-950 tracking-tighter">
              XIP<span className="text-blue-600">PRO</span>
            </div>
            <p className="text-blue-950/50 font-medium leading-relaxed max-w-sm mx-auto md:mx-0 text-sm md:text-base">
              Pushing the boundaries of generative aesthetics through research and design excellence. Join the vanguard of AI synthesis.
            </p>
            <div className="flex justify-center md:justify-start gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full glass border-white flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                  {i}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <h4 className="text-blue-950 font-black uppercase tracking-widest text-[10px] md:text-xs">Resources</h4>
            <ul className="space-y-3 md:space-y-4 text-blue-900/60 font-bold text-xs md:text-sm">
              <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
              <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
              <li><Link href="/support" className="hover:text-blue-600 transition-colors">Support</Link></li>
            </ul>
          </div>

          <div className="space-y-6 md:space-y-8">
            <h4 className="text-blue-950 font-black uppercase tracking-widest text-[10px] md:text-xs">Navigation</h4>
            <ul className="space-y-3 md:space-y-4 text-blue-900/60 font-bold text-xs md:text-sm">
              <li><Link href="/dashboard" className="hover:text-blue-600 transition-colors">Studio</Link></li>
              <li><Link href="/profile" className="hover:text-blue-600 transition-colors">Account</Link></li>
              <li><Link href="/login" className="hover:text-blue-600 transition-colors">Login</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-12 md:pt-20 mt-12 md:mt-20 border-t border-blue-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[8px] md:text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em] text-center">
          <p>© 2026 XIP PRO LABS. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6 md:gap-10">
            <Link href="/privacy" className="hover:text-blue-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
