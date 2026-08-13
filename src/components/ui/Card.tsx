"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  glass?: boolean;
}

export function Card({ className, hover = true, glass = true, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-[20px] card-shadow",
        glass ? "glass" : "glass-solid",
        hover && "transition-shadow duration-300",
        className
      )}
      whileHover={hover ? { y: -3, transition: { duration: 0.25, ease: "easeOut" } } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
