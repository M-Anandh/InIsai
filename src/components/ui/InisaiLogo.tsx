import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const InisaiLogo: React.FC<LogoProps> = ({
  className = "",
  size = "md",
  showText = true,
}) => {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Original InIsai Symbol: Stylized Eighth Note + Audio Soundwave Ring */}
      <div
        className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-tr from-inisai-accent via-inisai-teal to-inisai-emerald p-0.5 shadow-lg shadow-inisai-accent/30 flex items-center justify-center`}
      >
        <div className="w-full h-full bg-inisai-card rounded-[14px] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-inisai-accent"
          >
            {/* Audio Waveform Arc */}
            <path
              d="M4 16C4 9.37 9.37 4 16 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-inisai-teal"
            />
            {/* Music Note Stem & Flag */}
            <path
              d="M17 22V9C17 7.5 19 6.5 22 7.5V11C20 10.5 19 11 19 12V22"
              fill="url(#logo-grad)"
            />
            {/* Note Head */}
            <ellipse
              cx="14"
              cy="22"
              rx="4"
              ry="3"
              transform="rotate(-15 14 22)"
              fill="url(#logo-grad)"
            />
            <defs>
              <linearGradient id="logo-grad" x1="10" y1="6" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5">
            <span className={`font-extrabold tracking-tight text-white ${textSizes[size]}`}>
              InIsai
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-inisai-accent/20 text-inisai-accent font-tamil">
              இனிசை
            </span>
          </div>
          <span className="text-[10px] text-inisai-muted font-medium -mt-1 tracking-wide">
            Every Beat, Your World.
          </span>
        </div>
      )}
    </div>
  );
};

