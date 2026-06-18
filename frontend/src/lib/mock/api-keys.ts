import { ApiKey } from "@/types/api-key";

const mockApiKeysStore: ApiKey[] = [
  {
    id: "key_1",
    name: "Local Studio",
    prefix: "dg_live_8f4a••••••••",
    scope: "generation:write",
    createdAt: "Jun 7, 2026",
    lastUsedAt: "2 hours ago",
    lastUsed: "2 hours ago",
  },
];

export function getMockApiKeys(): ApiKey[] {
  return mockApiKeysStore;
}

export function createMockApiKey(name: string): { key: ApiKey; rawValue: string } {
  const rawSuffix = Math.random().toString(36).slice(2, 14);
  const rawValue = `dg_live_${rawSuffix}`;
  const key: ApiKey = {
    id: `key_${Date.now()}`,
    name: name.trim(),
    prefix: `dg_live_${rawSuffix.slice(0, 4)}••••••••`,
    scope: "generation:write",
    createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    lastUsedAt: "Never",
    lastUsed: "Never",
  };
  mockApiKeysStore.unshift(key);
  return { key, rawValue };
}

export function revokeMockApiKey(id: string): boolean {
  const index = mockApiKeysStore.findIndex((k) => k.id === id);
  if (index >= 0) {
    mockApiKeysStore.splice(index, 1);
    return true;
  }
  return false;
}
