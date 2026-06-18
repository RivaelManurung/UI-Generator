import { AuthUser } from "@/types/auth";

export const mockCurrentUser: AuthUser = {
  id: "rivael-user-id",
  name: "Rivael Manurung",
  email: "rivael@example.com",
  role: "admin", // Enable admin dashboard routes for sandbox E2E tests
};
