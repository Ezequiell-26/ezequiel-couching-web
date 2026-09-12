"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({
  end,
  duration = 2,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * end);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [inView, end, duration]);

  const formatted = count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <span ref={ref} className={cn("font-bold", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

interface StatCardProps {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  icon?: React.ReactNode;
  delay?: number;
  className?: string;
}

export function StatCard({
  value,
  label,
  suffix = "",
  prefix = "",
  icon,
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "rounded-xl border bg-card p-6 text-center shadow-sm",
        className
      )}
    >
      {icon && <div className="mb-4 flex justify-center text-primary">{icon}</div>}
      <div className="text-4xl font-bold tracking-tight">
        <CountUp end={value} prefix={prefix} suffix={suffix} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}
