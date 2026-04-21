export type ProjectStage = "Intake" | "In Validation" | "Pilot" | "Production";
export type ProjectPriority = "Low" | "Medium" | "High" | "Urgent";
export type ProjectRisk = "Low" | "Medium" | "High";

export type LaunchParty = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type Project = {
  id: string;
  title: string;
  owner: string;
  stage: ProjectStage;
  priority: ProjectPriority;
  riskLevel: ProjectRisk;
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
  projectId: string | null;
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

export function listProjects() {
  return request<Project[]>("/projects");
}

export function createProject(input: {
  title: string;
  owner: string;
  stage?: ProjectStage;
  priority?: ProjectPriority;
  riskLevel?: ProjectRisk;
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
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateProject(id: string, patch: Partial<Project>) {
  return request<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
}

export function deleteProject(id: string) {
  return request<void>(`/projects/${id}`, {
    method: "DELETE"
  });
}

export function listTasks(projectId?: string) {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return request<Task[]>(`/tasks${query}`);
}

export function createTask(input: {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  taskType?: string;
  projectId?: string | null;
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
