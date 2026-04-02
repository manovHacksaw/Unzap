"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const navLinks = ["STUDIO", "SOLUTIONS", "DEVELOPERS", "RESOURCES"];

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
            className="relative z-50 flex items-start justify-between px-10 pt-8"
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

            <nav className="flex flex-col items-end gap-1">
                {navLinks.map((link) => (
                    <motion.a
                        key={link}
                        href="#"
                        variants={itemVariants}
                        className="flex items-center gap-1 text-[11px] text-neutral-400 uppercase tracking-[0.15em] hover:text-neutral-200 transition-colors"
                    >
                        {link}
                        <span className="text-[9px] leading-none">↗</span>
                    </motion.a>
                ))}
            </nav>
        </motion.header>
    );
}
