import { useState, useEffect, useCallback } from "react";
import { ApiKey } from "@/types/api-key";
import { apiKeyService } from "@/lib/services/api-key-service";

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiKeyService.listApiKeys();
      setApiKeys(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = useCallback(async (name: string): Promise<string> => {
    try {
      const { key, rawValue } = await apiKeyService.createApiKey(name);
      setApiKeys((current) => [key, ...current]);
      return rawValue;
    } catch (err: any) {
      throw new Error(err?.message ?? "Failed to generate new key");
    }
  }, []);

  const revokeKey = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await apiKeyService.revokeApiKey(id);
      if (success) {
        setApiKeys((current) => current.filter((k) => k.id !== id));
      }
      return success;
    } catch (err: any) {
      throw new Error(err?.message ?? "Failed to revoke key");
    }
  }, []);

  return {
    apiKeys,
    loading,
    error,
    refresh: fetchKeys,
    createKey,
    revokeKey,
  };
}
