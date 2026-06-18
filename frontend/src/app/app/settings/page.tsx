"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { settingsTabs, TabKey } from "@/lib/constants/settings-tabs";
import { useSettings } from "@/hooks/use-settings";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { useCreditTransactions } from "@/hooks/use-credit-transactions";

import { SettingsOverview } from "@/components/settings/settings-overview";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { GenerationSettings } from "@/components/settings/generation-settings";
import { WorkspaceSettings } from "@/components/settings/workspace-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { ApiKeysSettings } from "@/components/settings/api-keys-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { DangerZone } from "@/components/settings/danger-zone";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const {
    settings,
    loading: settingsLoading,
    updateProfile,
    updateGenerationPreferences,
    updateWorkspace,
    updateSecurityPreferences,
  } = useSettings();

  const {
    apiKeys,
    loading: keysLoading,
    createKey,
    revokeKey,
  } = useApiKeys();

  const {
    balance,
    loading: balanceLoading,
  } = useCreditBalance();

  const {
    transactions,
    loading: transactionsLoading,
  } = useCreditTransactions();

  const loading = settingsLoading || keysLoading || balanceLoading || transactionsLoading;

  if (loading || !settings) {
    return (
      <AppShell title="Settings" subtitle="Loading preferences...">
        <div className="grid gap-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-80 rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" subtitle="Manage profile, generation behavior, credits, security, and API access.">
      <div className="grid gap-6">
        <SettingsOverview
          credits={balance?.available ?? 0}
          monthlyLimit={balance?.monthlyLimit ?? 500}
          apiKeyCount={apiKeys.length}
          safeMode={settings.generationPreferences.safeMode}
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList className="h-auto flex-wrap justify-start rounded-xl bg-muted/60 p-1">
            {settingsTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent className="mt-6" value="profile">
            <ProfileSettings
              profile={settings.profile}
              workspaceName={settings.workspace.name}
              onSave={updateProfile}
            />
          </TabsContent>

          <TabsContent className="mt-6" value="generation">
            <GenerationSettings
              preferences={settings.generationPreferences}
              onSave={updateGenerationPreferences}
            />
          </TabsContent>

          <TabsContent className="mt-6" value="workspace">
            <WorkspaceSettings
              workspace={settings.workspace}
              onSave={updateWorkspace}
            />
          </TabsContent>

          <TabsContent className="mt-6" value="security">
            <SecuritySettings
              preferences={settings.securityPreferences}
              onSave={updateSecurityPreferences}
            />
          </TabsContent>

          <TabsContent className="mt-6" value="api-keys">
            <ApiKeysSettings
              apiKeys={apiKeys}
              onCreateKey={createKey}
              onRevokeKey={revokeKey}
            />
          </TabsContent>

          <TabsContent className="mt-6" value="billing">
            <BillingSettings
              balance={balance}
              transactions={transactions}
            />
          </TabsContent>
        </Tabs>

        <DangerZone
          onDeleteWorkspace={async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }}
        />
      </div>
    </AppShell>
  );
}