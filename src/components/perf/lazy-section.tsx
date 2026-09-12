"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/fade-in";
import { cn } from "@/lib/utils";

interface LazySectionProps {
  componentPath: string;
  componentName: string;
  className?: string;
  fallbackHeight?: number;
}

export function createLazySection(componentPath: string, componentName: string) {
  return function LazySection({ className }: { className?: string }) {
    const DynamicComponent = dynamic(
      () => import(componentPath).then((mod) => mod[componentName as keyof typeof mod] as React.ComponentType<any>),
      {
        loading: () => <Skeleton lines={5} />,
        ssr: false,
      }
    );

    return <DynamicComponent className={className} />;
  };
}

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SectionWrapper({ children, className, id }: SectionWrapperProps) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      {children}
    </section>
  );
}
