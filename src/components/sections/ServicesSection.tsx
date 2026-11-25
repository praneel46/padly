import React from 'react';
import { FadeIn } from '../common/FadeIn';

interface ServiceItem {
  number: string;
  name: string;
  description: string;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    number: "01",
    name: "Notepad & AI Assist",
    description: "Distraction-free rich text and Markdown editor with instant debounced autosave, on-demand live preview, and a built-in AI assistant for summaries, text cleanup, and translation."
  },
  {
    number: "02",
    name: "PDFs & Files Hub",
    description: "High-speed document storage for PDFs, docs, and archives up to 50MB with inline document previews and one-click ZIP download."
  },
  {
    number: "03",
    name: "Photo & Visual Gallery",
    description: "Dedicated gallery for photos, 3D renders, and screenshots with high-resolution lightbox viewing and OCR text extraction."
  },
  {
    number: "04",
    name: "Audio & Background Player",
    description: "Upload music tracks, songs, and audio memos with a persistent player that continues playing in the background while you write."
  },
  {
    number: "05",
    name: "Document & Media Converter",
    description: "Powerful in-browser converter to transform Photos to PDF, merge PDFs, remove pages, convert text to PDF, and change image formats."
  },
  {
    number: "06",
    name: "Audio & Video Chat with Friends",
    description: "Real-time synchronized chat alongside peer-to-peer live voice and video calling between friends joining the same code with zero login."
  }
];

export const ServicesSection: React.FC = () => {
  return (
    <section
      id="services"
      className="relative bg-[#FFFFFF] rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32 z-0"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <FadeIn delay={0} y={30}>
          <h2
            style={{ fontSize: 'clamp(3rem, 10vw, 130px)' }}
            className="text-[#0C0C0C] font-black uppercase text-center leading-none tracking-tight mb-16 sm:mb-20 md:mb-28 select-none"
          >
            Services
          </h2>
        </FadeIn>

        {/* Services List (The 6 Main Features) */}
        <div className="flex flex-col border-t border-[rgba(12,12,12,0.15)]">
          {SERVICES_DATA.map((service, index) => (
            <FadeIn key={service.number} delay={index * 0.08} y={30}>
              <div className="flex flex-col md:flex-row md:items-center justify-between py-8 sm:py-10 md:py-12 border-b border-[rgba(12,12,12,0.15)] group hover:bg-black/[0.02] transition-colors px-2 sm:px-4">
                {/* Number */}
                <div
                  style={{ fontSize: 'clamp(2.5rem, 8vw, 110px)' }}
                  className="font-black text-[#0C0C0C] leading-none select-none tracking-tighter w-full md:w-1/3 mb-4 md:mb-0"
                >
                  {service.number}
                </div>

                {/* Name + Description Stack */}
                <div className="w-full md:w-2/3 flex flex-col justify-center">
                  <h3
                    style={{ fontSize: 'clamp(1.1rem, 2.2vw, 2rem)' }}
                    className="font-medium uppercase text-[#0C0C0C] tracking-wide mb-2 sm:mb-3"
                  >
                    {service.name}
                  </h3>
                  <p
                    style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.15rem)' }}
                    className="font-light text-[#0C0C0C] opacity-70 leading-relaxed max-w-2xl"
                  >
                    {service.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
