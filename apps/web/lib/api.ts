export type LaunchStage = "Intake" | "In Validation" | "Pilot" | "Production";
export type LaunchPriority = "Low" | "Medium" | "High" | "Urgent";
export type LaunchRisk = "Low" | "Medium" | "High";

export type LaunchParty = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type Launch = {
  id: string;
  title: string;
  owner: string;
  stage: LaunchStage;
  priority: LaunchPriority;
  riskLevel: LaunchRisk;
  dueDate: string | null;
  description: string;
  status: "active" | "archived";
  workspaceId: string;
  workspaceName: string;
  workspaceType: string;
  category: string;
  brand: string;
  market: string;
  stakeholders: LaunchParty[];
  createdAt: string;
  updatedAt: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string | null;
  priority: TaskPriority;
  taskType: string;
  launchId: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      },
      cache: "no-store"
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Network request failed";

    throw new Error(
      `Unable to reach Zample services at ${API_BASE}. Start all services with "npm run dev" from the repo root. (${message})`
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorBody = (await response.json()) as { error?: string; detail?: string };
      message = errorBody.error || errorBody.detail || message;
    } catch {
      // keep default message when body is not JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listLaunches() {
  return request<Launch[]>("/launches");
}

export function createLaunch(input: {
  title: string;
  owner: string;
  stage?: LaunchStage;
  priority?: LaunchPriority;
  riskLevel?: LaunchRisk;
  dueDate?: string | null;
  description?: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceType?: string;
  category?: string;
  brand?: string;
  market?: string;
  stakeholders?: Array<{ name: string; role?: string; email?: string }>;
}) {
  return request<Launch>("/launches", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateLaunch(id: string, patch: Partial<Launch>) {
  return request<Launch>(`/launches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export function deleteLaunch(id: string) {
  return request<void>(`/launches/${id}`, {
    method: "DELETE"
  });
}

export function listTasks(launchId?: string) {
  const query = launchId ? `?launchId=${encodeURIComponent(launchId)}` : "";
  return request<Task[]>(`/tasks${query}`);
}

export function createTask(input: {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  taskType?: string;
  launchId?: string | null;
  status?: TaskStatus;
}) {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateTask(id: string, patch: Partial<Task>) {
  return request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}
