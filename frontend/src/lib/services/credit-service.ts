import { CreditBalance, CreditTransaction } from "@/types/credit";
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

  async purchaseCredits(amount: number): Promise<CreditBalance> {
    return http.post<CreditBalance>("/credits/purchase", { amount });
  },

  async deductCredits(amount: number, description: string): Promise<boolean> {
    const result = await http.post<{ success: boolean }>("/credits/deduct", {
      amount,
      description,
    });
    return result.success;
  },
};
