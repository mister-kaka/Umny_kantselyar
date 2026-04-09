
// ответы при логине :)
export interface LoginResponse {
  token: string;
}

// данные дашборда
export interface DashboardData {
  metrics: any[];
  documents: any[];
}