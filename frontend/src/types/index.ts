export interface LoginResponse {
  access_token: string; 
}

export interface RecentDocument {
  id: number;
  registrationNumber: string;
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

export interface DocumentSource {
    sourceType: string;
    organizationName: string | null;
    senderName: string | null;
    contactInfo: string | null;
}

export interface DocumentCard {
  id: number;
  registrationNumber: string;
  title: string;
  senderName: string;
  receivedDate: string;
  documentType: string | null;   
  category: string | null;       
  currentStatus: string;
  files: DocumentFile[];
  createdBy: string;
  createdAt: string;
  confidenceScore: number | null;
  ocrResult: OcrResult | null;
  classification: DocumentClassification | null; 
  routes: DocumentRoute[];
  source: DocumentSource | null;  
  aiResult: DocumentAiResult | null;
}

export interface DocumentFile {
  id: number;
  fileName: string;
  fileType: string;
  filePath: string;
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
  id: number;
  type: string | null;
  category: string | null;
  typeConfidence: number;
  categoryConfidence: number;
  isVerified: boolean;
  createdAt: string;
}

export interface DocumentRoute {
  departmentName: string; 
  routeStatus: string;   
  routeReason: string | null; 
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

export interface DocumentType {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export interface DocumentCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}


export interface AiSettings {
  id: number;
  providerCode: string;
  modelName: string;
  apiKey: string;
  baseUrl: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface UpdateAiSettings {
  providerCode: string;
  modelName: string;
  apiKey: string;
  baseUrl?: string | null;
}

export interface AiProvider {
  providerCode: string;
  providerName: string;
  models: AiModel[];
}

export interface AiModel {
  modelCode: string;
  modelName: string;
}

export interface DocumentAiResult {
  id: number;
  documentId: number;
  documentTypeSuggested: string | null;
  categorySuggested: string | null;
  summaryText: string | null;
  departmentSuggested: string | null;
  confidenceScore: number | null;
  providerCode: string;
  modelName: string;
  createdAt: string;
}

export interface UploadResponse {
  id: number;
  registrationNumber: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

export interface ExtractTextResponse {
  id: number;
  documentId: number;
  rawText: string;
  normalizedText: string;
  language: string;
  ocrConfidence: number;
  processedAt: string;
}
