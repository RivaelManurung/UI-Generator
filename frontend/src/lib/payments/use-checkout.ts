"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { creditService } from "@/lib/services/credit-service";
import { getAccessToken } from "@/lib/api/auth";
import { payWithSnap } from "@/lib/payments/midtrans-snap";

/**
 * Drives the package → Midtrans Snap checkout flow. Credits are granted by the
 * server webhook, never by the client — `onPaid` is only a UI refresh hook.
 */
export function useCheckout(opts?: { onPaid?: () => void; redirectTo?: string }) {
  const router = useRouter();
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const onPaidRef = useRef(opts?.onPaid);
  onPaidRef.current = opts?.onPaid;
  const redirectTo = opts?.redirectTo ?? "/pricing";

  const startCheckout = useCallback(
    async (slug: string) => {
      if (!getAccessToken()) {
        router.push(`/register?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }
      setBusySlug(slug);
      try {
        const { snapToken } = await creditService.checkout(slug);
        await payWithSnap(snapToken, {
          onSuccess: () => {
            toast.success("Payment received — credits added.");
            onPaidRef.current?.();
          },
          onPending: () => {
            toast.message("Payment pending. Credits arrive once it settles.");
          },
          onError: () => {
            toast.error("Payment failed. Please try again.");
          },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start checkout.");
      } finally {
        setBusySlug(null);
      }
    },
    [router, redirectTo],
  );

  return { startCheckout, busySlug };
}
