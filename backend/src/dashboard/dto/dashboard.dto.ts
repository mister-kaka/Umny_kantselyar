export class RecentDocumentDto {
  id!: number;
  title!: string;
  status!: string;
  date!: Date;
}

export class DashboardResponseDto {
  totalDocuments!: number;
  inProgress!: number;
  recentDocuments!: RecentDocumentDto[];
}