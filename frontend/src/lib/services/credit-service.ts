import {
  CreditBalance,
  CreditTransaction,
  CreditPackage,
  CheckoutResult,
  PaymentStatus,
} from "@/types/credit";
import { http } from "@/lib/api/http";

export const creditService = {
  async getCreditBalance(): Promise<CreditBalance> {
    return http.get<CreditBalance>("/credits/balance");
  },

  async getCreditTransactions(): Promise<CreditTransaction[]> {
    return http.get<CreditTransaction[]>("/credits/transactions");
  },

  async previewGenerationCost(themeSlug: string): Promise<number> {
    const result = await http.post<{ cost: number }>("/credits/preview-cost", { themeSlug });
    return result.cost;
  },

  async deductCredits(amount: number, description: string): Promise<boolean> {
    const result = await http.post<{ success: boolean }>("/credits/deduct", { amount, description });
    return result.success;
  },

  // ---- Top-up via Midtrans ------------------------------------------------

  /** Purchasable credit packs (pricing source of truth, server-defined). */
  async listPackages(): Promise<CreditPackage[]> {
    return http.get<CreditPackage[]>("/credit-packages");
  },

  /** Start a payment for a package; returns a Midtrans Snap token. */
  async checkout(packageSlug: string): Promise<CheckoutResult> {
    return http.post<CheckoutResult>("/payments/checkout", { packageSlug }, { idempotent: true });
  },

  /** Read an order's status (the server reconciles against Midtrans if pending). */
  async getPayment(orderId: string): Promise<PaymentStatus> {
    return http.get<PaymentStatus>(`/payments/${orderId}`);
  },
};
