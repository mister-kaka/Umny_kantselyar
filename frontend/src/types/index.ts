export interface LoginResponse {
  access_token: string; 
}

export interface RecentDocument {
  id: number;
  registrationNumber: string;
  title: string;
  status: string;
  date: string;
  uploadedAt?: string;
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
  routedCount: number;
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
  uploadedAt: string;
  documentType: string;
  category: string;
  currentStatus: string;
  department: string;
  isExactMatch?: boolean;
  confidenceScore?: number | null;
}

export interface DocumentSource {
  sourceType: string;
  organizationName: string | null;
  senderName: string | null;
  contactInfo: string | null;
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
  ocrConfidence: number | null;
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
    extractedDate?: string | null;
    extractedAmount?: number | null;
    extractedCounterparty?: string | null;
    keyPhrases?: string[] | null;
    sourceTypeSuggested?: string | null;
    sourceOrganizationSuggested?: string | null;
    sourceSenderSuggested?: string | null;
    sourceContactSuggested?: string | null;
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
    uploadedAt?: string | null;
    currentDepartment: string | null;
}

export interface DocumentsFilters {
  typeId?: number;
  categoryId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  dateField?: string;
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

export interface AiSearchResponse {
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
  ocrConfidence: number | null;
  processedAt: string;
}

export type FileItem = {
  id: string;
  file: File;
  status: "waiting" | "uploading" | "extracting" | "analyzing" | "done" | "error" | "paused" | "cancelled";
  selected: boolean;
  errorMessage?: string;
  documentId?: number;
};

export type UploadStep = "idle" | "processing" | "success" | "error";

export interface VerifyDocumentData {
  typeId?: number;
  categoryId?: number;
  departmentId?: number;
  receivedDate?: string;
  senderName?: string;
  comment?: string;
}

export interface RouteDocumentData {
  departmentId: number;
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
  documentTypeName?: string;
  categoryId?: number;
  categoryName?: string;
  receivedDate?: string;
  extractedAmount?: number;
  extractedDate?: string;
  extractedCounterparty?: string;
  keyPhrases?: string[];
}

export interface Profile {
  id: number;
  fullName: string;
  email: string;
  role: string;
  department: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface NotificationSettings {
  newDocument: boolean;
  documentReady: boolean;
  extractError: boolean;
  pendingVerification: boolean;
  routedToDepartment: boolean;
  rejected: boolean;
  verified: boolean;
  lowConfidence: boolean;
  passwordChanged: boolean;
  profileUpdated: boolean;
  settingsChanged: boolean;
  newLogin: boolean;
  commentAdded: boolean;
  documentDeleted: boolean;
}

export interface InterfaceSettings {
  compactView: boolean;
  showConfidence: boolean;
  defaultPageLimit: number;
  theme: 'light' | 'dark';
}

export interface Session {
  id: number;
  userId: number;
  token: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface LoginHistoryItem {
  id: number;
  userId: number;
  ipAddress: string | null;
  userAgent: string | null;
  loginTime: string;
}

export interface LoginHistoryResponse {
  items: LoginHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditLogItem {
  id: number;
  userId: number;
  userName: string;
  action: string;
  documentId: number | null;
  details: any;
  createdAt: string;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Comment {
  id: number;
  documentId: number;
  userId: number;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ExportFilters {
  typeId?: number;
  categoryId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  dateField?: string;
}

export type AppNotificationType = 
  | 'new_document'
  | 'document_ready'
  | 'extract_error'
  | 'pending_verification'
  | 'routed'
  | 'rejected'
  | 'verified'
  | 'low_confidence'
  | 'password_changed'
  | 'profile_updated'
  | 'settings_changed'
  | 'new_login'
  | 'comment_added'
  | 'document_deleted';

export interface AppNotification {
  id: number;
  type: AppNotificationType;
  title: string;
  message: string;
  documentId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCount {
  total: number;
  newDocument: number;
  documentReady: number;
  extractError: number;
  pendingVerification: number;
  routedToDepartment: number;
  rejected: number;
  verified: number;
  lowConfidence: number;
}

export interface AnalyticsData {
  totalDocuments: number;
  avgConfidence: number;
  rejectedCount: number;
  last7Days: number;
  pendingVerificationCount: number;
  aiProcessedCount: number;
}

export interface RouteTemplate {
  id: number;
  name: string;
  description: string | null;
  departmentIds: number[];
  isActive: boolean;
}