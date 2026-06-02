export class RoutingDocumentDto {
    id!: number;
    registrationNumber!: string;
    title!: string;
    currentDepartment!: string | null;
    suggestedDepartment!: string | null;
    routeStatus!: string;
}