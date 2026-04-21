"use client";

import { motion } from "framer-motion";

const containerVariants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

const lineVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
        } as const,
    },
};

export default function HeroText() {
    return (
        <motion.div
            className="mt-auto pb-8"
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            <motion.span
                variants={lineVariants}
                className="text-neutral-400 text-[11px] tracking-widest mb-5 block"
                style={{ fontFamily: "monospace" }}
            >
                [ CAIRO CONTRACT LAB ]
            </motion.span>

            <motion.h1 className="font-black uppercase leading-[0.92] tracking-tight">
                <motion.span
                    variants={lineVariants}
                    className="block text-white"
                    style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
                >
                    WRITE CAIRO.
                </motion.span>
                <motion.span
                    variants={lineVariants}
                    className="block"
                    style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
                >
                    COMPILE.{" "}
                    <span
                        style={{
                            background: "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 30%, #ffffff 55%, #6b7280 80%, #d1d5db 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        DEPLOY.
                    </span>
                </motion.span>
                <motion.span
                    variants={lineVariants}
                    className="block text-white"
                    style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
                >
                    SHIP YOUR APP.
                </motion.span>
            </motion.h1>

            <motion.p
                variants={lineVariants}
                className="mt-6 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base"
            >
                A browser-native lab for Cairo smart contracts. Write code, compile via Docker,
                deploy gaslessly to Starknet, interact on-chain, and generate a typed Next.js starter.
            </motion.p>
        </motion.div>
    );
}
