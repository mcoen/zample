"use client";

import {
  CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ComponentType
} from "react";
import {
  createProject as apiCreateLaunch,
  createTask as apiCreateTask,
  deleteProject as apiDeleteLaunch,
  listProjects,
  listTasks,
  updateProject as apiUpdateLaunch,
  updateTask,
  type LaunchParty,
  type Project,
  type ProjectPriority,
  type ProjectRisk,
  type ProjectStage,
  type Task,
  type TaskPriority,
  type TaskStatus
} from "@/lib/api";

type StakeholderDraft = {
  id: string;
  name: string;
  role: string;
  email: string;
};

type LaunchFormState = {
  title: string;
  owner: string;
  launchType: string;
  category: string;
  brand: string;
  market: string;
  stage: ProjectStage;
  priority: ProjectPriority;
  riskLevel: ProjectRisk;
  dueDate: string;
  description: string;
  stakeholders: StakeholderDraft[];
};

type TaskFormState = {
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
  taskType: string;
  status: TaskStatus;
};

type ChatMessage = {
  id: string;
  sender: string;
  recipients: string[];
  text: string;
  createdAt: string;
};

type ThemeMode = "light" | "dark";

type UserProfile = {
  fullName: string;
  email: string;
  role: string;
};

const LAUNCH_STAGES: ProjectStage[] = ["Intake", "In Validation", "Pilot", "Production"];
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const LAUNCH_TYPE_OPTIONS = ["Beverage", "Condiment", "Snack", "Ingredient", "Other"];
const TASK_PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];
const TASK_TYPE_OPTIONS = ["General", "Validation", "Sensory", "Regulatory", "Packaging", "Commercial"];
const THEME_STORAGE_KEY = "zample_theme_mode";
const PROFILE_STORAGE_KEY = "zample_profile";
const DEFAULT_PROFILE: UserProfile = {
  fullName: "Launch Manager",
  email: "manager@zample.app",
  role: "Program Lead"
};

type IconProps = { className?: string };

function HomeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </svg>
  );
}

function LaunchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M5 20h14" />
      <path d="M12 3s4 4.6 4 8a4 4 0 1 1-8 0c0-3.4 4-8 4-8Z" />
      <path d="M12 14v6" />
    </svg>
  );
}

function ReviewIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

function PulseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M3 13h4l2.5-5 4 10 2.5-5H21" />
    </svg>
  );
}

function SearchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function ChatIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="m8 17-2.8 3.5M9 10h6M9 13h4" />
    </svg>
  );
}

function ProfileIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function PlusIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CreateIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <path d="M9 8V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V8" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}

function SaveIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-3-7 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CancelIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function SyncIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M19 11a7 7 0 0 0-12-3" />
      <path d="M5 13a7 7 0 0 0 12 3" />
    </svg>
  );
}

function EditIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M4 20h4.2L19 9.2a1.9 1.9 0 0 0 0-2.7l-1.5-1.5a1.9 1.9 0 0 0-2.7 0L4 15.8V20Z" />
      <path d="m12.5 7.5 4 4" />
    </svg>
  );
}

function DeleteIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M4 7h16" />
      <path d="M9.5 3h5" />
      <path d="M6.5 7l1 13h9l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function SnackIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M5 10h14v2a7 7 0 0 1-14 0v-2Z" />
      <path d="M8 10V7.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V10" />
      <path d="M10 13.5h4" />
    </svg>
  );
}

function BeverageIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M7 6h10l-1 12H8L7 6Z" />
      <path d="M9 6c0-2.2 1.8-4 4-4" />
      <path d="M10 12h4" />
    </svg>
  );
}

function SauceIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <rect x="8" y="3" width="8" height="4" rx="1.2" />
      <path d="M7 7h10v10a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V7Z" />
      <path d="M9 12h6" />
    </svg>
  );
}

function IngredientIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M12 3 4 9l8 12 8-12-8-6Z" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

const MAIN_NAV: Array<{ id: string; label: string; icon: ComponentType<IconProps> }> = [
  { id: "my_launches", label: "My Launches", icon: LaunchIcon },
  { id: "inbox", label: "Inbox", icon: HomeIcon },
  { id: "reviews", label: "Reviews", icon: ReviewIcon },
  { id: "pulse", label: "Pulse", icon: PulseIcon }
];

function safeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatRelative(value: string) {
  const now = Date.now();
  const then = new Date(value).getTime();
  const deltaMinutes = Math.max(1, Math.round((now - then) / (1000 * 60)));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const hours = Math.round(deltaMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function taskStatusLabel(status: TaskStatus) {
  if (status === "in_progress") {
    return "In Progress";
  }

  if (status === "done") {
    return "Completed";
  }

  return "Todo";
}

function taskPillClass(status: TaskStatus, themeMode: ThemeMode) {
  if (status === "done") {
    return themeMode === "dark"
      ? "border border-emerald-400/45 bg-emerald-600/20 text-emerald-200"
      : "border border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (status === "in_progress") {
    return themeMode === "dark"
      ? "border border-sky-400/45 bg-sky-600/20 text-sky-200"
      : "border border-sky-300 bg-sky-100 text-sky-800";
  }

  return themeMode === "dark"
    ? "border border-[var(--line)] bg-zinc-700/25 text-[var(--text-base)]"
    : "border border-slate-300 bg-slate-100 text-slate-700";
}

function taskPriorityPillClass(priority: TaskPriority, themeMode: ThemeMode) {
  if (priority === "High") {
    return themeMode === "dark"
      ? "border border-rose-400/55 bg-rose-700/25 text-rose-200"
      : "border border-rose-300 bg-rose-100 text-rose-800";
  }

  if (priority === "Medium") {
    return themeMode === "dark"
      ? "border border-amber-400/55 bg-amber-700/25 text-amber-200"
      : "border border-amber-300 bg-amber-100 text-amber-800";
  }

  return themeMode === "dark"
    ? "border border-emerald-400/45 bg-emerald-700/20 text-emerald-200"
    : "border border-emerald-300 bg-emerald-100 text-emerald-800";
}

function stagePillClass(stage: ProjectStage, themeMode: ThemeMode) {
  if (stage === "Production") {
    return themeMode === "dark"
      ? "border border-emerald-400/45 bg-emerald-600/20 text-emerald-200"
      : "border border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (stage === "Pilot") {
    return themeMode === "dark"
      ? "border border-cyan-400/45 bg-cyan-600/20 text-cyan-200"
      : "border border-cyan-300 bg-cyan-100 text-cyan-800";
  }

  if (stage === "In Validation") {
    return themeMode === "dark"
      ? "border border-indigo-400/45 bg-indigo-600/20 text-indigo-200"
      : "border border-indigo-300 bg-indigo-100 text-indigo-800";
  }

  return themeMode === "dark"
    ? "border border-[var(--line)] bg-zinc-700/25 text-[var(--text-base)]"
    : "border border-slate-300 bg-slate-100 text-slate-700";
}

function priorityPillClass(priority: ProjectPriority, themeMode: ThemeMode) {
  if (priority === "Urgent") {
    return themeMode === "dark"
      ? "border border-rose-400/55 bg-rose-700/25 text-rose-200"
      : "border border-rose-300 bg-rose-100 text-rose-800";
  }

  if (priority === "High") {
    return themeMode === "dark"
      ? "border border-orange-400/55 bg-orange-700/25 text-orange-200"
      : "border border-orange-300 bg-orange-100 text-orange-800";
  }

  if (priority === "Medium") {
    return themeMode === "dark"
      ? "border border-sky-400/45 bg-sky-700/20 text-sky-200"
      : "border border-sky-300 bg-sky-100 text-sky-800";
  }

  return themeMode === "dark"
    ? "border border-[var(--line)] bg-zinc-700/25 text-[var(--text-base)]"
    : "border border-slate-300 bg-slate-100 text-slate-700";
}

function riskPillClass(riskLevel: ProjectRisk, themeMode: ThemeMode) {
  if (riskLevel === "High") {
    return themeMode === "dark"
      ? "border border-red-400/55 bg-red-700/25 text-red-200"
      : "border border-red-300 bg-red-100 text-red-800";
  }

  if (riskLevel === "Medium") {
    return themeMode === "dark"
      ? "border border-amber-400/55 bg-amber-700/25 text-amber-200"
      : "border border-amber-300 bg-amber-100 text-amber-800";
  }

  return themeMode === "dark"
    ? "border border-emerald-400/45 bg-emerald-700/20 text-emerald-200"
    : "border border-emerald-300 bg-emerald-100 text-emerald-800";
}

function inferLaunchType(project: Project) {
  const explicit = String(project.workspaceType || "").trim();
  if (explicit) {
    return explicit;
  }

  const descriptor = `${project.category || ""} ${project.title || ""}`.toLowerCase();
  if (/(beverage|drink|juice|coffee|tea|water|protein)/.test(descriptor)) {
    return "Beverage";
  }
  if (/(sauce|dressing|condiment|dip)/.test(descriptor)) {
    return "Condiment";
  }
  if (/(snack|granola|bar|chips|cracker|cereal)/.test(descriptor)) {
    return "Snack";
  }
  if (/(ingredient|base|blend|extract|flavor)/.test(descriptor)) {
    return "Ingredient";
  }

  return "Other";
}

function projectVisual(project: Project, themeMode: ThemeMode) {
  const descriptor = `${project.category || ""} ${project.workspaceType || ""} ${project.title || ""}`.toLowerCase();

  if (/(granola|snack|cereal|bar|chips|cracker)/.test(descriptor)) {
    return {
      icon: SnackIcon,
      accentClass:
        themeMode === "dark"
          ? "border-amber-400/45 bg-amber-500/20 text-amber-200"
          : "border-amber-300 bg-amber-100 text-amber-800"
    };
  }

  if (/(beverage|drink|protein|juice|tea|coffee|soda|water)/.test(descriptor)) {
    return {
      icon: BeverageIcon,
      accentClass:
        themeMode === "dark"
          ? "border-cyan-400/45 bg-cyan-500/20 text-cyan-200"
          : "border-cyan-300 bg-cyan-100 text-cyan-800"
    };
  }

  if (/(sauce|dressing|condiment|dip)/.test(descriptor)) {
    return {
      icon: SauceIcon,
      accentClass:
        themeMode === "dark"
          ? "border-orange-400/45 bg-orange-500/20 text-orange-200"
          : "border-orange-300 bg-orange-100 text-orange-800"
    };
  }

  return {
    icon: IngredientIcon,
    accentClass:
      themeMode === "dark"
        ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-200"
        : "border-emerald-300 bg-emerald-100 text-emerald-800"
  };
}

function launchFormFromProject(project?: Project): LaunchFormState {
  if (!project) {
    return {
      title: "",
      owner: "",
      launchType: LAUNCH_TYPE_OPTIONS[0],
      category: "",
      brand: "",
      market: "",
      stage: "Intake",
      priority: "Medium",
      riskLevel: "Medium",
      dueDate: "",
      description: "",
      stakeholders: [
        {
          id: safeId("party"),
          name: "",
          role: "Launch Stakeholder",
          email: ""
        }
      ]
    };
  }

  return {
    title: project.title || "",
    owner: project.owner || "",
    launchType: inferLaunchType(project),
    category: project.category || "",
    brand: project.brand || "",
    market: project.market || "",
    stage: project.stage,
    priority: project.priority,
    riskLevel: project.riskLevel,
    dueDate: project.dueDate ? project.dueDate.slice(0, 10) : "",
    description: project.description || "",
    stakeholders:
      project.stakeholders && project.stakeholders.length
        ? project.stakeholders.map((stakeholder) => ({
            id: stakeholder.id,
            name: stakeholder.name,
            role: stakeholder.role,
            email: stakeholder.email
          }))
        : [
            {
              id: safeId("party"),
              name: "",
              role: "Launch Stakeholder",
              email: ""
            }
          ]
  };
}

function taskFormFromTask(task?: Task): TaskFormState {
  if (!task) {
    return {
      title: "",
      description: "",
      assignee: "",
      dueDate: "",
      priority: "Medium",
      taskType: "General",
      status: "todo"
    };
  }

  return {
    title: task.title || "",
    description: (task as Task & { description?: string }).description || "",
    assignee: task.assignee || "",
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    priority: (task as Task & { priority?: TaskPriority }).priority || "Medium",
    taskType: (task as Task & { taskType?: string }).taskType || "General",
    status: task.status
  };
}

export default function HomePage() {
  const [launches, setLaunches] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState("my_launches");
  const [activeLaunchId, setActiveLaunchId] = useState<string | null>(null);
  const [favoriteLaunchIds, setFavoriteLaunchIds] = useState<string[]>([]);
  const [launchSearch, setLaunchSearch] = useState("");

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [launchModalMode, setLaunchModalMode] = useState<"create" | "edit">("create");
  const [launchEditingId, setLaunchEditingId] = useState<string | null>(null);
  const [launchForm, setLaunchForm] = useState<LaunchFormState>(() => launchFormFromProject());
  const [launchDeleteTarget, setLaunchDeleteTarget] = useState<Project | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(() => taskFormFromTask());

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatRecipientIds, setChatRecipientIds] = useState<string[]>([]);
  const [chatByLaunch, setChatByLaunch] = useState<Record<string, ChatMessage[]>>({});

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_PROFILE;
    }

    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_PROFILE;
      }

      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      return {
        fullName: String(parsed.fullName || DEFAULT_PROFILE.fullName),
        email: String(parsed.email || DEFAULT_PROFILE.email),
        role: String(parsed.role || DEFAULT_PROFILE.role)
      };
    } catch {
      return DEFAULT_PROFILE;
    }
  });
  const [profileDraft, setProfileDraft] = useState<UserProfile>(profile);

  const sortedLaunches = useMemo(
    () => launches.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [launches]
  );

  const visibleLaunches = useMemo(() => {
    const query = launchSearch.trim().toLowerCase();

    if (!query) {
      return sortedLaunches;
    }

    return sortedLaunches.filter((launch) => {
      const launchType = inferLaunchType(launch).toLowerCase();
      return (
        launch.title.toLowerCase().includes(query) ||
        launch.owner.toLowerCase().includes(query) ||
        launch.stage.toLowerCase().includes(query) ||
        launchType.includes(query) ||
        (launch.category || "").toLowerCase().includes(query)
      );
    });
  }, [sortedLaunches, launchSearch]);

  const favoriteLaunches = useMemo(() => {
    const byId = new Map(sortedLaunches.map((launch) => [launch.id, launch]));

    return favoriteLaunchIds
      .map((launchId) => byId.get(launchId))
      .filter((launch): launch is Project => Boolean(launch));
  }, [favoriteLaunchIds, sortedLaunches]);

  const activeLaunch = useMemo(() => {
    if (!activeLaunchId) {
      return sortedLaunches[0] || null;
    }

    return sortedLaunches.find((launch) => launch.id === activeLaunchId) || null;
  }, [sortedLaunches, activeLaunchId]);

  const activeLaunchTasks = useMemo(() => {
    if (!activeLaunch) {
      return [];
    }

    return tasks
      .filter((task) => task.projectId === activeLaunch.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, activeLaunch]);

  const activeTasks = useMemo(
    () => activeLaunchTasks.filter((task) => task.status !== "done"),
    [activeLaunchTasks]
  );
  const completedTasks = useMemo(
    () => activeLaunchTasks.filter((task) => task.status === "done"),
    [activeLaunchTasks]
  );

  const activeLaunchParties = useMemo(() => {
    if (!activeLaunch) {
      return [] as LaunchParty[];
    }

    const parties: LaunchParty[] = [...(activeLaunch.stakeholders || [])];
    const ownerName = activeLaunch.owner.trim();

    if (ownerName && !parties.some((party) => party.name.toLowerCase() === ownerName.toLowerCase())) {
      parties.unshift({
        id: `owner_${ownerName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: ownerName,
        role: "Launch Owner",
        email: ""
      });
    }

    return parties;
  }, [activeLaunch]);

  const currentStageIndex = useMemo(() => {
    if (!activeLaunch) {
      return -1;
    }

    return LAUNCH_STAGES.indexOf(activeLaunch.stage);
  }, [activeLaunch]);

  const activeChatMessages = useMemo(() => {
    if (!activeLaunch) {
      return [] as ChatMessage[];
    }

    return chatByLaunch[activeLaunch.id] || [];
  }, [activeLaunch, chatByLaunch]);

  const analytics = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 1000 * 60 * 60 * 24;
    const dueSoonWindowDays = 30;
    const dueSoonWindowMs = oneDayMs * dueSoonWindowDays;

    const launchesById = new Map(sortedLaunches.map((launch) => [launch.id, launch]));
    const totalLaunches = sortedLaunches.length;
    const activeLaunches = sortedLaunches.filter((launch) => launch.status === "active").length;
    const highRiskLaunches = sortedLaunches.filter((launch) => launch.riskLevel === "High").length;
    const urgentLaunches = sortedLaunches.filter((launch) => launch.priority === "Urgent").length;
    const launchesDueSoon = sortedLaunches.filter((launch) => {
      if (!launch.dueDate) {
        return false;
      }
      const dueTime = new Date(launch.dueDate).getTime();
      return dueTime >= now && dueTime <= now + dueSoonWindowMs;
    }).length;
    const overdueLaunches = sortedLaunches.filter((launch) => {
      if (!launch.dueDate) {
        return false;
      }
      return new Date(launch.dueDate).getTime() < now;
    }).length;

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
    const todoTasks = tasks.filter((task) => task.status === "todo").length;
    const openTasks = totalTasks - doneTasks;
    const overdueTaskList = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") {
        return false;
      }
      return new Date(task.dueDate).getTime() < Date.now();
    });
    const overdueTasks = overdueTaskList.length;
    const dueNext7DaysTasks = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") {
        return false;
      }
      const dueTime = new Date(task.dueDate).getTime();
      return dueTime >= now && dueTime <= now + oneDayMs * 7;
    }).length;
    const dueNext30DaysTasks = tasks.filter((task) => {
      if (!task.dueDate || task.status === "done") {
        return false;
      }
      const dueTime = new Date(task.dueDate).getTime();
      return dueTime >= now && dueTime <= now + dueSoonWindowMs;
    }).length;
    const doneTasksWithDueDate = tasks.filter((task) => task.status === "done" && Boolean(task.dueDate));
    const onTimeCompletedTasks = doneTasksWithDueDate.filter((task) => {
      const dueTime = new Date(task.dueDate as string).getTime();
      return new Date(task.updatedAt).getTime() <= dueTime;
    }).length;

    const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const onTimeCompletionRate = doneTasksWithDueDate.length
      ? Math.round((onTimeCompletedTasks / doneTasksWithDueDate.length) * 100)
      : 0;
    const overdueOpenRate = openTasks ? Math.round((overdueTasks / openTasks) * 100) : 0;

    const byTypeMap = new Map<string, number>();
    sortedLaunches.forEach((launch) => {
      const launchType = inferLaunchType(launch);
      byTypeMap.set(launchType, (byTypeMap.get(launchType) || 0) + 1);
    });

    const byType = Array.from(byTypeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        share: totalLaunches ? Math.round((count / totalLaunches) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const byStage = LAUNCH_STAGES.map((stage) => ({
      stage,
      count: sortedLaunches.filter((launch) => launch.stage === stage).length
    }));

    const stageHealth = LAUNCH_STAGES.map((stage) => {
      const launchesInStage = sortedLaunches.filter((launch) => launch.stage === stage);
      const launchIds = new Set(launchesInStage.map((launch) => launch.id));
      const stageTasks = tasks.filter((task) => task.projectId && launchIds.has(task.projectId));
      const stageDone = stageTasks.filter((task) => task.status === "done").length;
      const stageOpen = stageTasks.filter((task) => task.status !== "done").length;
      const stageOverdue = stageTasks.filter((task) => {
        if (!task.dueDate || task.status === "done") {
          return false;
        }
        return new Date(task.dueDate).getTime() < now;
      }).length;

      return {
        stage,
        count: launchesInStage.length,
        share: totalLaunches ? Math.round((launchesInStage.length / totalLaunches) * 100) : 0,
        openTasks: stageOpen,
        overdueTasks: stageOverdue,
        completionRate: stageTasks.length ? Math.round((stageDone / stageTasks.length) * 100) : 0
      };
    });

    const launchIdsWithTasks = new Set(tasks.map((task) => task.projectId).filter((value): value is string => Boolean(value)));
    const launchesWithoutTasks = sortedLaunches.filter((launch) => !launchIdsWithTasks.has(launch.id)).length;

    const overdueLaunchIdSet = new Set(
      overdueTaskList.map((task) => task.projectId).filter((value): value is string => Boolean(value))
    );
    const atRiskLaunches = sortedLaunches.filter(
      (launch) =>
        launch.riskLevel === "High" ||
        launch.priority === "Urgent" ||
        overdueLaunchIdSet.has(launch.id)
    ).length;

    const ownerMap = new Map<
      string,
      {
        owner: string;
        launches: number;
        openTasks: number;
        overdueTasks: number;
        urgentLaunches: number;
        highRiskLaunches: number;
        launchProjects: string[];
      }
    >();

    sortedLaunches.forEach((launch) => {
      const owner = launch.owner || "Unassigned";
      const existing = ownerMap.get(owner) || {
        owner,
        launches: 0,
        openTasks: 0,
        overdueTasks: 0,
        urgentLaunches: 0,
        highRiskLaunches: 0,
        launchProjects: []
      };
      existing.launches += 1;
      if (!existing.launchProjects.includes(launch.title)) {
        existing.launchProjects.push(launch.title);
      }
      if (launch.priority === "Urgent") {
        existing.urgentLaunches += 1;
      }
      if (launch.riskLevel === "High") {
        existing.highRiskLaunches += 1;
      }
      ownerMap.set(owner, existing);
    });

    tasks.forEach((task) => {
      if (!task.projectId) {
        return;
      }
      const launch = launchesById.get(task.projectId);
      if (!launch) {
        return;
      }
      const owner = launch.owner || "Unassigned";
      const existing = ownerMap.get(owner);
      if (!existing) {
        return;
      }
      if (task.status !== "done") {
        existing.openTasks += 1;
      }
      if (task.dueDate && task.status !== "done" && new Date(task.dueDate).getTime() < now) {
        existing.overdueTasks += 1;
      }
    });

    const ownerWorkload = Array.from(ownerMap.values())
      .sort((a, b) => {
        if (b.overdueTasks !== a.overdueTasks) {
          return b.overdueTasks - a.overdueTasks;
        }
        if (b.openTasks !== a.openTasks) {
          return b.openTasks - a.openTasks;
        }
        return b.launches - a.launches;
      })
      .slice(0, 6);

    const openTaskCountByLaunchId = new Map<string, number>();
    tasks.forEach((task) => {
      if (!task.projectId || task.status === "done") {
        return;
      }
      openTaskCountByLaunchId.set(task.projectId, (openTaskCountByLaunchId.get(task.projectId) || 0) + 1);
    });

    const upcomingMilestones = sortedLaunches
      .filter((launch) => Boolean(launch.dueDate))
      .map((launch) => {
        const dueTime = new Date(launch.dueDate as string).getTime();
        const daysToDue = Math.ceil((dueTime - now) / oneDayMs);
        const openTaskCount = openTaskCountByLaunchId.get(launch.id) || 0;

        return {
          id: launch.id,
          title: launch.title,
          owner: launch.owner,
          dueDate: launch.dueDate as string,
          dueTime,
          daysToDue,
          stage: launch.stage,
          openTasks: openTaskCount
        };
      })
      .sort((a, b) => a.dueTime - b.dueTime)
      .slice(0, 8);

    return {
      totalLaunches,
      activeLaunches,
      highRiskLaunches,
      urgentLaunches,
      launchesDueSoon,
      overdueLaunches,
      atRiskLaunches,
      launchesWithoutTasks,
      totalTasks,
      openTasks,
      doneTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      dueNext7DaysTasks,
      dueNext30DaysTasks,
      completionRate,
      onTimeCompletionRate,
      overdueOpenRate,
      ownerWorkload,
      stageHealth,
      upcomingMilestones,
      byType,
      byStage
    };
  }, [sortedLaunches, tasks]);

  const inboxItems = useMemo(() => {
    const launchesById = new Map(sortedLaunches.map((launch) => [launch.id, launch]));

    return tasks
      .filter((task) => task.status !== "done")
      .map((task) => {
        const launch = task.projectId ? launchesById.get(task.projectId) || null : null;
        const dueDateValue = task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const isOverdue = Boolean(task.dueDate && dueDateValue < Date.now());

        return {
          task,
          launch,
          dueDateValue,
          isOverdue
        };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) {
          return a.isOverdue ? -1 : 1;
        }
        if (a.dueDateValue !== b.dueDateValue) {
          return a.dueDateValue - b.dueDateValue;
        }
        return new Date(b.task.updatedAt).getTime() - new Date(a.task.updatedAt).getTime();
      });
  }, [tasks, sortedLaunches]);

  const reviewItems = useMemo(() => {
    return sortedLaunches
      .map((launch) => {
        const relatedTasks = tasks.filter((task) => task.projectId === launch.id);
        const doneTasks = relatedTasks.filter((task) => task.status === "done").length;
        const openTasks = relatedTasks.filter((task) => task.status !== "done").length;
        const reasons: string[] = [];

        if (launch.stage === "In Validation") {
          reasons.push("Validation sign-off needed");
        }
        if (launch.stage === "Pilot") {
          reasons.push("Pilot readiness review");
        }
        if (launch.priority === "Urgent") {
          reasons.push("Urgent launch priority");
        }
        if (launch.riskLevel === "High") {
          reasons.push("High risk mitigation check");
        }

        if (!reasons.length) {
          return null;
        }

        return {
          launch,
          doneTasks,
          openTasks,
          reasons
        };
      })
      .filter((item): item is { launch: Project; doneTasks: number; openTasks: number; reasons: string[] } => Boolean(item))
      .slice(0, 18);
  }, [sortedLaunches, tasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // no-op when storage is unavailable
    }

    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // no-op when storage is unavailable
    }
  }, [profile]);

  useEffect(() => {
    async function refreshAll() {
      setLoading(true);
      setError(null);

      try {
        const [launchesResponse, tasksResponse] = await Promise.all([listProjects(), listTasks()]);
        setLaunches(launchesResponse);
        setTasks(tasksResponse);
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Unable to load launch data";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    refreshAll();
  }, []);

  useEffect(() => {
    if (!sortedLaunches.length) {
      setActiveLaunchId(null);
      return;
    }

    setActiveLaunchId((current) => {
      if (current && sortedLaunches.some((launch) => launch.id === current)) {
        return current;
      }

      return sortedLaunches[0].id;
    });
  }, [sortedLaunches]);

  useEffect(() => {
    setFavoriteLaunchIds((current) =>
      current.filter((launchId) => sortedLaunches.some((launch) => launch.id === launchId))
    );
  }, [sortedLaunches]);

  useEffect(() => {
    if (!activeLaunchParties.length) {
      setChatRecipientIds([]);
      return;
    }

    setChatRecipientIds((current) => {
      const keep = current.filter((id) => activeLaunchParties.some((party) => party.id === id));
      if (keep.length) {
        return keep;
      }

      return [activeLaunchParties[0].id];
    });
  }, [activeLaunchParties]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => {
      setNotice(null);
    }, 2200);

    return () => clearTimeout(timer);
  }, [notice]);

  async function refreshAllData() {
    setLoading(true);
    setError(null);

    try {
      const [launchesResponse, tasksResponse] = await Promise.all([listProjects(), listTasks()]);
      setLaunches(launchesResponse);
      setTasks(tasksResponse);
      setNotice("Launch data synced");
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unable to refresh launch data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(launchId: string) {
    setFavoriteLaunchIds((current) => {
      if (current.includes(launchId)) {
        return current.filter((id) => id !== launchId);
      }

      return [launchId, ...current];
    });
  }

  function openCreateLaunchModal() {
    setLaunchModalMode("create");
    setLaunchEditingId(null);
    setLaunchForm(launchFormFromProject());
    setIsLaunchModalOpen(true);
  }

  function openEditLaunchModal(launch: Project) {
    setLaunchModalMode("edit");
    setLaunchEditingId(launch.id);
    setLaunchForm(launchFormFromProject(launch));
    setIsLaunchModalOpen(true);
  }

  function addStakeholderField() {
    setLaunchForm((current) => ({
      ...current,
      stakeholders: [
        ...current.stakeholders,
        {
          id: safeId("party"),
          name: "",
          role: "Launch Stakeholder",
          email: ""
        }
      ]
    }));
  }

  function updateStakeholderField(id: string, patch: Partial<StakeholderDraft>) {
    setLaunchForm((current) => ({
      ...current,
      stakeholders: current.stakeholders.map((stakeholder) =>
        stakeholder.id === id ? { ...stakeholder, ...patch } : stakeholder
      )
    }));
  }

  function removeStakeholderField(id: string) {
    setLaunchForm((current) => ({
      ...current,
      stakeholders:
        current.stakeholders.length > 1
          ? current.stakeholders.filter((stakeholder) => stakeholder.id !== id)
          : current.stakeholders
    }));
  }

  async function handleLaunchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!launchForm.title.trim() || !launchForm.owner.trim()) {
      setError("Launch title and owner are required");
      return;
    }

    const stakeholdersForCreate = launchForm.stakeholders
      .map((stakeholder) => ({
        name: stakeholder.name.trim(),
        role: stakeholder.role.trim(),
        email: stakeholder.email.trim()
      }))
      .filter((stakeholder) => stakeholder.name.length > 0);

    const stakeholdersForUpdate: LaunchParty[] = launchForm.stakeholders
      .map((stakeholder) => ({
        id: stakeholder.id || safeId("party"),
        name: stakeholder.name.trim(),
        role: stakeholder.role.trim(),
        email: stakeholder.email.trim()
      }))
      .filter((stakeholder) => stakeholder.name.length > 0);

    const basePayload = {
      title: launchForm.title.trim(),
      owner: launchForm.owner.trim(),
      stage: launchForm.stage,
      priority: launchForm.priority,
      riskLevel: launchForm.riskLevel,
      dueDate: launchForm.dueDate || null,
      description: launchForm.description.trim(),
      workspaceId: "launches",
      workspaceName: "Launches",
      workspaceType: launchForm.launchType.trim() || "Other",
      category: launchForm.category.trim(),
      brand: launchForm.brand.trim(),
      market: launchForm.market.trim()
    };

    try {
      if (launchModalMode === "create") {
        const created = await apiCreateLaunch({
          ...basePayload,
          stakeholders: stakeholdersForCreate
        });
        setLaunches((current) => [created, ...current]);
        setActiveLaunchId(created.id);
        setNotice("Launch created");
      } else {
        if (!launchEditingId) {
          setError("No launch selected for editing");
          return;
        }

        const updated = await apiUpdateLaunch(launchEditingId, {
          ...basePayload,
          stakeholders: stakeholdersForUpdate
        });
        setLaunches((current) => current.map((launch) => (launch.id === launchEditingId ? updated : launch)));
        setActiveLaunchId(updated.id);
        setNotice("Launch updated");
      }

      setIsLaunchModalOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to save launch";
      setError(message);
    }
  }

  async function confirmDeleteLaunch() {
    if (!launchDeleteTarget) {
      return;
    }

    try {
      await apiDeleteLaunch(launchDeleteTarget.id);
      setLaunches((current) => current.filter((launch) => launch.id !== launchDeleteTarget.id));
      setTasks((current) => current.filter((task) => task.projectId !== launchDeleteTarget.id));
      setFavoriteLaunchIds((current) => current.filter((id) => id !== launchDeleteTarget.id));
      setLaunchDeleteTarget(null);
      setNotice("Launch deleted");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete launch";
      setError(message);
    }
  }

  function openCreateTaskModal() {
    if (!activeLaunch) {
      setError("Select a launch before adding a task");
      return;
    }

    setTaskModalMode("create");
    setTaskEditingId(null);
    setTaskForm(taskFormFromTask());
    setIsTaskModalOpen(true);
  }

  function openEditTaskModal(task: Task) {
    setTaskModalMode("edit");
    setTaskEditingId(task.id);
    setTaskForm(taskFormFromTask(task));
    setIsTaskModalOpen(true);
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (taskModalMode === "create" && !activeLaunch) {
      setError("Select a launch before adding a task");
      return;
    }

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assignee: taskForm.assignee.trim() || "Unassigned",
      dueDate: taskForm.dueDate || null,
      priority: taskForm.priority,
      taskType: taskForm.taskType.trim() || "General",
      status: taskForm.status
    };

    try {
      if (taskModalMode === "create") {
        const created = await apiCreateTask({
          ...payload,
          projectId: activeLaunch?.id || null
        });
        setTasks((current) => [created, ...current]);
        setNotice("Task added");
      } else {
        if (!taskEditingId) {
          setError("No task selected for editing");
          return;
        }

        const updated = await updateTask(taskEditingId, payload);
        setTasks((current) => current.map((task) => (task.id === taskEditingId ? updated : task)));
        setNotice("Task updated");
      }

      setIsTaskModalOpen(false);
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : "Unable to save task";
      setError(message);
    }
  }

  async function handleTaskStatusChange(taskId: string, status: TaskStatus) {
    const previous = tasks;

    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task))
    );

    try {
      const updated = await updateTask(taskId, { status });
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
    } catch (updateError) {
      setTasks(previous);
      const message = updateError instanceof Error ? updateError.message : "Unable to update task";
      setError(message);
    }
  }

  function toggleChatRecipient(id: string) {
    setChatRecipientIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((recipientId) => recipientId !== id);
      }

      return [...current, id];
    });
  }

  function handleSendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeLaunch || !chatDraft.trim() || !chatRecipientIds.length) {
      return;
    }

    const message: ChatMessage = {
      id: safeId("msg"),
      sender: "You",
      recipients: chatRecipientIds,
      text: chatDraft.trim(),
      createdAt: new Date().toISOString()
    };

    setChatByLaunch((current) => {
      const existing = current[activeLaunch.id] || [];
      return {
        ...current,
        [activeLaunch.id]: [...existing, message]
      };
    });

    setChatDraft("");
  }

  function openProfileModal() {
    setProfileDraft(profile);
    setIsProfileModalOpen(true);
  }

  function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setProfile({
      fullName: profileDraft.fullName.trim() || DEFAULT_PROFILE.fullName,
      email: profileDraft.email.trim() || DEFAULT_PROFILE.email,
      role: profileDraft.role.trim() || DEFAULT_PROFILE.role
    });
    setIsProfileModalOpen(false);
    setNotice("Profile settings saved");
  }

  const themeVars = useMemo(
    () =>
      ({
        "--app-bg":
          themeMode === "dark"
            ? "radial-gradient(circle at top left, #26344b 0%, #131a28 45%, #0b0f19 100%)"
            : "radial-gradient(circle at top left, #f9fcff 0%, #edf3fb 45%, #e5ecf7 100%)",
        "--surface-sidebar": themeMode === "dark" ? "#121826" : "#eef3fb",
        "--surface-main": themeMode === "dark" ? "#101827" : "#f4f8ff",
        "--surface-header": themeMode === "dark" ? "#141c2b" : "#ffffff",
        "--surface-1": themeMode === "dark" ? "#151d2c" : "#ffffff",
        "--surface-2": themeMode === "dark" ? "#1a2436" : "#f0f5fc",
        "--surface-3": themeMode === "dark" ? "#243147" : "#e7eef9",
        "--surface-4": themeMode === "dark" ? "#1f2a3e" : "#edf3fb",
        "--surface-5": themeMode === "dark" ? "#222f45" : "#e4ecf8",
        "--line": themeMode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.16)",
        "--text-strong": themeMode === "dark" ? "#f4f4f5" : "#0f172a",
        "--text-base": themeMode === "dark" ? "#e4e4e7" : "#1f2937",
        "--text-muted": themeMode === "dark" ? "#d4d4d8" : "#334155",
        "--text-dim": themeMode === "dark" ? "#a1a1aa" : "#64748b",
        "--text-faint": themeMode === "dark" ? "#71717a" : "#94a3b8"
      }) as CSSProperties,
    [themeMode]
  );

  const isMyLaunchesView = activeNav === "my_launches";
  const isInboxView = activeNav === "inbox";
  const isReviewsView = activeNav === "reviews";
  const isPulseView = activeNav === "pulse";
  const launchTypePillClassName =
    themeMode === "dark"
      ? "inline-flex rounded-full border border-cyan-400/45 bg-cyan-700/20 px-2 py-0.5 text-xs font-semibold text-cyan-200"
      : "inline-flex rounded-full border border-cyan-300 bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-800";
  const primaryActionClass =
    themeMode === "dark"
      ? "border-sky-400/60 bg-sky-600/25 text-sky-100 hover:bg-sky-600/35"
      : "border-sky-400/60 bg-sky-100 text-sky-800 hover:bg-sky-200";
  const selectedIconActionClass =
    themeMode === "dark"
      ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.45)]"
      : "border-emerald-400 bg-emerald-100 text-emerald-800 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";
  const destructiveIconClass =
    themeMode === "dark"
      ? "border-rose-500/35 bg-rose-900/20 text-rose-200 hover:bg-rose-800/25"
      : "border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200";
  const destructiveActionClass =
    themeMode === "dark"
      ? "border-rose-500/40 bg-rose-700/25 text-rose-100 hover:bg-rose-700/35"
      : "border-rose-400/60 bg-rose-100 text-rose-800 hover:bg-rose-200";
  const reviewReasonPillClass =
    themeMode === "dark"
      ? "rounded-full border border-amber-400/45 bg-amber-700/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200"
      : "rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800";

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] px-3 py-3 text-[var(--text-base)] lg:px-4 lg:py-4"
      data-theme={themeMode}
      style={themeVars}
    >
      <div className="mx-auto h-[calc(100vh-1.5rem)] w-full max-w-[1660px]">
        <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface-sidebar)] shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:row-span-2">
            <div className="flex min-h-[168px] items-center justify-center border-b border-[var(--line)] px-2 py-2">
              <img
                src="https://www.michaelcoen.com/images/ZampleLogo.png"
                alt="Zample"
                className="h-auto w-[99%] max-h-36 object-contain"
                loading="eager"
              />
            </div>

            <div className="border-b border-[var(--line)] px-3 py-3">
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-dim)]" />
                <input
                  value={launchSearch}
                  onChange={(event) => setLaunchSearch(event.target.value)}
                  placeholder="Search launches"
                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] pl-8 pr-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                />
              </label>
            </div>

            <nav className="space-y-1 border-b border-[var(--line)] px-2 py-3">
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeNav;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNav(item.id)}
                    title={`Open ${item.label}`}
                    className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition ${
                      isActive
                        ? "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-strong)]"
                        : "border-transparent text-[var(--text-muted)] hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-[var(--text-dim)]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <section className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Favorites</p>
              </div>
              <div className="space-y-1">
                {favoriteLaunches.length ? (
                  favoriteLaunches.map((launch) => {
                    const visual = projectVisual(launch, themeMode);
                    const VisualIcon = visual.icon;

                    return (
                      <button
                        key={launch.id}
                        type="button"
                        onClick={() => {
                          setActiveLaunchId(launch.id);
                          setActiveNav("my_launches");
                        }}
                        title={`Open favorite launch: ${launch.title}`}
                        className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-[var(--text-base)] transition hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                      >
                        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${visual.accentClass}`}>
                          <VisualIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{launch.title}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-dashed border-[var(--line)] px-3 py-3 text-xs text-[var(--text-dim)]">
                    Save launches to keep them pinned here.
                  </p>
                )}
              </div>
            </section>
          </aside>

          <section className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface-header)] px-5 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.3)] lg:col-start-2 lg:row-start-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-medium leading-snug text-[var(--text-strong)]">
                  Welcome to Zample! Your project managment solution for launching new food or beverages.
                </p>
              </div>

              <div className="ml-4 flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={refreshAllData}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-strong)]"
                  title="Sync launches"
                >
                  <SyncIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen((open) => !open)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-strong)]"
                  title="Open launch chat"
                >
                  <ChatIcon className="h-5 w-5" />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((open) => !open)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-strong)]"
                    title="Profile menu"
                  >
                    <ProfileIcon className="h-5 w-5" />
                  </button>

                  {isProfileMenuOpen ? (
                    <div className="absolute right-0 top-11 z-30 w-44 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          openProfileModal();
                        }}
                        title="Open profile and settings"
                        className="w-full rounded px-2 py-1.5 text-left text-sm text-[var(--text-base)] transition hover:bg-[var(--surface-3)]"
                      >
                        Profile & settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          window.location.assign("/logout");
                        }}
                        title="Log out of your workspace"
                        className="w-full rounded px-2 py-1.5 text-left text-sm text-[var(--text-base)] transition hover:bg-[var(--surface-3)]"
                      >
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? (
              <div
                className={`mt-3 rounded-md border px-4 py-2 text-sm ${
                  themeMode === "dark"
                    ? "border-rose-500/30 bg-rose-900/20 text-rose-200"
                    : "border-rose-300 bg-rose-100 text-rose-800"
                }`}
              >
                {error}
              </div>
            ) : null}

            {notice ? (
              <div
                className={`mt-2 rounded-md border px-4 py-2 text-sm ${
                  themeMode === "dark"
                    ? "border-sky-500/20 bg-sky-900/10 text-sky-200"
                    : "border-sky-300 bg-sky-100 text-sky-800"
                }`}
              >
                {notice}
              </div>
            ) : null}

            {isChatOpen && activeLaunch ? (
              <div className="absolute right-5 top-16 z-20 w-[360px] max-w-[calc(100%-2.5rem)] rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-2xl backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">Launch chat</p>
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(false)}
                    title="Close launch chat"
                    className="rounded border border-[var(--line)] px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition hover:border-cyan-400/45"
                  >
                    Close
                  </button>
                </div>

                <p className="text-xs text-[var(--text-dim)]">Select one or more parties to message:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeLaunchParties.map((party) => {
                    const selected = chatRecipientIds.includes(party.id);

                    return (
                      <button
                        key={party.id}
                        type="button"
                        onClick={() => toggleChatRecipient(party.id)}
                        title={`${selected ? "Remove" : "Add"} ${party.name} as chat recipient`}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          selected
                            ? themeMode === "dark"
                              ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                              : "border-sky-300 bg-sky-100 text-sky-800"
                            : "border-[var(--line)] bg-[var(--surface-3)] text-[var(--text-muted)]"
                        }`}
                      >
                        {party.name}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 max-h-36 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface-4)] p-2">
                  {activeChatMessages.length ? (
                    <div className="space-y-2">
                      {activeChatMessages.map((message) => (
                        <div key={message.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-5)] p-2">
                          <p className="text-xs text-[var(--text-dim)]">
                            {message.sender} → {message.recipients.length} recipients · {formatClock(message.createdAt)}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-base)]">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-dim)]">No chat messages yet for this launch.</p>
                  )}
                </div>

                <form className="mt-2 space-y-2" onSubmit={handleSendChatMessage}>
                  <textarea
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="Message selected launch parties"
                    rows={3}
                    className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  />
                  <button
                    type="submit"
                    title="Send message to selected recipients"
                    className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-3)] text-sm font-semibold text-[var(--text-strong)] transition hover:border-cyan-400/45"
                  >
                    Send message
                  </button>
                </form>
              </div>
            ) : null}
          </section>

          <main className="relative flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] lg:col-start-2 lg:row-start-2">
            {isMyLaunchesView ? (
              <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
                <section className="border-b border-[var(--line)] px-5 py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[var(--text-strong)]">Launch Analytics</h2>
                    <p className="text-xs text-[var(--text-dim)]">Live portfolio metrics</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Total Launches</p>
                      <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.totalLaunches}</p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Task Completion</p>
                      <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.completionRate}%</p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Overdue Tasks</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-rose-200" : "text-rose-700"}`}>
                        {analytics.overdueTasks}
                      </p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">High Risk Launches</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-amber-200" : "text-amber-700"}`}>
                        {analytics.highRiskLaunches}
                      </p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Urgent Launches</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-orange-200" : "text-orange-700"}`}>
                        {analytics.urgentLaunches}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Stage Distribution</p>
                      <div className="mt-2 space-y-2">
                        {analytics.byStage.map((entry) => {
                          const percentage = analytics.totalLaunches
                            ? Math.round((entry.count / analytics.totalLaunches) * 100)
                            : 0;

                          return (
                            <div key={entry.stage}>
                              <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                                <span>{entry.stage}</span>
                                <span>{entry.count}</span>
                              </div>
                              <div className="h-2 rounded bg-[var(--surface-2)]">
                                <div
                                  className={themeMode === "dark" ? "h-2 rounded bg-sky-500/60" : "h-2 rounded bg-sky-500"}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Launch Types</p>
                      <div className="mt-2 space-y-2">
                        {analytics.byType.length ? (
                          analytics.byType.map((entry) => (
                            <div key={entry.type} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-strong)]">{entry.type}</span>
                              <span
                                className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--text-muted)]"
                                title={`${entry.count} launches tagged as ${entry.type}`}
                              >
                                {entry.count}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--text-dim)]">No launch type tags yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="min-h-0 flex flex-1 overflow-hidden">
                  <div className="min-h-0 w-full border-b border-[var(--line)] lg:w-[430px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-strong)]">Launches</h2>
                      </div>
                      <button
                        type="button"
                        onClick={openCreateLaunchModal}
                        title="Create launch"
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${primaryActionClass}`}
                      >
                        <CreateIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-2 px-5 pb-5">
                      {visibleLaunches.length ? (
                        visibleLaunches.map((launch) => {
                          const isActive = activeLaunch?.id === launch.id;
                          const isFavorite = favoriteLaunchIds.includes(launch.id);
                          const launchType = inferLaunchType(launch);
                          const visual = projectVisual(launch, themeMode);
                          const VisualIcon = visual.icon;

                          return (
                            <article
                              key={launch.id}
                              className={`relative rounded-md border p-2 transition ${
                                isActive
                                  ? themeMode === "dark"
                                    ? "border-sky-300/80 bg-sky-500/10 ring-1 ring-sky-300/55 shadow-lg shadow-sky-900/30"
                                    : "border-sky-400 bg-sky-100 ring-1 ring-sky-300 shadow-md shadow-sky-200/70"
                                  : "border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line)]"
                              }`}
                            >
                              {isActive ? (
                                <span
                                  aria-hidden="true"
                                  className={`absolute left-0 top-1.5 h-[calc(100%-0.75rem)] w-1 rounded-r-full ${
                                    themeMode === "dark"
                                      ? "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.75)]"
                                      : "bg-sky-500"
                                  }`}
                                />
                              ) : null}

                              <div className={`flex items-start gap-2 ${isActive ? "pl-1.5" : ""}`}>
                                <button
                                  type="button"
                                  onClick={() => setActiveLaunchId(launch.id)}
                                  title={`Open launch details: ${launch.title}`}
                                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                                >
                                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${visual.accentClass}`}>
                                    <VisualIcon className="h-5 w-5" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className={`block truncate text-sm text-[var(--text-strong)] ${isActive ? "font-bold" : "font-semibold"}`}>
                                      {launch.title}
                                    </span>
                                    <span className="block truncate text-xs text-[var(--text-dim)]">
                                      {launch.owner} · updated {formatRelative(launch.updatedAt)}
                                    </span>
                                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                      <span className={launchTypePillClassName} title={`Launch type: ${launchType}`}>
                                        {launchType}
                                      </span>
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stagePillClass(launch.stage, themeMode)}`}
                                        title={`Launch stage: ${launch.stage}`}
                                      >
                                        {launch.stage}
                                      </span>
                                    </span>
                                  </span>
                                </button>

                                <div className="ml-1 flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleFavorite(launch.id)}
                                    title={isFavorite ? "Saved to favorites" : "Save to favorites"}
                                    aria-pressed={isFavorite}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
                                      isFavorite
                                        ? selectedIconActionClass
                                        : "border-[var(--line)] bg-[var(--surface-5)] text-[var(--text-muted)] hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                    }`}
                                  >
                                    <SaveIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditLaunchModal(launch)}
                                    title={`Edit ${launch.title}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-5)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                  >
                                    <EditIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLaunchDeleteTarget(launch)}
                                    title={`Delete ${launch.title}`}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${destructiveIconClass}`}
                                  >
                                    <DeleteIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                          No launches matched your search.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    {activeLaunch ? (
                      <>
                        <div className="mb-2">
                          <h2 className="text-lg font-semibold text-[var(--text-strong)]">Launch Details</h2>
                        </div>
                        <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-semibold text-[var(--text-strong)]">{activeLaunch.title}</h2>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {activeLaunch.owner} · due {formatDate(activeLaunch.dueDate)} · updated {formatRelative(activeLaunch.updatedAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={launchTypePillClassName} title={`Launch type: ${inferLaunchType(activeLaunch)}`}>
                                {inferLaunchType(activeLaunch)}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${stagePillClass(activeLaunch.stage, themeMode)}`}
                                title={`Launch stage: ${activeLaunch.stage}`}
                              >
                                {activeLaunch.stage}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priorityPillClass(activeLaunch.priority, themeMode)}`}
                                title={`Launch priority: ${activeLaunch.priority}`}
                              >
                                {activeLaunch.priority}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${riskPillClass(activeLaunch.riskLevel, themeMode)}`}
                                title={`Launch risk level: ${activeLaunch.riskLevel}`}
                              >
                                {activeLaunch.riskLevel} Risk
                              </span>
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-[var(--text-muted)]">
                            {activeLaunch.description || "No launch brief provided."}
                          </p>
                        </section>

                        <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Launch Flow</p>
                          <div className="mt-3 flex min-w-0 items-center overflow-x-auto pb-2">
                            {LAUNCH_STAGES.map((stage, index) => {
                              const isComplete = currentStageIndex > index;
                              const isCurrent = currentStageIndex === index;
                              const circleClass = isCurrent
                                ? themeMode === "dark"
                                  ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                                  : "border-sky-300 bg-sky-100 text-sky-800"
                                : isComplete
                                  ? themeMode === "dark"
                                    ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                                    : "border-emerald-300 bg-emerald-100 text-emerald-800"
                                  : themeMode === "dark"
                                    ? "border-sky-200/20 bg-[var(--surface-4)] text-[var(--text-muted)]"
                                    : "border-slate-300 bg-slate-100 text-slate-700";
                              const lineClass =
                                currentStageIndex > index
                                  ? themeMode === "dark"
                                    ? "bg-emerald-400/70"
                                    : "bg-emerald-500"
                                  : currentStageIndex === index
                                    ? themeMode === "dark"
                                      ? "bg-sky-400/70"
                                      : "bg-sky-500"
                                    : themeMode === "dark"
                                      ? "bg-sky-200/24"
                                      : "bg-slate-300";

                              return (
                                <div key={stage} className="flex items-center">
                                  <div className="min-w-[112px]">
                                    <div
                                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${circleClass}`}
                                      title={`Launch flow step ${index + 1}: ${stage}`}
                                    >
                                      {isComplete ? "✓" : index + 1}
                                    </div>
                                    <p className={`mt-2 text-center text-xs ${isCurrent ? "text-[var(--text-base)]" : "text-[var(--text-dim)]"}`}>
                                      {stage}
                                    </p>
                                  </div>
                                  {index < LAUNCH_STAGES.length - 1 ? (
                                    <div className={`mx-1 h-[2px] w-10 rounded ${lineClass}`} />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Tasks</p>
                              <p className="text-xs text-[var(--text-faint)]">
                                {activeTasks.length} active · {completedTasks.length} completed
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={openCreateTaskModal}
                              title="Add a task to this launch"
                              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${primaryActionClass}`}
                            >
                              <PlusIcon className="h-4 w-4" />
                              Add Task
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[var(--text-strong)]">Active Tasks</h3>
                                <span
                                  className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
                                  title={`${activeTasks.length} active tasks`}
                                >
                                  {activeTasks.length}
                                </span>
                              </div>
                              <div className="space-y-3">
                                {loading && !activeTasks.length ? (
                                  <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                                    Loading tasks...
                                  </div>
                                ) : activeTasks.length ? (
                                  activeTasks.map((task) => (
                                    <article key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-5)] p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-[15px] font-medium text-[var(--text-strong)]">{task.title}</p>
                                          {(task.description || "").trim() ? (
                                            <p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p>
                                          ) : null}
                                          <p className="mt-1 text-xs text-[var(--text-dim)]">
                                            {task.assignee} · due {formatDate(task.dueDate)} · updated {formatRelative(task.updatedAt)}
                                          </p>
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span
                                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${taskPillClass(task.status, themeMode)}`}
                                              title={`Task status: ${taskStatusLabel(task.status)}`}
                                            >
                                              {taskStatusLabel(task.status)}
                                            </span>
                                            <span
                                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${taskPriorityPillClass(task.priority || "Medium", themeMode)}`}
                                              title={`Task priority: ${task.priority || "Medium"}`}
                                            >
                                              {(task.priority || "Medium")} Priority
                                            </span>
                                            <span
                                              className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]"
                                              title={`Task type: ${task.taskType || "General"}`}
                                            >
                                              {task.taskType || "General"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <select
                                            value={task.status}
                                            onChange={(event) =>
                                              handleTaskStatusChange(task.id, event.target.value as TaskStatus)
                                            }
                                            title="Change task status"
                                            className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                          >
                                            {TASK_STATUSES.map((status) => (
                                              <option value={status} key={status}>
                                                {taskStatusLabel(status)}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => openEditTaskModal(task)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                            title="Edit task"
                                          >
                                            <EditIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </article>
                                  ))
                                ) : (
                                  <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                                    No active tasks yet.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[var(--text-strong)]">Completed Tasks</h3>
                                <span
                                  className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
                                  title={`${completedTasks.length} completed tasks`}
                                >
                                  {completedTasks.length}
                                </span>
                              </div>
                              <div className="space-y-3">
                                {completedTasks.length ? (
                                  completedTasks.map((task) => (
                                    <article key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-4)] p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-[15px] font-medium text-[var(--text-strong)]">{task.title}</p>
                                          {(task.description || "").trim() ? (
                                            <p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p>
                                          ) : null}
                                          <p className="mt-1 text-xs text-[var(--text-dim)]">
                                            {task.assignee} · completed · updated {formatRelative(task.updatedAt)}
                                          </p>
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span
                                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${taskPillClass(task.status, themeMode)}`}
                                              title={`Task status: ${taskStatusLabel(task.status)}`}
                                            >
                                              {taskStatusLabel(task.status)}
                                            </span>
                                            <span
                                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${taskPriorityPillClass(task.priority || "Medium", themeMode)}`}
                                              title={`Task priority: ${task.priority || "Medium"}`}
                                            >
                                              {(task.priority || "Medium")} Priority
                                            </span>
                                            <span
                                              className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]"
                                              title={`Task type: ${task.taskType || "General"}`}
                                            >
                                              {task.taskType || "General"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          <select
                                            value={task.status}
                                            onChange={(event) =>
                                              handleTaskStatusChange(task.id, event.target.value as TaskStatus)
                                            }
                                            title="Change task status"
                                            className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                          >
                                            {TASK_STATUSES.map((status) => (
                                              <option value={status} key={status}>
                                                {taskStatusLabel(status)}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => openEditTaskModal(task)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                            title="Edit task"
                                          >
                                            <EditIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </article>
                                  ))
                                ) : (
                                  <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                                    No completed tasks yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Participants</p>
                              <p className="text-xs text-[var(--text-faint)]">
                                {activeLaunchParties.length} launch participant{activeLaunchParties.length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!activeLaunchParties.length) {
                                  return;
                                }
                                setChatRecipientIds(activeLaunchParties.map((party) => party.id));
                                setIsChatOpen(true);
                              }}
                              title="Open chat with all launch participants"
                              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${primaryActionClass}`}
                            >
                              <ChatIcon className="h-4 w-4" />
                              Chat with Team
                            </button>
                          </div>

                          <div className="space-y-2">
                            {activeLaunchParties.length ? (
                              activeLaunchParties.map((party) => (
                                <article
                                  key={party.id}
                                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{party.name}</p>
                                    <p className="truncate text-xs text-[var(--text-muted)]">{party.role || "Launch Stakeholder"}</p>
                                    <p className="truncate text-xs text-[var(--text-dim)]">{party.email || "No email listed"}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setChatRecipientIds([party.id]);
                                      setIsChatOpen(true);
                                    }}
                                    title={`Start chat with ${party.name}`}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs font-medium text-[var(--text-base)] transition hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                  >
                                    <ChatIcon className="h-3.5 w-3.5" />
                                    Message
                                  </button>
                                </article>
                              ))
                            ) : (
                              <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                                No participants on this launch yet.
                              </div>
                            )}
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--text-dim)]">
                        Select a launch from the list to open detail view.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {isInboxView ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">Inbox Items</h2>
                  <p className="text-xs text-[var(--text-dim)]">{inboxItems.length} pending actions</p>
                </div>
                <div className="space-y-3">
                  {inboxItems.length ? (
                    inboxItems.map(({ task, launch, isOverdue }) => (
                      <article key={task.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium text-[var(--text-strong)]">{task.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-dim)]">
                              {launch ? launch.title : "No launch"} · {task.assignee} · due {formatDate(task.dueDate)}
                            </p>
                          </div>
                          <span
                            title={isOverdue ? "Task is overdue and needs attention" : "Task is active and on track"}
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isOverdue
                                ? themeMode === "dark"
                                  ? "border border-rose-400/50 bg-rose-700/25 text-rose-200"
                                  : "border border-rose-300 bg-rose-100 text-rose-800"
                                : themeMode === "dark"
                                  ? "border border-sky-400/40 bg-sky-700/20 text-sky-200"
                                  : "border border-sky-300 bg-sky-100 text-sky-800"
                            }`}
                          >
                            {isOverdue ? "Overdue" : "Active"}
                          </span>
                        </div>
                        {launch ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLaunchId(launch.id);
                                setActiveNav("my_launches");
                              }}
                              title={`Open launch details: ${launch.title}`}
                              className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-base)] transition hover:border-cyan-400/45"
                            >
                              Open launch
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                      Inbox is clear. No open actions right now.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {isReviewsView ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">Review Queue</h2>
                  <p className="text-xs text-[var(--text-dim)]">{reviewItems.length} launches requiring review</p>
                </div>
                <div className="space-y-3">
                  {reviewItems.length ? (
                    reviewItems.map((item) => (
                      <article key={item.launch.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium text-[var(--text-strong)]">{item.launch.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-dim)]">
                              {item.launch.owner} · {item.openTasks} open · {item.doneTasks} completed
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${stagePillClass(item.launch.stage, themeMode)}`}
                            title={`Launch stage: ${item.launch.stage}`}
                          >
                            {item.launch.stage}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.reasons.map((reason) => (
                            <span key={reason} className={reviewReasonPillClass} title={`Review reason: ${reason}`}>
                              {reason}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLaunchId(item.launch.id);
                              setActiveNav("my_launches");
                            }}
                            title={`Open launch details: ${item.launch.title}`}
                            className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-base)] transition hover:border-cyan-400/45"
                          >
                            Open launch
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-4 text-sm text-[var(--text-dim)]">
                      No launches currently need review.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {isPulseView ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-3 flex items-end justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">Portfolio Pulse</h2>
                  <p className="text-xs text-[var(--text-dim)]">
                    {analytics.totalLaunches} launches · {analytics.openTasks} open tasks · {analytics.overdueTasks} overdue
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Total Launches</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.totalLaunches}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Active Launches</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.activeLaunches}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">At Risk Launches</p>
                    <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-rose-200" : "text-rose-700"}`}>
                      {analytics.atRiskLaunches}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Due in 30 Days</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.launchesDueSoon}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Open Tasks</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.openTasks}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">On-Time Completion</p>
                    <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-emerald-200" : "text-emerald-700"}`}>
                      {analytics.onTimeCompletionRate}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Task Completion</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.completionRate}%</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Overdue Open Rate</p>
                    <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-amber-200" : "text-amber-700"}`}>
                      {analytics.overdueOpenRate}%
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Tasks Due in 7 Days</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.dueNext7DaysTasks}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Launches Without Tasks</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.launchesWithoutTasks}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Task Status Mix</h3>
                    <div className="mt-3 space-y-2">
                      {[
                        { label: "Todo", value: analytics.todoTasks },
                        { label: "In Progress", value: analytics.inProgressTasks },
                        { label: "Completed", value: analytics.doneTasks }
                      ].map((entry) => {
                        const width = analytics.totalTasks
                          ? Math.max(8, Math.round((entry.value / analytics.totalTasks) * 100))
                          : 0;

                        return (
                          <div key={entry.label}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-[var(--text-muted)]">{entry.label}</span>
                              <span className="text-[var(--text-dim)]">{entry.value}</span>
                            </div>
                            <div className="h-2 rounded bg-[var(--surface-2)]">
                              <div
                                className={themeMode === "dark" ? "h-2 rounded bg-sky-500/60" : "h-2 rounded bg-sky-500"}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Stage Health</h3>
                    <div className="mt-3 space-y-2">
                      {analytics.stageHealth.map((entry) => (
                        <div key={entry.stage} className="rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-[var(--text-strong)]">{entry.stage}</p>
                            <p className="text-xs text-[var(--text-dim)]">{entry.count} launches</p>
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {entry.openTasks} open · {entry.overdueTasks} overdue · {entry.completionRate}% complete
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Launch Type Mix</h3>
                    <div className="mt-3 space-y-2">
                      {analytics.byType.map((entry) => (
                        <div key={entry.type}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-[var(--text-muted)]">{entry.type}</span>
                            <span className="text-[var(--text-dim)]">
                              {entry.count} ({entry.share}%)
                            </span>
                          </div>
                          <div className="h-2 rounded bg-[var(--surface-2)]">
                            <div
                              className={themeMode === "dark" ? "h-2 rounded bg-cyan-500/60" : "h-2 rounded bg-cyan-500"}
                              style={{ width: `${Math.max(8, entry.share)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Owner Workload</h3>
                    <div className="mt-3 space-y-2">
                      {analytics.ownerWorkload.length ? (
                        analytics.ownerWorkload.map((owner) => (
                          <div
                            key={owner.owner}
                            className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-[var(--text-strong)]">{owner.owner}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {owner.launches} launches · {owner.openTasks} open tasks
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-dim)]">
                                Projects: {owner.launchProjects.join(", ")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-semibold ${themeMode === "dark" ? "text-rose-200" : "text-rose-700"}`}>
                                {owner.overdueTasks} overdue
                              </p>
                              <p className="text-xs text-[var(--text-dim)]">
                                {owner.urgentLaunches} urgent · {owner.highRiskLaunches} high risk
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-dim)]">No owner workload data yet.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Upcoming Launch Milestones</h3>
                    <div className="mt-3 space-y-2">
                      {analytics.upcomingMilestones.length ? (
                        analytics.upcomingMilestones.map((launch) => {
                          const timingLabel =
                            launch.daysToDue < 0
                              ? `${Math.abs(launch.daysToDue)}d overdue`
                              : launch.daysToDue === 0
                                ? "Due today"
                                : `${launch.daysToDue}d to due`;

                          return (
                            <div
                              key={launch.id}
                              className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2"
                            >
                              <div className="min-w-0 pr-3">
                                <p className="truncate text-sm font-medium text-[var(--text-strong)]">{launch.title}</p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {launch.owner} · {launch.stage} · {formatDate(launch.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-xs font-semibold ${launch.daysToDue < 0 ? (themeMode === "dark" ? "text-rose-200" : "text-rose-700") : "text-[var(--text-base)]"}`}>
                                  {timingLabel}
                                </p>
                                <p className="text-xs text-[var(--text-dim)]">{launch.openTasks} open tasks</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-[var(--text-dim)]">No upcoming due dates are set.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {isProfileModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--line)] bg-[var(--surface-header)] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Profile & Settings</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">Your account preferences</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                title="Close profile and settings"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--line)] text-[var(--text-base)] transition hover:border-cyan-400/45"
              >
                <CancelIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Full name</span>
                  <input
                    value={profileDraft.fullName}
                    onChange={(event) =>
                      setProfileDraft((current) => ({ ...current, fullName: event.target.value }))
                    }
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Full name"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Role</span>
                  <input
                    value={profileDraft.role}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, role: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Role"
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-[var(--text-muted)]">Email</span>
                <input
                  type="email"
                  value={profileDraft.email}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  placeholder="name@company.com"
                />
              </label>

              <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Theme</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Light mode is default. Switch to dark mode anytime.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    title="Switch to light mode"
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      themeMode === "light"
                        ? "border-cyan-400/55 bg-cyan-200/70 text-cyan-900"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-cyan-400/45"
                    }`}
                  >
                    Light mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    title="Switch to dark mode"
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      themeMode === "dark"
                        ? "border-cyan-400/55 bg-cyan-500/20 text-cyan-200"
                        : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-cyan-400/45"
                    }`}
                  >
                    Dark mode
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2">
                  <p className="text-sm text-[var(--text-base)]">Dark mode toggle</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={themeMode === "dark"}
                    onClick={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
                    title={themeMode === "dark" ? "Turn dark mode off" : "Turn dark mode on"}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                      themeMode === "dark"
                        ? "border-cyan-400/55 bg-cyan-600/45"
                        : "border-[var(--line)] bg-[var(--surface-3)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                        themeMode === "dark" ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </section>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  title="Cancel and close profile settings"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-base)] transition hover:border-cyan-400/45"
                >
                  <CancelIcon className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  title="Save profile and settings"
                  className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${primaryActionClass}`}
                >
                  <SaveIcon className="h-5 w-5" />
                  Save settings
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isTaskModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-3 py-4">
          <div className="w-full max-w-2xl rounded-xl border border-[var(--line)] bg-[var(--surface-header)] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">
                  {taskModalMode === "edit" ? "Edit Task" : "Add Task"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">
                  {taskModalMode === "edit" ? "Update task details" : "Create a detailed task"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                title="Close task dialog"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--line)] text-[var(--text-base)] transition hover:border-cyan-400/45"
              >
                <CancelIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-3">
              <label className="space-y-1">
                <span className="text-xs text-[var(--text-muted)]">Task title *</span>
                <input
                  value={taskForm.title}
                  onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  placeholder="Task title"
                  required
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--text-muted)]">Task details</span>
                <textarea
                  value={taskForm.description}
                  onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  placeholder="What needs to happen, definition of done, notes..."
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Assignee</span>
                  <input
                    value={taskForm.assignee}
                    onChange={(event) => setTaskForm((current) => ({ ...current, assignee: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Assignee"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Due date</span>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Priority</span>
                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))
                    }
                    title="Select task priority"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {TASK_PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Task type</span>
                  <select
                    value={taskForm.taskType}
                    onChange={(event) => setTaskForm((current) => ({ ...current, taskType: event.target.value }))}
                    title="Select task type"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {TASK_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Status</span>
                  <select
                    value={taskForm.status}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, status: event.target.value as TaskStatus }))
                    }
                    title="Select task status"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {taskStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  title="Cancel task changes"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-base)] transition hover:border-cyan-400/45"
                >
                  <CancelIcon className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  title={taskModalMode === "edit" ? "Save task updates" : "Create task"}
                  className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${primaryActionClass}`}
                >
                  {taskModalMode === "edit" ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                  {taskModalMode === "edit" ? "Save Task" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isLaunchModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-3 py-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface-header)] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">
                  {launchModalMode === "edit" ? "Edit Launch" : "Create Launch"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">
                  {launchModalMode === "edit" ? "Update launch details" : "Add a new launch"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLaunchModalOpen(false)}
                title="Close launch dialog"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--line)] text-[var(--text-base)] transition hover:border-cyan-400/45"
              >
                <CancelIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLaunchSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Launch title *</span>
                  <input
                    value={launchForm.title}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, title: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Launch title"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Owner *</span>
                  <input
                    value={launchForm.owner}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, owner: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Launch owner"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Launch type</span>
                  <select
                    value={launchForm.launchType}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, launchType: event.target.value }))}
                    title="Select launch type"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {LAUNCH_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Category</span>
                  <input
                    value={launchForm.category}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, category: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="e.g., Sparkling Water"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Brand</span>
                  <input
                    value={launchForm.brand}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, brand: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Brand"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Market</span>
                  <input
                    value={launchForm.market}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, market: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="US East"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Stage</span>
                  <select
                    value={launchForm.stage}
                    onChange={(event) =>
                      setLaunchForm((current) => ({
                        ...current,
                        stage: event.target.value as ProjectStage
                      }))
                    }
                    title="Select launch stage"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {LAUNCH_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Priority</span>
                  <select
                    value={launchForm.priority}
                    onChange={(event) =>
                      setLaunchForm((current) => ({
                        ...current,
                        priority: event.target.value as ProjectPriority
                      }))
                    }
                    title="Select launch priority"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {(["Low", "Medium", "High", "Urgent"] as ProjectPriority[]).map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Risk</span>
                  <select
                    value={launchForm.riskLevel}
                    onChange={(event) =>
                      setLaunchForm((current) => ({
                        ...current,
                        riskLevel: event.target.value as ProjectRisk
                      }))
                    }
                    title="Select launch risk level"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {(["Low", "Medium", "High"] as ProjectRisk[]).map((riskLevel) => (
                      <option key={riskLevel} value={riskLevel}>
                        {riskLevel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-[var(--text-muted)]">Due date</span>
                <input
                  type="date"
                  value={launchForm.dueDate}
                  onChange={(event) => setLaunchForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--text-muted)]">Launch brief</span>
                <textarea
                  value={launchForm.description}
                  onChange={(event) =>
                    setLaunchForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  placeholder="Describe concept, validation goals, and launch milestones"
                />
              </label>

              <div className="rounded-md border border-[var(--line)] bg-[var(--surface-4)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Parties involved</p>
                  <button
                    type="button"
                    onClick={addStakeholderField}
                    title="Add another stakeholder row"
                    className="rounded border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--text-base)] transition hover:border-cyan-400/45"
                  >
                    Add party
                  </button>
                </div>

                <div className="space-y-2">
                  {launchForm.stakeholders.map((stakeholder) => (
                    <div key={stakeholder.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <input
                        value={stakeholder.name}
                        onChange={(event) => updateStakeholderField(stakeholder.id, { name: event.target.value })}
                        className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                        placeholder="Name"
                      />
                      <input
                        value={stakeholder.role}
                        onChange={(event) => updateStakeholderField(stakeholder.id, { role: event.target.value })}
                        className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                        placeholder="Role"
                      />
                      <input
                        value={stakeholder.email}
                        onChange={(event) => updateStakeholderField(stakeholder.id, { email: event.target.value })}
                        className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                        placeholder="Email"
                      />
                      <button
                        type="button"
                        onClick={() => removeStakeholderField(stakeholder.id)}
                        title="Remove stakeholder row"
                        className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-muted)] transition hover:border-cyan-400/45"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  title="Cancel launch changes"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-base)] transition hover:border-cyan-400/45"
                >
                  <CancelIcon className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  title={launchModalMode === "edit" ? "Save launch updates" : "Create launch"}
                  className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${primaryActionClass}`}
                >
                  {launchModalMode === "edit" ? <SaveIcon className="h-5 w-5" /> : <CreateIcon className="h-5 w-5" />}
                  {launchModalMode === "edit" ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {launchDeleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-3 py-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--surface-header)] p-5 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Delete Launch</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">Delete “{launchDeleteTarget.title}”?</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              This removes the launch from the list and clears its visible activity.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLaunchDeleteTarget(null)}
                title="Cancel launch deletion"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-4 text-sm text-[var(--text-base)] transition hover:border-cyan-400/45"
              >
                <CancelIcon className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLaunch}
                title="Permanently delete this launch"
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${destructiveActionClass}`}
              >
                <DeleteIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
