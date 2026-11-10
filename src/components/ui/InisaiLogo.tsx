import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  compact?: boolean;
}

export const InisaiLogo: React.FC<LogoProps> = ({
  className = "",
  size = "md",
  showText = true,
  compact = false,
}) => {
  const iconSizes = {
    sm: "w-8 h-8",
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
      {/* Brand Emblem */}
      <div
        className={`relative ${iconSizes[size]} rounded-xl bg-gradient-to-tr from-[#FF8A3D] via-[#FF3D77] to-[#7A5CFF] p-[1.5px] shadow-md flex items-center justify-center flex-shrink-0`}
      >
        <div className="w-full h-full bg-[#13111B] rounded-[10px] flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
          >
            <path
              d="M4 16C4 9.37 9.37 4 16 4"
              stroke="#FF8A3D"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M17 22V9C17 7.5 19 6.5 22 7.5V11C20 10.5 19 11 19 12V22"
              fill="url(#logo-grad)"
            />
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
                <stop stopColor="#FF3D77" />
                <stop offset="1" stopColor="#7A5CFF" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className={`font-display font-extrabold tracking-tight text-slate-900 dark:text-[#F6F3EE] ${textSizes[size]}`}>
              InIsai
            </span>
            {!compact && (
              <span className="hidden md:inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-inisai-accent/15 text-inisai-accent font-tamil">
                இனிசை
              </span>
            )}
          </div>
          {!compact && (
            <span className="hidden md:block text-[10px] text-slate-500 dark:text-inisai-muted font-medium -mt-0.5 tracking-wide">
              Every Beat, Your World.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
