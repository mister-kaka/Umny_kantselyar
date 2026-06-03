export class RouteTemplateDto {
    id!: number;
    name!: string;
    description!: string | null;
    departmentIds!: number[];
    isActive!: boolean;
}