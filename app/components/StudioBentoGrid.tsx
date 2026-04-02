"use client";

import { 
  ArrowRight,
  type LucideIcon
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
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
  icon?: LucideIcon;
  image?: string;
  href: string;
  className?: string;
  featured?: boolean;
  comingSoon?: boolean;
  status?: string;
}

interface BentoCardProps extends BentoItem {}

function BentoCard({ title, description, image, href, className, comingSoon = false, status }: BentoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const cardVariants: Variants = {
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

  const contentVariants: Variants = {
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

  const glowVariants: Variants = {
    initial: { opacity: 0 },
    hover: { 
      opacity: 0.15,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className={cn("h-full", className, comingSoon ? "cursor-not-allowed" : "cursor-pointer")}>
      <Link 
        href={comingSoon ? "#" : href} 
        className={cn("block h-full", comingSoon && "pointer-events-none")}
        onClick={(e) => comingSoon && e.preventDefault()}
      >
        <motion.div
           className={cn(
            "group relative isolate z-0 flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 backdrop-blur-xl p-8 transition-all duration-500",
            !comingSoon && "hover:border-white/20 hover:shadow-2xl hover:shadow-white/5",
            comingSoon && "opacity-60",
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
              className="absolute -inset-[20%] bg-white/20 blur-[100px]"
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
            {image && (
              <div className="absolute inset-0 opacity-40 pointer-events-none group-hover:opacity-60 transition-all duration-700 select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-900/40 to-transparent z-10" />
                <img 
                  src={image} 
                  alt={title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            )}

            {/* Text Content */}
            <div className="flex-1 flex flex-col justify-between relative z-20">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3 transition-colors duration-300 tracking-tight">
                  {title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-mono">
                  {description}
                </p>
              </div>

              {/* Hover Action / Status */}
              <motion.div
                className={cn(
                  "mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                  status ? "text-neutral-400" : (comingSoon ? "text-neutral-600" : "text-white/70 group-hover:text-white")
                )}
                initial={comingSoon ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                animate={comingSoon ? { opacity: 1, x: 0 } : { 
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : -10
                }}
                transition={{ duration: 0.3 }}
              >
                <span>{status || (comingSoon ? "Coming Soon" : "Explore Module")}</span>
                {!comingSoon && <ArrowRight className="w-4 h-4" />}
              </motion.div>
            </div>
          </motion.div>

          {/* Glassmorphism Overlay */}
          <div className="absolute inset-0 bg-neutral-950/20 pointer-events-none group-hover:bg-transparent transition-colors duration-500" />
        </motion.div>
      </Link>
    </div>
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
