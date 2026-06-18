import { apiClient } from "@/lib/api/client";

export async function getTransactions() {
  return apiClient.transactions();
}
