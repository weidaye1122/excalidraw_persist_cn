import type { BoardListItem, BoardRecord, SessionResponse } from "./types";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const request = async <T>(
  input: string,
  init: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(init.headers || undefined);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return data as T;
};

export const api = {
  getSession: () => request<SessionResponse>("/api/session"),
  login: (password: string) =>
    request<SessionResponse>("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  logout: () =>
    request<void>("/api/logout", {
      method: "POST",
    }),
  listBoards: (includeDeleted = false) =>
    request<{ boards: BoardListItem[] }>(
      `/api/boards?includeDeleted=${includeDeleted ? "1" : "0"}`,
    ),
  getBoard: (boardId: string, includeDeleted = false) =>
    request<{ board: BoardRecord }>(
      `/api/boards/${boardId}?includeDeleted=${includeDeleted ? "1" : "0"}`,
    ),
  createBoard: (name: string) =>
    request<{ board: BoardRecord }>("/api/boards", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateBoard: (
    boardId: string,
    payload: Partial<BoardRecord> & {
      name?: string;
    },
  ) =>
    request<{ board: BoardRecord }>(`/api/boards/${boardId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteBoard: (boardId: string) =>
    request<void>(`/api/boards/${boardId}`, {
      method: "DELETE",
    }),
  restoreBoard: (boardId: string) =>
    request<{ board: BoardRecord }>(`/api/boards/${boardId}/restore`, {
      method: "POST",
    }),
};

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;
