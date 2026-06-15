export class DepartmentStatsDto {
    id!: number;
    name!: string;
    code!: string;
    routedCount!: number;
    lastRoutedTitle!: string | null;
    lastRoutedAt!: string | null;
}