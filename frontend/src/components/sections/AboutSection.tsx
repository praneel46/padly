import React from 'react';
import { FadeIn } from '../common/FadeIn';
import { AnimatedText } from '../common/AnimatedText';

export const AboutSection: React.FC = () => {
  const padlyAboutText = "Padly is your universal shared space for instant notes, files, media, and collaboration. Open or share any workspace simply by choosing a code—no logins, no tracking, and no friction. Equipped with client-side AES-GCM encryption, live multi-peer synchronization, in-browser document tools, and real-time audio and video calling, Padly gives you complete creative freedom wherever you are.";

  return (
    <section id="about" className="relative min-h-[85vh] w-full flex flex-col items-center justify-center bg-[#0C0C0C] px-5 sm:px-8 md:px-10 py-20 sm:py-28 overflow-hidden select-none">
      {/* Corner 1: Top-left Moon icon */}
      <div className="absolute top-[6%] left-[2%] sm:left-[4%] md:left-[6%] z-10 pointer-events-none">
        <FadeIn delay={0.1} x={-80} y={0} duration={0.9}>
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png"
            alt="Security"
            className="w-20 sm:w-28 md:w-36 h-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] opacity-70"
            loading="lazy"
          />
        </FadeIn>
      </div>

      {/* Corner 2: Bottom-left 3D object */}
      <div className="absolute bottom-[8%] left-[2%] sm:left-[4%] md:left-[6%] z-10 pointer-events-none">
        <FadeIn delay={0.25} x={-80} y={0} duration={0.9}>
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png"
            alt="Speed"
            className="w-16 sm:w-24 md:w-32 h-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] opacity-70"
            loading="lazy"
          />
        </FadeIn>
      </div>

      {/* Corner 3: Top-right Lego icon */}
      <div className="absolute top-[6%] right-[2%] sm:right-[4%] md:right-[6%] z-10 pointer-events-none">
        <FadeIn delay={0.15} x={80} y={0} duration={0.9}>
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png"
            alt="Modularity"
            className="w-20 sm:w-28 md:w-36 h-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] opacity-70"
            loading="lazy"
          />
        </FadeIn>
      </div>

      {/* Corner 4: Bottom-right 3D group */}
      <div className="absolute bottom-[8%] right-[2%] sm:right-[4%] md:right-[6%] z-10 pointer-events-none">
        <FadeIn delay={0.3} x={80} y={0} duration={0.9}>
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png"
            alt="Collaboration"
            className="w-20 sm:w-28 md:w-36 h-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] opacity-70"
            loading="lazy"
          />
        </FadeIn>
      </div>

      {/* Main Center Content */}
      <div className="relative z-20 max-w-4xl w-full flex flex-col items-center text-center">
        {/* Heading */}
        <FadeIn delay={0} y={40}>
          <h2
            style={{ fontSize: 'clamp(3rem, 10vw, 130px)' }}
            className="hero-heading font-black uppercase leading-none tracking-tight mb-8 sm:mb-12 select-none"
          >
            About Padly
          </h2>
        </FadeIn>

        {/* Animated paragraph with character reveal */}
        <div className="w-full flex justify-center max-w-2xl px-4">
          <AnimatedText
            text={padlyAboutText}
            className="text-[#D7E2EA] font-medium leading-relaxed sm:text-lg md:text-xl text-center"
          />
        </div>
      </div>
    </section>
  );
};
