"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sectionVariants = {
    initial: { opacity: 0, x: 40 },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
        } as const,
    },
};

export default function CTASection() {
    return (
        <motion.div
            className="w-full max-w-sm rounded-[22px] border border-white/8 bg-white/[0.025] p-5 backdrop-blur-sm sm:p-6 xl:mt-auto xl:self-end"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
        >
            <div
                className="mb-3 text-[10px] uppercase tracking-[0.24em] text-neutral-500"
                style={{ fontFamily: "monospace" }}
            >
                Launch the studio
            </div>

            <p className="text-sm leading-relaxed text-neutral-200">
                Open Unzap and start building, deploying, and interacting from one browser-native Starknet workspace.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                Mainnet-ready. Works with Privy or a local extension wallet. No local setup.
            </p>

            <motion.div whileHover={{ y: -2 }} className="mt-5 w-full">
                <Link
                    href="/studio"
                    className="block w-full rounded-[14px] border px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-black transition-all hover:bg-neutral-100"
                    style={{
                        borderColor: "rgba(255,255,255,0.6)",
                        background: "#f5f5f5",
                        boxShadow: "0 12px 28px rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.12) inset",
                    }}
                >
                    Try Unzap Studio Now
                </Link>
            </motion.div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <motion.div whileHover={{ y: -1 }}>
                    <Link
                        href="/studio/contract-lab"
                        className="block text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:text-white"
                    >
                        Open Contract Lab
                    </Link>
                </motion.div>

                <motion.a
                    whileHover={{ y: -1 }}
                    href="https://x.com/manovmandal/status/2039754947861073988"
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[11px] uppercase tracking-[0.18em] text-neutral-400 transition-colors hover:text-white"
                >
                    Watch Demo ↗
                </motion.a>
            </div>
        </motion.div>
    );
}
