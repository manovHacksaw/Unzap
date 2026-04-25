"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.unzap.xyz";

const navLinks = [
    { label: "CONTRACT LAB", href: APP, external: true },
    { label: "PROJECTS",     href: `${APP}/deployments`,         external: true },
    { label: "STUDIO",       href: `${APP}/studio`,              external: true },
    { label: "DOCS",         href: "/docs" },
    { label: "WORKFLOW",     href: "/#solutions" },
    { label: "GITHUB",       href: "https://github.com/manovHacksaw/Unzap", external: true },
    { label: "X",            href: "https://x.com/manovmandal",             external: true },
];

const navVariants = {
    initial: { opacity: 0, backdropFilter: "blur(10px)" },
    animate: {
        opacity: 1,
        backdropFilter: "blur(0px)",
        transition: {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
            staggerChildren: 0.1,
            delayChildren: 0.2,
        } as const,
    },
};

const itemVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
};

export default function Navbar() {
    return (
        <motion.header
            className="relative z-50 flex flex-col gap-6 px-5 pt-6 sm:px-8 lg:flex-row lg:items-start lg:justify-between lg:px-10 lg:pt-8"
            variants={navVariants}
            initial="initial"
            animate="animate"
        >
            <motion.div
                variants={itemVariants}
                className="flex items-center gap-2.5"
            >
                <Image
                    src="/brand/unzap-logo.png"
                    alt="Unzap logo"
                    width={38}
                    height={38}
                    priority
                    className="h-9 w-9 shrink-0 object-contain"
                />
                <span
                    className="text-white font-bold tracking-[0.25em] text-base uppercase"
                    style={{ letterSpacing: "0.22em" }}
                >
                    Unzap
                </span>
            </motion.div>

            <nav className="grid grid-cols-2 gap-x-5 gap-y-1 self-start text-left sm:flex sm:flex-wrap sm:justify-end lg:flex-col lg:items-end lg:text-right">
                {navLinks.map((link) => (
                    <motion.div
                        key={link.label}
                        variants={itemVariants}
                    >
                        {link.external ? (
                            <a
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[11px] text-neutral-400 uppercase tracking-[0.15em] hover:text-neutral-200 transition-colors"
                            >
                                {link.label}
                                <span className="text-[9px] leading-none">↗</span>
                            </a>
                        ) : (
                            <Link
                                href={link.href}
                                className="flex items-center gap-1 text-[11px] text-neutral-400 uppercase tracking-[0.15em] hover:text-neutral-200 transition-colors"
                            >
                                {link.label}
                                <span className="text-[9px] leading-none">↗</span>
                            </Link>
                        )}
                    </motion.div>
                ))}
            </nav>
        </motion.header>
    );
}
