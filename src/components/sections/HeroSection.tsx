import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Magnet } from '../common/Magnet';
import { ContactButton } from '../common/Buttons';
import { BrandLogo } from '../common/BrandLogo';
import { ArrowRight, Sparkles, KeyRound } from 'lucide-react';

interface HeroSectionProps {
  onOpenPad: (code: string) => void;
  onScrollTo: (id: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenPad, onScrollTo }) => {
  const [quickCode, setQuickCode] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);

  const handleLaunchCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = quickCode.trim() || '1212';
    onOpenPad(code);
  };

  return (
    <section className="relative h-screen w-full flex flex-col justify-between overflow-x-clip bg-[#0C0C0C] select-none">
      {/* 1. Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full px-6 md:px-10 pt-6 md:pt-8 z-20 flex items-center justify-between"
      >
        <div className="flex items-center gap-6">
          <BrandLogo size="md" onClick={() => onScrollTo('hero')} />
        </div>

        <nav className="flex items-center justify-between gap-6 sm:gap-10 md:gap-14 lg:gap-20 text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem]">
          <button
            onClick={() => onScrollTo('about')}
            className="hover:opacity-70 transition-opacity duration-200 cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => onScrollTo('services')}
            className="hover:opacity-70 transition-opacity duration-200 cursor-pointer"
          >
            Price
          </button>
          <button
            onClick={() => onScrollTo('projects')}
            className="hover:opacity-70 transition-opacity duration-200 cursor-pointer"
          >
            Projects
          </button>
          <button
            onClick={() => setShowCodeModal(true)}
            className="hover:opacity-70 transition-opacity duration-200 cursor-pointer flex items-center gap-1.5 text-purple-300"
          >
            <KeyRound className="w-4 h-4 md:w-5 md:h-5" />
            Notepad
          </button>
        </nav>
      </motion.header>

      {/* Quick Interactive CodeBar Pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full flex justify-center px-4 z-20 mt-2 sm:mt-0"
      >
        <form
          onSubmit={handleLaunchCode}
          className="flex items-center gap-2 bg-[#141414]/90 backdrop-blur-md border border-[#D7E2EA]/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_4px_24px_rgba(0,0,0,0.6)] max-w-md w-full hover:border-[#D7E2EA]/40 transition-colors"
        >
          <span className="text-[11px] sm:text-xs uppercase tracking-widest text-[#646973] font-bold pl-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Code:
          </span>
          <input
            type="text"
            value={quickCode}
            onChange={(e) => setQuickCode(e.target.value)}
            placeholder="e.g. 1212 or project/notes"
            className="bg-transparent border-none outline-none text-[#D7E2EA] placeholder-[#646973] text-xs sm:text-sm font-kanit flex-1 tracking-wider"
          />
          <button
            type="submit"
            className="bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[11px] sm:text-xs font-medium uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1"
          >
            Open <ArrowRight className="w-3 h-3" />
          </button>
        </form>
      </motion.div>

      {/* 2. Hero Heading */}
      <div className="w-full overflow-hidden text-center z-0">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="hero-heading font-black uppercase tracking-tight leading-none whitespace-nowrap w-full text-[14vw] sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw] mt-6 sm:mt-4 md:-mt-5 select-none"
        >
          Hi, i&apos;m jack
        </motion.h1>
      </div>

      {/* 3. Hero Portrait (Centered Absolutely with Magnet) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute left-1/2 -translate-x-1/2 z-10 w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px] top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0 pointer-events-auto"
      >
        <Magnet
          padding={150}
          strength={3}
          activeTransition="transform 0.3s ease-out"
          inactiveTransition="transform 0.6s ease-in-out"
          className="w-full flex justify-center"
        >
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png"
            alt="Jack - 3D Creator"
            className="w-full h-auto object-contain pointer-events-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
            loading="eager"
          />
        </Magnet>
      </motion.div>

      {/* 4. Bottom Bar */}
      <div className="w-full px-6 md:px-10 pb-7 sm:pb-8 md:pb-10 flex justify-between items-end z-20">
        {/* Left paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ fontSize: 'clamp(0.75rem, 1.4vw, 1.5rem)' }}
          className="text-[#D7E2EA] font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
        >
          a 3d creator driven by crafting striking and unforgettable projects
        </motion.p>

        {/* Right Contact button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ContactButton
            onClick={() => onOpenPad('1212')}
            label="Open Padly"
          />
        </motion.div>
      </div>

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141414] border border-[#D7E2EA]/20 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowCodeModal(false)}
              className="absolute top-4 right-4 text-[#646973] hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <BrandLogo size="sm" />
              <h3 className="text-xl font-bold uppercase tracking-wider text-white">Open Shared Pad</h3>
            </div>
            <p className="text-sm text-[#D7E2EA]/70 mb-5">
              Enter any code (number, text, or emoji) to open or create your private or collaborative workspace instantly. No login required.
            </p>
            <form onSubmit={handleLaunchCode} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                placeholder="e.g. 1212, jack-3d, or /design/v1"
                className="w-full bg-[#0C0C0C] border border-[#D7E2EA]/30 rounded-xl px-4 py-3 text-[#D7E2EA] text-lg font-kanit tracking-wider focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 glow-btn py-3 rounded-full text-white font-medium uppercase tracking-wider text-sm cursor-pointer"
                >
                  Enter Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
                    onOpenPad(randomCode);
                  }}
                  className="px-4 py-3 rounded-full border border-[#D7E2EA]/30 text-[#D7E2EA] text-xs uppercase tracking-wider hover:bg-white/5 transition"
                >
                  Random 4-Digit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
