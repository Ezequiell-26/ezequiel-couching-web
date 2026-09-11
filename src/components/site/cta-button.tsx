"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { Button, type ButtonProps } from "@/components/ui/button";

type ViewArg = Parameters<ReturnType<typeof useRouter.getState>["navigate"]>[0];

/** Botón CTA que navega a una vista del router con evento de analítica. */
export function CTAButton({
  view,
  params,
  event,
  eventProps,
  source,
  withArrow = true,
  children,
  ...rest
}: ButtonProps & {
  view: ViewArg;
  params?: Record<string, string>;
  event?: string;
  eventProps?: Record<string, unknown>;
  source?: string;
  withArrow?: boolean;
}) {
  const navigate = useRouter((s) => s.navigate);
  return (
    <Button
      onClick={() => {
        if (event) track(event, { ...eventProps, source });
        navigate(view, params as never, { source });
      }}
      {...rest}
    >
      {children}
      {withArrow ? <ArrowRight aria-hidden /> : null}
    </Button>
  );
}
