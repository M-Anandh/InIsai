import Link from "next/link";
import { Music2, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-inisai-accent/10 border border-inisai-accent/20 flex items-center justify-center mb-6 text-inisai-accent">
        <Music2 className="w-10 h-10 animate-pulse" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-black mb-3">404</h1>
      <h2 className="text-xl sm:text-2xl font-semibold mb-2">Track or Page Not Found</h2>
      <p className="text-sm max-w-md text-inisai-muted mb-8">
        The melody you are looking for might have been moved, renamed, or is temporarily out of range.
      </p>
      <Link
        href="/"
        className="flex items-center space-x-2 px-6 py-3 rounded-full bg-inisai-accent text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-inisai-accent/25"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}

