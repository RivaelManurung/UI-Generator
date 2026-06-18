import { CreditBalance, CreditTransaction } from "@/types/credit";

let mockBalanceStore: CreditBalance = {
  available: 235,
  monthlyLimit: 500,
  usedThisMonth: 265,
};

const mockTransactionsStore: CreditTransaction[] = [
  {
    id: "tx_001",
    type: "generation",
    amount: -3,
    balanceAfter: 235,
    description: "Warehouse dashboard generation",
    createdAt: "Today, 23:19",
    status: "succeeded",
  },
  {
    id: "tx_002",
    type: "generation",
    amount: -1,
    balanceAfter: 238,
    description: "Prompt boosting",
    createdAt: "Today, 22:48",
    status: "succeeded",
  },
  {
    id: "tx_003",
    type: "refund",
    amount: 3,
    balanceAfter: 239,
    description: "Schema validation refund",
    createdAt: "Yesterday, 18:42",
    status: "succeeded",
  },
  {
    id: "tx_004",
    type: "topup",
    amount: 120,
    balanceAfter: 236,
    description: "Pro monthly top-up credits",
    createdAt: "Jun 1, 2026",
    status: "succeeded",
  },
];

export function getMockCreditBalance(): CreditBalance {
  return mockBalanceStore;
}

export function getMockTransactions(): CreditTransaction[] {
  return mockTransactionsStore;
}

export function deductMockCredits(amount: number, description: string): boolean {
  if (mockBalanceStore.available < amount) return false;
  mockBalanceStore.available -= amount;
  mockBalanceStore.usedThisMonth += amount;
  
  mockTransactionsStore.unshift({
    id: `tx_${Date.now()}`,
    type: amount > 0 ? "generation" : "refund",
    amount: -amount,
    balanceAfter: mockBalanceStore.available,
    description,
    createdAt: "Just now",
    status: "succeeded",
  });
  return true;
}

export function addMockCredits(amount: number, description: string) {
  mockBalanceStore.available += amount;
  mockTransactionsStore.unshift({
    id: `tx_${Date.now()}`,
    type: "topup",
    amount,
    balanceAfter: mockBalanceStore.available,
    description,
    createdAt: "Just now",
    status: "succeeded",
  });
}
