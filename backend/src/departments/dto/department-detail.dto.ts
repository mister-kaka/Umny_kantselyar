export class DepartmentEmployeeDto {
    id!: number;
    fullName!: string;
    email!: string;
    avatarUrl!: string | null;
}

export class DepartmentDetailDto {
    id!: number;
    name!: string;
    code!: string;
    isActive!: boolean;
    totalRouted!: number;
    firstRoutedAt!: string | null;
    lastRoutedAt!: string | null;
    employees!: DepartmentEmployeeDto[];
    documents!: {
        items: any[];
        total: number;
        page: number;
        totalPages: number;
    };
    monthlyStats!: { month: string; count: number }[];
}