export type DeviceKey = "desktop1440" | "desktop1280" | "tablet768" | "mobile390";

export interface DeviceOption {
  key: DeviceKey;
  value: string; // compatibility with settings page value
  label: string;
  widthLabel: string;
  className: string;
  iconName: "Monitor" | "Laptop" | "Tablet" | "Smartphone";
  description?: string;
}

export const deviceOptions: DeviceOption[] = [
  {
    key: "desktop1440",
    value: "desktop-1440",
    label: "Desktop L",
    widthLabel: "1440",
    className: "w-full",
    iconName: "Monitor",
    description: "1440px canvas",
  },
  {
    key: "desktop1280",
    value: "desktop-1280",
    label: "Desktop",
    widthLabel: "1280",
    className: "w-[1280px] max-w-full",
    iconName: "Laptop",
    description: "1280px canvas",
  },
  {
    key: "tablet768",
    value: "tablet-768",
    label: "Tablet",
    widthLabel: "768",
    className: "w-[768px] max-w-full",
    iconName: "Tablet",
    description: "768px canvas",
  },
  {
    key: "mobile390",
    value: "mobile-390",
    label: "Mobile",
    widthLabel: "390",
    className: "w-[390px] max-w-full",
    iconName: "Smartphone",
    description: "390px canvas",
  },
];
