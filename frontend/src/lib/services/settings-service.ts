import { UserSettings } from "@/types/settings";
import { http } from "@/lib/api/http";

export const settingsService = {
  async getSettings(): Promise<UserSettings> {
    return http.get<UserSettings>("/user/profile");
  },

  async updateProfile(payload: Partial<UserSettings["profile"]>): Promise<UserSettings> {
    return http.put<UserSettings>("/user/profile", payload);
  },

  async updateGenerationPreferences(
    payload: Partial<UserSettings["generationPreferences"]>,
  ): Promise<UserSettings> {
    return http.put<UserSettings>("/user/generation-preferences", payload);
  },

  async updateWorkspace(payload: Partial<UserSettings["workspace"]>): Promise<UserSettings> {
    return http.put<UserSettings>("/user/workspace", payload);
  },

  async updateSecurityPreferences(
    payload: Partial<UserSettings["securityPreferences"]>,
  ): Promise<UserSettings> {
    return http.put<UserSettings>("/user/security", payload);
  },
};
