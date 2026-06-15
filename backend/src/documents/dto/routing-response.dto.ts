export class RoutingDocumentDto {
    id!: number;
    registrationNumber!: string;
    title!: string;
    currentDepartment!: string;
    suggestedDepartment!: string;
    routeStatus!: string;
    operatorName!: string;
    operatorAvatarUrl!: string | null;
    routedAt!: string;
    routeReason?: string | null;
}

export class RoutingOperatorDto {
    id!: number;
    fullName!: string;
}

export class RoutingStatsDto {
    total!: number;
    matched!: number;
    mismatched!: number;
}

export class RoutingResponseDto {
    stats!: RoutingStatsDto;
    items!: RoutingDocumentDto[];
    operators!: RoutingOperatorDto[];
    page!: number;
    totalPages!: number;
    totalItems!: number;
}