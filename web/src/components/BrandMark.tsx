import React from 'react';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  variant = 'dark',
  size = 'md',
}) => {
  const isLight = variant === 'light';
  const boxSize =
    size === 'lg' ? 'w-11 h-11' : size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <div
      className={`${boxSize} rounded-lg flex items-center justify-center shrink-0 border ${
        isLight
          ? 'bg-gradient-to-br from-[#481321] to-[#681C2D] border-[#D6A84B]/60 text-[#FAF7F0] shadow-sm'
          : 'bg-[#681C2D] border-[#D6A84B]/50 text-[#FAF7F0] shadow-xs'
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Shield / Crest outline */}
        <path d="M12 2.5L4.5 5.75V11.5C4.5 16.35 7.7 20.65 12 21.75C16.3 20.65 19.5 16.35 19.5 11.5V5.75L12 2.5Z" />
        {/* Biometric scan corner brackets & face node */}
        <path d="M8.75 9.25V8.5C8.75 8.08 9.08 7.75 9.5 7.75H10.25" className="text-[#D6A84B]" stroke="currentColor" />
        <path d="M15.25 9.25V8.5C15.25 8.08 14.92 7.75 14.5 7.75H13.75" className="text-[#D6A84B]" stroke="currentColor" />
        <path d="M8.75 14V14.75C8.75 15.17 9.08 15.5 9.5 15.5H10.25" className="text-[#D6A84B]" stroke="currentColor" />
        <path d="M15.25 14V14.75C15.25 15.17 14.92 15.5 14.5 15.5H13.75" className="text-[#D6A84B]" stroke="currentColor" />
        <circle cx="12" cy="11.25" r="1.6" />
        <path d="M9.8 14.5C10.35 13.7 11.12 13.3 12 13.3C12.88 13.3 13.65 13.7 14.2 14.5" />
      </svg>
    </div>
  );
};
