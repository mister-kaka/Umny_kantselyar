export class RecentDocumentDto {
  id!: number;
  registrationNumber!: string;
  title!: string;
  status!: string;
  date!: Date | null;
}

export class DepartmentRouteStatusDto {
  departmentId!: number;
  departmentName!: string;
  routeStatus!: string;
  count!: number;
}

export class DashboardResponseDto {
  totalDocuments!: number;
  inProgress!: number;
  pendingCheck!: number;
  routedCount!: number;
  recentDocuments!: RecentDocumentDto[];
   departmentRouteStatuses!: DepartmentRouteStatusDto[];
}