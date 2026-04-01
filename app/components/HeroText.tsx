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
                [ LIVE EXECUTION ]
            </motion.span>

            <motion.h1 className="font-black uppercase leading-[0.92] tracking-tight">
                <motion.span
                    variants={lineVariants}
                    className="block text-white"
                    style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
                >
                    BUILD ON STARKNET.
                </motion.span>
                <motion.span
                    variants={lineVariants}
                    className="block"
                    style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
                >
                    POWERED BY{" "}
                    <span
                        style={{
                            background: "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 30%, #ffffff 55%, #6b7280 80%, #d1d5db 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        STARKZAP.
                    </span>
                </motion.span>
                <motion.span
                    variants={lineVariants}
                    className="block text-white"
                    style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}
                >
                    IN YOUR BROWSER.
                </motion.span>
            </motion.h1>
        </motion.div>
    );
}
