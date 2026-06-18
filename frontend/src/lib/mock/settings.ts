import { UserSettings } from "@/types/settings";

const mockSettingsStore: UserSettings = {
  profile: {
    name: "Rivael Manurung",
    email: "rivael@example.com",
    bio: "Full-stack developer focused on dashboard generators, SaaS UI, and production-grade systems.",
    avatarUrl: "",
  },
  generationPreferences: {
    defaultTheme: "jakarta-lite",
    defaultDevice: "desktop-1440",
    promptBoosting: true,
    autoSave: true,
    safeMode: true,
    previewGuides: true,
    compactMode: false,
  },
  workspace: {
    name: "Rivael Workspace",
    slug: "rivael-workspace",
    projectNaming: "prompt-based",
    members: [
      {
        id: "m_01",
        name: "Rivael Manurung",
        email: "rivael@example.com",
        role: "Owner",
        status: "active",
      },
    ],
  },
  securityPreferences: {
    twoFactorEnabled: false,
    loginAlerts: true,
  },
};

export function getMockSettings(): UserSettings {
  return mockSettingsStore;
}

export function updateMockSettings(newSettings: {
  profile?: Partial<UserSettings["profile"]>;
  generationPreferences?: Partial<UserSettings["generationPreferences"]>;
  workspace?: Partial<UserSettings["workspace"]>;
  securityPreferences?: Partial<UserSettings["securityPreferences"]>;
}) {
  if (newSettings.profile) {
    mockSettingsStore.profile = { ...mockSettingsStore.profile, ...newSettings.profile };
  }
  if (newSettings.generationPreferences) {
    mockSettingsStore.generationPreferences = {
      ...mockSettingsStore.generationPreferences,
      ...newSettings.generationPreferences,
    };
  }
  if (newSettings.workspace) {
    mockSettingsStore.workspace = { ...mockSettingsStore.workspace, ...newSettings.workspace };
  }
  if (newSettings.securityPreferences) {
    mockSettingsStore.securityPreferences = {
      ...mockSettingsStore.securityPreferences,
      ...newSettings.securityPreferences,
    };
  }
}
