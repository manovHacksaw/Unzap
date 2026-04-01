"use client";

import { motion } from "framer-motion";

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
            className="mt-auto pb-8 flex flex-col items-end"
            variants={sectionVariants}
            initial="initial"
            animate="animate"
        >
            <p className="text-neutral-400 text-sm leading-relaxed mb-7 max-w-[320px] text-right">
                Unzap removes the black box. Guided flows. Live execution on Starknet.
                Real-time visualization of every step — from Cairo to paymaster to confirmation.
            </p>

            <div className="flex items-center gap-7">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="text-xs uppercase tracking-widest text-white hover:text-neutral-300 transition-colors"
                >
                    Watch Demo
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="px-5 py-2.5 text-xs uppercase tracking-widest text-white border transition-all hover:bg-white/5"
                    style={{
                        borderColor: "rgba(255,255,255,0.25)",
                        background: "rgba(255,255,255,0.04)",
                        boxShadow: "0 0 18px rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.1)",
                    }}
                >
                    Try Unzap Studio Now
                </motion.button>
            </div>
        </motion.div>
    );
}
