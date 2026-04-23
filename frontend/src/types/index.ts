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



export interface DocumentListItem {
  id: number;
  registrationNumber: string;
  title: string;
  senderName: string;
  receivedDate: string;
  documentType: string;
  category: string;
  currentStatus: string;
  department: string;
}

export interface DocumentCard {
  id: number;
  registrationNumber: string;
  title: string;
  senderName: string;
  receivedDate: string;
  documentType: string;
  category: string;
  currentStatus: string;
  department: string;
  files: DocumentFile[];
  ocrText: OcrResult[];
  classification: DocumentClassification;
  routes: DocumentRoute[];
}

export interface DocumentFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface OcrResult {
  id: number;
  rawText: string;
  normalizedText: string;
  language: string;
  ocrConfidence: number;
}

export interface DocumentClassification {
  type: string;
  category: string;
  typeConfidence: number;
  categoryConfidence: number;
  isVerified: boolean;
}

export interface DocumentRoute {
  department: string;
  status: string;
  reason?: string;
  routedAt: string;
}

export interface DocumentsFilters {
  typeId?: number;
  categoryId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface DocumentsListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}