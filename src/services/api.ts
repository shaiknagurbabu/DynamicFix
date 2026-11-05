import type { RecordData } from "../../shared/modules";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export interface ApiRecord extends RecordData {
  _recordId: string;
  _archived: string;
}

export interface RecordListQuery {
  page: number;
  limit: number;
  search?: string;
  filterField?: string;
  filterValue?: string;
  includeArchived?: boolean;
}

export interface RecordListResponse {
  records: ApiRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The API server could not be reached.";
    throw new ApiRequestError(`Could not connect to the ERP API: ${message}`, 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    let payload: ApiErrorBody = {};
    try {
      payload = await response.json() as ApiErrorBody;
    } catch (error) {
      console.error("Could not read the API error response.", error);
    }
    throw new ApiRequestError(
      payload.error?.message ?? `The API request failed with HTTP ${response.status}.`,
      response.status,
      payload.error?.code,
    );
  }

  try {
    return await response.json() as T;
  } catch (error) {
    console.error("The ERP API returned an invalid response.", error);
    throw new ApiRequestError("The API returned an invalid response.", response.status, "INVALID_RESPONSE");
  }
}

export async function login(baseUrl: string, email: string, password: string): Promise<{ accessToken: string; user: AuthenticatedUser }> {
  return request(baseUrl, "/api/auth/login", { method: "POST", body: { email, password } });
}

export async function getCurrentUser(baseUrl: string, token: string): Promise<{
  user: AuthenticatedUser;
  roles: string[];
  permissions: string[];
}> {
  return request(baseUrl, "/api/auth/me", { token });
}

export async function getRecords(
  baseUrl: string,
  token: string,
  moduleId: string,
  query: RecordListQuery,
): Promise<RecordListResponse> {
  const search = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    ...(query.search ? { search: query.search } : {}),
    ...(query.filterField && query.filterValue ? { filterField: query.filterField, filterValue: query.filterValue } : {}),
    ...(query.includeArchived ? { includeArchived: "true" } : {}),
  });
  const response = await request<{ records: Array<{
    id: string;
    data: RecordData;
    archivedAt: string | null;
  }>; pagination: RecordListResponse["pagination"] }>(
    baseUrl,
    `/api/modules/${encodeURIComponent(moduleId)}/records?${search.toString()}`,
    { token },
  );
  return {
    records: response.records.map(({ id, data, archivedAt }) => ({
      ...data,
      _recordId: id,
      _archived: archivedAt ? "true" : "false",
    })),
    pagination: response.pagination,
  };
}

export async function getAllRecords(
  baseUrl: string,
  token: string,
  moduleId: string,
  query: Omit<RecordListQuery, "page" | "limit">,
): Promise<ApiRecord[]> {
  const limit = 100;
  const firstPage = await getRecords(baseUrl, token, moduleId, { ...query, page: 1, limit });
  const records = [...firstPage.records];
  for (let page = 2; page <= firstPage.pagination.pages; page += 1) {
    const response = await getRecords(baseUrl, token, moduleId, { ...query, page, limit });
    records.push(...response.records);
  }
  return records;
}

export async function createRecord(baseUrl: string, token: string, moduleId: string, record: RecordData): Promise<void> {
  await request(baseUrl, `/api/modules/${encodeURIComponent(moduleId)}/records`, {
    token,
    method: "POST",
    body: toApiRecord(record),
  });
}

export async function updateRecord(baseUrl: string, token: string, moduleId: string, record: ApiRecord, changes: RecordData): Promise<void> {
  await request(baseUrl, `/api/modules/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(record._recordId)}`, {
    token,
    method: "PUT",
    body: toApiRecord(changes),
  });
}

export async function deleteRecord(baseUrl: string, token: string, moduleId: string, record: ApiRecord): Promise<void> {
  await request(baseUrl, `/api/modules/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(record._recordId)}`, {
    token,
    method: "DELETE",
  });
}

export async function restoreRecord(baseUrl: string, token: string, moduleId: string, record: ApiRecord): Promise<void> {
  await request(baseUrl, `/api/modules/${encodeURIComponent(moduleId)}/records/${encodeURIComponent(record._recordId)}/restore`, {
    token,
    method: "POST",
  });
}

function toApiRecord(record: RecordData): RecordData {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !key.startsWith("_")),
  );
}
