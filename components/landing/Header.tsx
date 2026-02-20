"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
    return (
        <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl supports-[backdrop-filter]:bg-black/30">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Image
                        src="/logo.png"
                        alt="UniBridge logo"
                        width={50}
                        height={50}
                        className="h-[50px] w-[50px] object-contain"
                        priority
                    />
                    <span className="text-lg font-bold tracking-tight text-white uppercase leading-none">
                        UniBridge Systems
                    </span>
                </div>
                <nav className="hidden md:flex gap-8 text-[11px] font-medium tracking-wide uppercase text-neutral-500">
                    <Link href="#process" className="hover:text-white transition-colors duration-300">
                        Protocol
                    </Link>
                    <Link href="#ecosystem" className="hover:text-white transition-colors duration-300">
                        Ecosystem
                    </Link>
                    <Link href="#solutions" className="hover:text-white transition-colors duration-300">
                        Architecture
                    </Link>
                    <Link href="#pricing" className="hover:text-white transition-colors duration-300">
                        Pricing
                    </Link>
                </nav>
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/auth/login"
                        className="text-[11px] font-medium text-neutral-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        Log In
                    </Link>
                    <Link
                        href="/auth/register"
                        className="flex items-center justify-center px-5 py-2 bg-[#0A8F6A] text-white text-[11px] font-bold rounded-lg hover:bg-[#0A8F6A]/90 transition-all shadow-[0_0_20px_rgba(10,143,106,0.2)] uppercase tracking-wider"
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </header>
    );
}
