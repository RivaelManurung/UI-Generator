import { adminService } from "@/lib/services/admin-service";

export async function getAdminUsers() {
  return adminService.listUsers();
}

export async function getGenerationJobs() {
  return adminService.listGenerationJobs();
}
