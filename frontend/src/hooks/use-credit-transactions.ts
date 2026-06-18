import { useState, useEffect, useCallback } from "react";
import { CreditTransaction } from "@/types/credit";
import { creditService } from "@/lib/services/credit-service";

export function useCreditTransactions() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await creditService.getCreditTransactions();
      setTransactions(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch transactions list");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
  };
}
