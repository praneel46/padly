import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  onClick?: () => void;
  variant?: 'white' | 'gradient';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = 'md',
  showTagline = false,
  onClick,
  variant = 'white'
}) => {
  const sizeClasses = {
    sm: 'h-7 sm:h-8',
    md: 'h-9 sm:h-11 md:h-12',
    lg: 'h-14 sm:h-16 md:h-20',
    xl: 'h-20 sm:h-24 md:h-32'
  };

  const logoSrc = variant === 'gradient' 
    ? '/assets/padly-logo-gradient.png' 
    : '/assets/padly-logo-white.png';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer group select-none ${className}`}
    >
      <div className="relative">
        <img
          src={logoSrc}
          alt="Padly"
          className={`${sizeClasses[size]} w-auto object-contain transition-all duration-300 group-hover:brightness-125 filter drop-shadow-[0_2px_12px_rgba(182,0,168,0.35)]`}
          draggable={false}
        />
      </div>
      {showTagline && (
        <span className="hidden sm:inline-block text-[11px] uppercase tracking-widest text-[#646973] border-l border-[#262626] pl-2.5 font-medium">
          Shared Realtime Vault
        </span>
      )}
    </div>
  );
};
