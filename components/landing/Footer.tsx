"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="py-16 border-t border-white/5 text-center bg-black/40 backdrop-blur-md">
            <div className="flex items-center justify-center gap-1.5 mb-4 opacity-90">
                <Image
                    src="/logo.png"
                    alt="UniBridge logo"
                    width={50}
                    height={50}
                    className="h-[50px] w-[50px] object-contain"
                />
                <span className="text-xl font-bold tracking-tight text-white uppercase leading-none">
                    UniBridge Systems
                </span>
            </div>
            <p className="text-[10px] text-neutral-600 mb-10 tracking-[0.2em] uppercase">
                Autonomous Intelligence for Nigerian Universities.
            </p>

            <div className="flex justify-center gap-8 text-[10px] text-neutral-600 uppercase tracking-widest font-medium">
                <Link href="#" className="hover:text-white transition-colors">
                    Terms
                </Link>
                <Link href="#" className="hover:text-white transition-colors">
                    Privacy
                </Link>
                <Link href="#" className="hover:text-white transition-colors">
                    Contact
                </Link>
            </div>
        </footer>
    );
}
