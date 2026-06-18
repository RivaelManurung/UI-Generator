"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./password-input";
import { ToggleRow } from "./toggle-row";
import { RuleItem } from "./rule-item";
import { UserSettings } from "@/types/settings";

interface SecuritySettingsProps {
  preferences: UserSettings["securityPreferences"];
  onSave: (payload: Partial<UserSettings["securityPreferences"]>) => Promise<any>;
}

export function SecuritySettings({ preferences, onSave }: SecuritySettingsProps) {
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(preferences.twoFactorEnabled);
  const [loginAlerts, setLoginAlerts] = useState(preferences.loginAlerts);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUpdatingPassword(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setUpdatingPassword(false);
    alert("Password updated successfully (mocked).");
  }

  async function handleToggle2FA(checked: boolean) {
    setTwoFactorEnabled(checked);
    await onSave({ twoFactorEnabled: checked, loginAlerts });
  }

  async function handleToggleAlerts(checked: boolean) {
    setLoginAlerts(checked);
    await onSave({ twoFactorEnabled, loginAlerts: checked });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Protect your account and generation workspace.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  placeholder="Current password"
                  visible={currentPasswordVisible}
                  onVisibleChange={setCurrentPasswordVisible}
                  autoComplete="current-password"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  placeholder="New password"
                  visible={newPasswordVisible}
                  onVisibleChange={setNewPasswordVisible}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Password policy</p>
              <div className="mt-3 grid gap-2">
                <RuleItem text="Minimum 8 characters." />
                <RuleItem text="Use a mix of letters, numbers, and symbols." />
                <RuleItem text="Avoid reusing passwords from other accounts." />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updatingPassword}>
                <LockKeyhole className="h-4 w-4" />
                {updatingPassword ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Protection</CardTitle>
          <CardDescription>Additional account protection.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3">
          <ToggleRow
            title="Two-factor authentication"
            description="Require verification code during login."
            checked={twoFactorEnabled}
            onCheckedChange={handleToggle2FA}
            icon={ShieldCheck}
          />

          <ToggleRow
            title="Login alerts"
            description="Notify when a new device signs in."
            checked={loginAlerts}
            onCheckedChange={handleToggleAlerts}
            icon={Bell}
          />
        </CardContent>
      </Card>
    </div>
  );
}
