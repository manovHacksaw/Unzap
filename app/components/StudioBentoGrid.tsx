"use client";

import { motion, useReducedMotion } from "framer-motion";
import { 
  ArrowRight,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import { useState, useId } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface GridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[x: number, y: number]>;
  strokeDasharray?: string;
  className?: string;
  [key: string]: unknown;
}

function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "0",
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x, y], i) => (
            <rect
              strokeWidth="0"
              key={`${x}-${y}-${i}`}
              width={width - 1}
              height={height - 1}
              x={x * width + 1}
              y={y * height + 1}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}

function getRandomPattern(length?: number): [x: number, y: number][] {
  length = length ?? 5;
  return Array.from({ length }, () => [
    Math.floor(Math.random() * 10),
    Math.floor(Math.random() * 10),
  ]);
}

export interface BentoItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  className?: string;
  featured?: boolean;
}

interface BentoCardProps extends BentoItem {}

function BentoCard({ title, description, icon: Icon, href, className, featured = false }: BentoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2,
        duration: 0.4,
      }
    }
  };

  const glowVariants = {
    initial: { opacity: 0 },
    hover: { 
      opacity: 0.15,
      transition: { duration: 0.3 }
    }
  };

  return (
    <Link href={href} className={cn("block h-full", className)}>
      <motion.div
        className={cn(
          "group relative isolate z-0 flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 backdrop-blur-xl p-8 transition-all duration-500",
          "hover:border-[#fbbf24]/50 hover:shadow-2xl hover:shadow-[#fbbf24]/5",
          "h-full"
        )}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate="visible"
        variants={shouldReduceMotion ? {} : cardVariants}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 [mask-image:linear-gradient(225deg,black,transparent)]">
            <GridPattern
              width={40}
              height={40}
              x={0}
              y={0}
              squares={getRandomPattern(8)}
              className="fill-amber-500/5 stroke-amber-500/10 absolute inset-0 size-full transition-transform duration-500 ease-out group-hover:scale-110"
            />
          </div>
          
          {/* Glow Effect */}
          <motion.div
            className="absolute -inset-[20%] bg-[#fbbf24] blur-[100px]"
            variants={glowVariants}
            initial="initial"
            animate={isHovered ? "hover" : "initial"}
          />
        </div>

        {/* Content */}
        <motion.div 
          className="relative z-10 flex flex-col h-full"
          variants={shouldReduceMotion ? {} : contentVariants}
        >
          {/* Icon */}
          <motion.div 
            className="mb-6 w-fit rounded-2xl border border-[#fbbf24]/20 bg-[#fbbf24]/10 p-4 backdrop-blur-md"
            whileHover={{ scale: 1.1, rotate: i => i % 2 === 0 ? 5 : -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="text-[#fbbf24]">
              <Icon className="w-6 h-6" />
            </div>
          </motion.div>

          {/* Text Content */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#fbbf24] transition-colors duration-300 tracking-tight">
                {title}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed font-mono">
                {description}
              </p>
            </div>

            {/* Hover Action */}
            <motion.div
              className="mt-8 flex items-center gap-2 text-[#fbbf24] text-xs font-bold uppercase tracking-widest"
              initial={{ opacity: 0, x: -10 }}
              animate={{ 
                opacity: isHovered ? 1 : 0,
                x: isHovered ? 0 : -10
              }}
              transition={{ duration: 0.3 }}
            >
              <span>Explore Module</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </div>

          {/* Featured Badge */}
          {featured && (
            <motion.div
              className="absolute top-0 right-0 flex items-center gap-1.5 rounded-full bg-[#fbbf24]/20 border border-[#fbbf24]/30 px-4 py-1.5 backdrop-blur-md"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#fbbf24]">Featured</span>
            </motion.div>
          )}
        </motion.div>

        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-neutral-950/20 pointer-events-none group-hover:bg-transparent transition-colors duration-500" />
      </motion.div>
    </Link>
  );
}

interface StudioBentoGridProps {
  items: BentoItem[];
}

export function StudioBentoGrid({ items }: StudioBentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <BentoCard key={index} {...item} />
      ))}
    </div>
  );
}
