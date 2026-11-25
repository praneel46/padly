import React, { useState, useEffect } from 'react';
import { NotepadWorkspace } from './components/notepad/NotepadWorkspace';
import { AboutSection } from './components/sections/AboutSection';
import { ServicesSection } from './components/sections/ServicesSection';
import { BrandLogo } from './components/common/BrandLogo';
import { ArrowRight, Dices } from 'lucide-react';

export function App() {
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [codeInputValue, setCodeInputValue] = useState<string>('');

  // Handle URL Path changes
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const searchParams = new URLSearchParams(window.location.search);
      const readOnlyMode = searchParams.get('mode') === 'readonly';
      setIsReadOnly(readOnlyMode);

      if (path && path !== '') {
        setActiveCode(decodeURIComponent(path));
      } else {
        setActiveCode(null);
      }
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  // Disable F12 & Developer Console shortcuts globally
  useEffect(() => {
    const disableF12 = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', disableF12, true);
    return () => window.removeEventListener('keydown', disableF12, true);
  }, []);

  const navigateToCode = (code: string, readOnly = false) => {
    const clean = code.trim().replace(/^\/+|\/+$/g, '');
    if (!clean) return;

    const url = `/${encodeURIComponent(clean)}${readOnly ? '?mode=readonly' : ''}`;
    window.history.pushState({}, '', url);
    setActiveCode(clean);
    setIsReadOnly(readOnly);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateHome = () => {
    window.history.pushState({}, '', '/');
    setActiveCode(null);
    setIsReadOnly(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCode = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCode = codeInputValue.trim() || '111';
    navigateToCode(targetCode);
  };

  const generateRandom4Digit = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    navigateToCode(randomCode);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // If viewing a pad workspace (e.g. /111)
  if (activeCode) {
    return (
      <NotepadWorkspace
        code={activeCode}
        isReadOnlyMode={isReadOnly}
        onNavigateHome={navigateHome}
        onNavigateCode={(newCode) => navigateToCode(newCode)}
      />
    );
  }

  // Landing Page: Hero with centralized code input -> About Padly -> Services -> Footer
  return (
    <div className="w-full bg-[#0C0C0C] text-[#D7E2EA] font-kanit overflow-x-clip select-none">
      {/* 1. HERO SECTION */}
      <section
        id="hero"
        className="relative min-h-screen w-full flex flex-col justify-between px-6 md:px-12 py-6 md:py-8 bg-[#0C0C0C] overflow-hidden"
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-purple-900/15 rounded-full blur-[150px] pointer-events-none z-0" />

        {/* Top Navbar */}
        <header className="w-full flex items-center justify-between z-20">
          <BrandLogo size="md" onClick={() => scrollToSection('hero')} />

          <nav className="flex items-center gap-6 sm:gap-10 text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg">
            <button
              onClick={() => scrollToSection('about')}
              className="hover:opacity-70 transition-opacity cursor-pointer"
            >
              About Padly
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="hover:opacity-70 transition-opacity cursor-pointer"
            >
              Services
            </button>
          </nav>
        </header>

        {/* Centralized Hero Area & Code Input */}
        <div className="my-auto py-12 flex flex-col items-center justify-center text-center z-10 max-w-4xl mx-auto w-full">
          {/* Brand Cutout Logo in Center */}
          <div className="mb-4">
            <img
              src="/assets/padly-logo-white.png"
              alt="Padly"
              className="h-20 sm:h-28 md:h-32 w-auto object-contain mx-auto filter drop-shadow-[0_4px_24px_rgba(182,0,168,0.45)] hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Heading with .hero-heading gradient: YOUR SPACE. ANYWHERE */}
          <h1 className="hero-heading font-black uppercase tracking-tight text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-4 leading-none">
            YOUR SPACE. ANYWHERE
          </h1>

          {/* Centralized Code Input Box */}
          <div className="w-full max-w-lg bg-[#141414]/90 backdrop-blur-xl border-2 border-[#D7E2EA]/20 rounded-full p-2 sm:p-2.5 shadow-[0_12px_45px_rgba(0,0,0,0.85)] focus-within:border-purple-500/80 transition-all duration-300 mt-2">
            <form onSubmit={handleOpenCode} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={codeInputValue}
                onChange={(e) => setCodeInputValue(e.target.value)}
                placeholder="Enter a code"
                className="bg-transparent border-none outline-none text-white text-base sm:text-lg md:text-xl font-kanit tracking-wider px-4 sm:px-6 w-full placeholder-[#646973]"
              />
              <button
                type="submit"
                className="glow-btn text-white font-medium uppercase tracking-widest px-6 sm:px-9 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm cursor-pointer flex-shrink-0 flex items-center gap-2"
              >
                Open <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Helper links (try demo #1212 removed) */}
          <div className="flex items-center justify-center mt-5 text-xs text-[#646973]">
            <button
              onClick={generateRandom4Digit}
              className="flex items-center gap-1.5 hover:text-purple-300 transition cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-purple-400" />
              <span>Generate 4-Digit Code</span>
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="w-full flex justify-center pb-2 z-10">
          <button
            onClick={() => scrollToSection('about')}
            className="text-xs uppercase tracking-widest text-[#646973] hover:text-[#D7E2EA] transition cursor-pointer"
          >
            Explore About & Services ↓
          </button>
        </div>
      </section>

      {/* 2. ABOUT PADLY SECTION */}
      <AboutSection />

      {/* 3. SERVICES SECTION (6 MAIN FEATURES) */}
      <ServicesSection />

      {/* 4. FOOTER (3D CREATOR & LAUNCH #1212 REMOVED) */}
      <footer className="w-full bg-[#0C0C0C] border-t border-[#262626] py-12 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-6 z-20">
        <div className="flex items-center gap-4">
          <BrandLogo size="md" onClick={() => scrollToSection('hero')} />
          <span className="text-xs text-[#646973]">
            © {new Date().getFullYear()} Padly. Realtime Shared Vault & Notepad.
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-medium uppercase tracking-wider text-[#646973]">
          <button onClick={() => scrollToSection('about')} className="hover:text-white transition cursor-pointer">
            About Padly
          </button>
          <span>•</span>
          <button onClick={() => scrollToSection('services')} className="hover:text-white transition cursor-pointer">
            Services
          </button>
        </div>
      </footer>
    </div>
  );
}
