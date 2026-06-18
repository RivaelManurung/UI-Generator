export interface ProfileSettings {
  name: string;
  email: string;
  bio: string;
  avatarUrl?: string;
}

export interface GenerationPreferences {
  defaultTheme: string;
  defaultDevice: string;
  promptBoosting: boolean;
  autoSave: boolean;
  safeMode: boolean;
  previewGuides: boolean;
  compactMode: boolean;
}

export interface WorkspaceSettings {
  name: string;
  slug: string;
  projectNaming: string;
  members: WorkspaceMember[];
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "invited" | "suspended";
}

export interface SecurityPreferences {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
}

export interface UserSettings {
  profile: ProfileSettings;
  generationPreferences: GenerationPreferences;
  workspace: WorkspaceSettings;
  securityPreferences: SecurityPreferences;
}
