export type TabKey =
  | "profile"
  | "generation"
  | "workspace"
  | "security"
  | "api-keys"
  | "billing";

export interface SettingsTab {
  value: TabKey;
  label: string;
}

export const settingsTabs: SettingsTab[] = [
  { value: "profile", label: "Profile" },
  { value: "generation", label: "Generation" },
  { value: "workspace", label: "Workspace" },
  { value: "security", label: "Security" },
  { value: "api-keys", label: "API keys" },
  { value: "billing", label: "Billing" },
];
