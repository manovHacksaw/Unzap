"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.unzap.xyz";

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
            className="mt-auto flex flex-col items-end pb-8"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
        >
            <p className="mb-2 text-right text-sm leading-relaxed text-neutral-400">
                Write. Compile.<br />Deploy. Interact.<br />Generate App.
            </p>
            <p className="mb-7 max-w-[320px] text-right text-xs uppercase tracking-widest text-neutral-600">
                No install. No setup. Just Cairo.
            </p>

            <div className="flex items-center gap-7">
                <motion.a
                    whileHover={{ y: -2, scale: 1.03 }}
                    href="https://x.com/manovmandal/status/2039754947861073988"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2.5 border px-4 py-2.5 text-xs uppercase tracking-widest text-white transition-all hover:border-white/35 hover:bg-white/5 hover:text-neutral-100"
                    style={{
                        borderColor: "rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.015)",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
                    }}
                >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Watch Demo
                </motion.a>

                <motion.div whileHover={{ scale: 1.05 }}>
                    <a
                        href={APP}
                        target="_blank"
                        rel="noreferrer"
                        className="block border px-5 py-2.5 text-xs uppercase tracking-widest text-white transition-all hover:bg-white/5"
                        style={{
                            borderColor: "rgba(255,255,255,0.25)",
                            background: "rgba(255,255,255,0.04)",
                            boxShadow: "0 0 18px rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.1)",
                        }}
                    >
                        Open Contract Lab
                    </a>
                </motion.div>
            </div>
        </motion.div>
    );
}
