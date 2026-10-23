export interface User {
  id: number;
  name: string;
  email: string;
  role: "manager" | "agent";
}

export interface Property {
  id: number;
  title: string;
  locality: string;
  deal: "sale" | "rent";
  type: "flat" | "house" | "plot" | "shop";
  bhk: number | null;
  price: number;
}

export interface Requirement {
  id: number;
  client_name: string;
  phone: string;
  deal: "sale" | "rent";
  type: "flat" | "house" | "plot" | "shop";
  localities: string[];
  bhk: number | null;
  budget_max: number;
  assigned_to: number;
  assigned_agent_name?: string;
}

export interface MatchItem {
  property: Property;
  score: number;
  flags: string[];
  status: "shared" | null;
}

export interface ReverseMatchItem {
  requirement: Requirement;
  score: number;
  flags: string[];
  status: "shared" | null;
}

export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface CsvImportResponse {
  imported: number;
  errors: Array<{
    line: number;
    field: string;
    message: string;
  }>;
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("propdesk_token");
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("propdesk_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: User): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("propdesk_token", token);
    window.localStorage.setItem("propdesk_user", JSON.stringify(user));
  } catch {}
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("propdesk_token");
    window.localStorage.removeItem("propdesk_user");
  } catch {}
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    const fieldErrors: Record<string, string> = {};
    try {
      const body = await res.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
      if (Array.isArray(body.errors)) {
        for (const err of body.errors as FieldValidationError[]) {
          if (err.field && err.message && !fieldErrors[err.field]) {
            fieldErrors[err.field] = err.message;
          }
        }
      }
    } catch {}
    throw new ApiError(res.status, detail, fieldErrors);
  }

  return (await res.json()) as T;
}
