export interface CreditBalance {
  available: number;
  monthlyLimit: number;
  usedThisMonth: number;
}

export interface CreditPackage {
  slug: string;
  name: string;
  description: string;
  priceIdr: number;
  credits: number;
}

export interface CheckoutResult {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
}

export type PaymentStatusValue = "pending" | "paid" | "failed" | "expired" | "cancelled";

export interface PaymentStatus {
  orderId: string;
  status: PaymentStatusValue;
  packageSlug: string;
  amountIdr: number;
  credits: number;
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
