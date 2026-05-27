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

export interface VerifyDocumentData {
  typeId: number;
  categoryId: number;
  departmentId: number;
  status: string;
  comment?: string;
}

export interface RouteDocumentData {
  departmentId: number;
  templateId?: number;
  comment?: string;
}

export interface RoutingDocument {
  id: number;
  registrationNumber: string;
  title: string;
  currentDepartment: string;
  suggestedDepartment: string;
  routeStatus: string;
}

export interface UpdateRouteStatusData {
  status: 'delivered' | 'read' | 'rejected';
  comment?: string;
}

export interface UpdateDocumentData {
  title?: string;
  senderName?: string;
  documentTypeId?: number;
  categoryId?: number;
}

export interface Profile {
  id: number;
  name: string;
  email: string;
  department?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
    code: string;
  };
  avatarUrl?: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

export interface NotificationSettings {
  newDocument: boolean;
  aiComplete: boolean;
  extractError: boolean;
  pendingVerification: boolean;
  routedToDepartment: boolean;
}

export interface InterfaceSettings {
  compactView: boolean;
  showConfidence: boolean;
  defaultPageLimit: number;
  theme: 'light' | 'dark';
}

export interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface LoginHistoryItem {
  id: number;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
}

export interface AuditLogItem {
  id: number;
  userId: number;
  userName: string;
  action: string;
  documentId?: number;
  details: string;
  createdAt: string;
}

export interface Comment {
  id: number;
  userId: number;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ExportFilters {
  typeId?: number;
  categoryId?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AppNotification {
  id: number;
  type: 'new_document' | 'ai_complete' | 'extract_error' | 'pending_verification' | 'routed_to_department';
  title: string;
  message: string;
  documentId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}