import { useState, useEffect, useCallback } from "react";
import { UserSettings } from "@/types/settings";
import { settingsService } from "@/lib/services/settings-service";

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsService.getSettings();
      setSettings({ ...data });
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateProfile = useCallback(async (payload: Partial<UserSettings["profile"]>) => {
    try {
      const updated = await settingsService.updateProfile(payload);
      setSettings({ ...updated });
      return updated;
    } catch (err: any) {
      throw new Error(err?.message ?? "Failed to update profile");
    }
  }, []);

  const updateGenerationPreferences = useCallback(
    async (payload: Partial<UserSettings["generationPreferences"]>) => {
      try {
        const updated = await settingsService.updateGenerationPreferences(payload);
        setSettings({ ...updated });
        return updated;
      } catch (err: any) {
        throw new Error(err?.message ?? "Failed to update generation preferences");
      }
    },
    []
  );

  const updateWorkspace = useCallback(async (payload: Partial<UserSettings["workspace"]>) => {
    try {
      const updated = await settingsService.updateWorkspace(payload);
      setSettings({ ...updated });
      return updated;
    } catch (err: any) {
      throw new Error(err?.message ?? "Failed to update workspace settings");
    }
  }, []);

  const updateSecurityPreferences = useCallback(
    async (payload: Partial<UserSettings["securityPreferences"]>) => {
      try {
        const updated = await settingsService.updateSecurityPreferences(payload);
        setSettings({ ...updated });
        return updated;
      } catch (err: any) {
        throw new Error(err?.message ?? "Failed to update security preferences");
      }
    },
    []
  );

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings,
    updateProfile,
    updateGenerationPreferences,
    updateWorkspace,
    updateSecurityPreferences,
  };
}
