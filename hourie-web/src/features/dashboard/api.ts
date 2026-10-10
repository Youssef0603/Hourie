import { apiRequest } from "../../shared/api/http";
import type { DashboardData } from "./types";

export async function getDashboard() {
  return (await apiRequest<{ data: DashboardData }>("/api/v1/dashboard")).data;
}
