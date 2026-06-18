import { useState, useEffect, useCallback } from "react";
import { CreditBalance } from "@/types/credit";
import { creditService } from "@/lib/services/credit-service";

export function useCreditBalance() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await creditService.getCreditBalance();
      setBalance({ ...data });
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch credit balance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const purchaseCredits = useCallback(async (amount: number) => {
    try {
      const updated = await creditService.purchaseCredits(amount);
      setBalance({ ...updated });
      return updated;
    } catch (err: any) {
      throw new Error(err?.message ?? "Purchase failed");
    }
  }, []);

  const deductCredits = useCallback(async (amount: number, description: string) => {
    try {
      const success = await creditService.deductCredits(amount, description);
      if (success) {
        const updated = await creditService.getCreditBalance();
        setBalance({ ...updated });
      }
      return success;
    } catch {
      return false;
    }
  }, []);

  return {
    balance,
    loading,
    error,
    refresh: fetchBalance,
    purchaseCredits,
    deductCredits,
  };
}
