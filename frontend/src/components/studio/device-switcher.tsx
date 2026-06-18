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
    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto bg-muted/40 p-1 rounded-xl border border-border">
      {deviceOptions.map((item) => {
        const Icon = iconMap[item.iconName];
        const isActive = device === item.key;

        return (
          <button
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            key={item.key}
            onClick={() => onChangeDevice(item.key)}
            type="button"
            aria-label={`Switch preview resolution to ${item.label} (${item.widthLabel}px)`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="opacity-70 font-mono text-[10px]">{item.widthLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
