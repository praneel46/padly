import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FadeIn } from '../common/FadeIn';
import { LiveProjectButton } from '../common/Buttons';

interface ProjectItem {
  id: string;
  number: string;
  title: string;
  category: string;
  col1_img1: string;
  col1_img2: string;
  col2_img: string;
  padCode: string;
}

const PROJECTS: ProjectItem[] = [
  {
    id: "proj-1",
    number: "01",
    title: "Nextlevel Studio",
    category: "Client",
    col1_img1: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85",
    col1_img2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85",
    col2_img: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85",
    padCode: "nextlevel-studio"
  },
  {
    id: "proj-2",
    number: "02",
    title: "Aura Brand Identity",
    category: "Personal",
    col1_img1: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85",
    col1_img2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85",
    col2_img: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85",
    padCode: "aura-brand"
  },
  {
    id: "proj-3",
    number: "03",
    title: "Solaris Digital",
    category: "Client",
    col1_img1: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png&w=1280&q=85",
    col1_img2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png&w=1280&q=85",
    col2_img: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png&w=1280&q=85",
    padCode: "solaris-digital"
  }
];

interface ProjectCardProps {
  project: ProjectItem;
  index: number;
  totalCards: number;
  onOpenPad: (code: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, totalCards, onOpenPad }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'start start']
  });

  const targetScale = 1 - (totalCards - 1 - index) * 0.03;
  const scale = useTransform(scrollYProgress, [0, 1], [1, targetScale]);

  return (
    <div
      ref={containerRef}
      className="h-[85vh] flex items-center justify-center sticky top-24 md:top-32"
      style={{
        top: `calc(5rem + ${index * 28}px)`
      }}
    >
      <motion.div
        style={{ scale }}
        className="w-full max-w-6xl rounded-[40px] sm:rounded-[50px] md:rounded-[60px] border-2 border-[#D7E2EA] bg-[#0C0C0C] p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Top Row */}
        <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-[#D7E2EA]/15">
          <div className="flex items-baseline gap-4 sm:gap-6">
            <span
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
              className="font-black text-[#D7E2EA] leading-none"
            >
              {project.number}
            </span>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm uppercase tracking-widest text-[#646973] font-medium">
                {project.category}
              </span>
              <h3 className="text-lg sm:text-2xl md:text-3xl font-medium uppercase tracking-wide text-[#D7E2EA]">
                {project.title}
              </h3>
            </div>
          </div>

          <LiveProjectButton
            label="Live Project"
            onClick={() => onOpenPad(project.padCode)}
          />
        </div>

        {/* Bottom Row: 2-column image grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 pt-4 sm:pt-6 h-full items-stretch">
          {/* Left column (40% width / 5 cols) - 2 stacked images */}
          <div className="md:col-span-5 flex flex-col gap-3 sm:gap-4 justify-between">
            <div
              style={{ height: 'clamp(130px, 16vw, 230px)' }}
              className="w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] overflow-hidden border border-[#D7E2EA]/20 bg-[#161616]"
            >
              <img
                src={project.col1_img1}
                alt={`${project.title} detail 1`}
                loading="lazy"
                className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div
              style={{ height: 'clamp(160px, 22vw, 340px)' }}
              className="w-full rounded-[40px] sm:rounded-[50px] md:rounded-[60px] overflow-hidden border border-[#D7E2EA]/20 bg-[#161616]"
            >
              <img
                src={project.col1_img2}
                alt={`${project.title} detail 2`}
                loading="lazy"
                className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Right column (60% width / 7 cols) - 1 tall image */}
          <div className="md:col-span-7 h-[280px] sm:h-[350px] md:h-full min-h-[300px] rounded-[40px] sm:rounded-[50px] md:rounded-[60px] overflow-hidden border border-[#D7E2EA]/20 bg-[#161616]">
            <img
              src={project.col2_img}
              alt={`${project.title} hero showcase`}
              loading="lazy"
              className="w-full h-full object-cover rounded-[40px] sm:rounded-[50px] md:rounded-[60px] hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface ProjectsSectionProps {
  onOpenPad: (code: string) => void;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({ onOpenPad }) => {
  return (
    <section
      id="projects"
      className="relative bg-[#0C0C0C] rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 z-10 px-5 sm:px-8 md:px-10 py-20 sm:py-24 pb-32"
    >
      {/* Section Heading */}
      <div className="max-w-6xl mx-auto text-center mb-16 sm:mb-20">
        <FadeIn delay={0} y={30}>
          <h2
            style={{ fontSize: 'clamp(3rem, 12vw, 160px)' }}
            className="hero-heading font-black uppercase leading-none tracking-tight select-none"
          >
            Project
          </h2>
        </FadeIn>
      </div>

      {/* 3 Stacking Project Cards */}
      <div className="max-w-6xl mx-auto">
        {PROJECTS.map((proj, idx) => (
          <ProjectCard
            key={proj.id}
            project={proj}
            index={idx}
            totalCards={PROJECTS.length}
            onOpenPad={onOpenPad}
          />
        ))}
      </div>
    </section>
  );
};
