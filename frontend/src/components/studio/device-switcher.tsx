"use client";

import { Monitor, Laptop, Tablet, Smartphone } from "lucide-react";
import { deviceOptions, DeviceKey } from "@/lib/constants/device-options";

const iconMap = {
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
};

interface DeviceSwitcherProps {
  device: DeviceKey;
  onChangeDevice: (device: DeviceKey) => void;
}

export function DeviceSwitcher({ device, onChangeDevice }: DeviceSwitcherProps) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1">
      {deviceOptions.map((item) => {
        const Icon = iconMap[item.iconName];
        const isActive = device === item.key;

        return (
          <button
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-background hover:text-foreground"
            }`}
            key={item.key}
            onClick={() => onChangeDevice(item.key)}
            type="button"
            aria-pressed={isActive}
            aria-label={`Switch preview resolution to ${item.label} (${item.widthLabel}px)`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
            <span
              className={`font-mono text-[10px] tabular-nums ${
                isActive ? "text-primary-foreground/70" : "text-muted-foreground/70"
              }`}
            >
              {item.widthLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
