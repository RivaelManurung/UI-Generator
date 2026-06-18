export interface CreditBalance {
  available: number;
  monthlyLimit: number;
  usedThisMonth: number;
}

export type TransactionType = "usage" | "refund" | "topup" | "generation";
export type TransactionStatus = "succeeded" | "failed" | "pending";

export interface CreditTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  status: TransactionStatus;
  date?: string; // Support for legacy transaction compatibility
  reference?: string; // Support for legacy transaction compatibility
}
