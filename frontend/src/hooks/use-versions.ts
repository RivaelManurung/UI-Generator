export async function getVersionSummary() {
  return [
    { version: "v3", quality: 94, status: "active", prompt: "Refined weekly patient volume" },
    { version: "v2", quality: 91, status: "saved", prompt: "Added recent appointments table" },
    { version: "v1", quality: 87, status: "saved", prompt: "Initial hospital dashboard" },
  ];
}
