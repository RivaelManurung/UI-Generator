import { ApiKey } from "@/types/api-key";
import { http } from "@/lib/api/http";

export const apiKeyService = {
  async listApiKeys(): Promise<ApiKey[]> {
    return http.get<ApiKey[]>("/api-keys");
  },

  async createApiKey(name: string): Promise<{ key: ApiKey; rawValue: string }> {
    return http.post<{ key: ApiKey; rawValue: string }>("/api-keys", { name });
  },

  async revokeApiKey(id: string): Promise<boolean> {
    await http.delete<{ success: boolean }>(`/api-keys/${id}`);
    return true;
  },
};
