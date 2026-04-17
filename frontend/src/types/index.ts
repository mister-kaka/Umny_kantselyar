export interface LoginResponse {
  access_token: string; 
}

export interface RecentDocument {
  id: number;
  title: string;
  status: string;
  date: string;
}

export interface DepartmentRouteStatus {
  departmentId: number;
  departmentName: string;
  routeStatus: string;
  count: number;
}

export interface DashboardData {
  totalDocuments: number;
  inProgress: number;
  pendingCheck: number;
  recentDocuments: RecentDocument[];
  departmentRouteStatuses: DepartmentRouteStatus[];
}

export interface DepartmentStatus {
  routeStatus: string;
  count: number;
}

export interface GroupedDepartment {
  departmentId: number;
  departmentName: string;
  statuses: DepartmentStatus[];
}