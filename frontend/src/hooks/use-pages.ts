export async function getPages() {
  return [
    { id: "demo", name: "Operations Overview", pageType: "dashboard", theme: "medical-clean", latestVersion: "v3", qualityScore: 94, updatedAt: "Today, 22:10" },
    { id: "appointments", name: "Recent Appointments", pageType: "list", theme: "medical-clean", latestVersion: "v1", qualityScore: 88, updatedAt: "Yesterday, 19:20" },
  ];
}
