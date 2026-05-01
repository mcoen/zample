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
  configureApiSession,
  createLaunch as apiCreateLaunch,
  createTask as apiCreateTask,
  deleteLaunch as apiDeleteLaunch,
  listLaunches,
  listTasks,
  updateLaunch as apiUpdateLaunch,
  updateTask,
  type LaunchAttachment,
  type LaunchBrief,
  type LaunchConfirmationStatus,
  type LaunchFeedback,
  type LaunchIntake,
  type LaunchLifecycleStatus,
  type LaunchMessage,
  type LaunchParty,
  type Launch,
  type LaunchPriority,
  type LaunchProjectKind,
  type LaunchRequestChannel,
  type LaunchRisk,
  type LaunchStage,
  type VendorChoice,
  type Task,
  type TaskPriority,
  type TaskStatus
} from "@/lib/api";
import type { SessionRoleKey, SessionUser } from "@/lib/auth";

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
  demandCompanyName: string;
  requesterName: string;
  requestChannel: LaunchRequestChannel;
  projectKind: LaunchProjectKind;
  beverageClass: LaunchIntake["beverageClass"];
  targetLaunchTiming: string;
  estimatedAnnualVolume: string;
  targetPrice: string;
  knownCommercialOpportunity: boolean;
  requiredComplianceDocuments: string[];
  stage: LaunchStage;
  priority: LaunchPriority;
  riskLevel: LaunchRisk;
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
  tag: "Clarification" | "Urgent" | "Blocking" | "Update";
  unresolved: boolean;
  fieldRef: string;
  createdAt: string;
};

type LaunchExtendedDraft = {
  lifecycleStatus: LaunchLifecycleStatus;
  confirmationStatus: LaunchConfirmationStatus;
  intake: LaunchIntake;
  brief: LaunchBrief;
  vendorSelection: {
    approvedVendors: string[];
    suggestedVendors: string[];
    selectedVendors: VendorChoice[];
    requestVisibility: "Visible" | "Blind";
  };
  requiredComplianceDocuments: string[];
  attachments: LaunchAttachment[];
};

type ThemeMode = "light" | "dark";

type UserProfile = {
  fullName: string;
  email: string;
  role: string;
};

type LaunchesClientPageProps = {
  initialSessionUser?: SessionUser | null;
};

type NavItemId = "my_launches" | "inbox" | "reviews" | "pulse";
type LaunchDetailsTab = "overview" | "brief" | "vendors" | "attachments" | "tasks" | "feedback" | "participants";

const LAUNCH_STAGES: LaunchStage[] = ["Intake", "In Validation", "Pilot", "Production"];
const LIFECYCLE_STATUSES: LaunchLifecycleStatus[] = [
  "Draft",
  "Sent to Demand Company",
  "Confirmed by Demand Company",
  "In Review",
  "Clarification Needed",
  "Approved for Sampling",
  "In Formulation / Sample Prep",
  "Sample Shipped",
  "Awaiting Demand Feedback",
  "Feedback Received",
  "Revision Requested",
  "Closed Won",
  "Closed Lost",
  "Inactive"
];
const CONFIRMATION_STATUSES: LaunchConfirmationStatus[] = ["Not Sent", "Sent", "Confirmed", "Needs Update"];
const REQUEST_CHANNEL_OPTIONS: LaunchRequestChannel[] = ["Email", "Phone", "Meeting", "Portal", "Other"];
const PROJECT_KIND_OPTIONS: LaunchProjectKind[] = ["Real Project", "Library Sample"];
const BEVERAGE_CLASS_OPTIONS: Array<LaunchIntake["beverageClass"]> = ["Beverage", "Non-Beverage"];
const PRICING_REQUEST_TIMING_OPTIONS: Array<LaunchBrief["pricingRequestTiming"]> = [
  "Required Now",
  "Required Later",
  "Not Needed Yet"
];
const FEEDBACK_TYPES: Array<LaunchFeedback["type"]> = [
  "Acknowledgement",
  "Clarification",
  "Feasibility",
  "Timeline",
  "Sample Feedback"
];
const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
const LAUNCH_TYPE_OPTIONS = ["Beverage", "Condiment", "Snack", "Ingredient", "Other"];
const TASK_PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High"];
const TASK_TYPE_OPTIONS = ["General", "Validation", "Sensory", "Regulatory", "Packaging", "Commercial"];
const FLAVOR_TAG_OPTIONS = [
  "Citrus",
  "Sweet",
  "Savory",
  "Umami",
  "Smoky",
  "Spicy",
  "Herbal",
  "Creamy",
  "Roasted",
  "Fruity"
];
const CERTIFICATION_OPTIONS = [
  "Kosher",
  "Halal",
  "Organic",
  "Non-GMO",
  "Gluten-Free",
  "Vegan",
  "Fair Trade",
  "SQF",
  "FSSC 22000"
];
const REGULATORY_DOCUMENT_OPTIONS = [
  "SDS",
  "Allergen Statement",
  "Nutrition Facts Panel",
  "Specification Sheet",
  "COA",
  "GMO Statement",
  "Country of Origin",
  "Prop 65 Statement"
];
const COMPLIANCE_DOCUMENT_OPTIONS = [
  "COA",
  "Allergen Statement",
  "Kosher Certificate",
  "Halal Certificate",
  "Non-GMO Certificate",
  "SDS",
  "Specification Sheet",
  "Nutrition Facts Panel"
];
const ATTACHMENT_FILE_TYPE_OPTIONS = [
  "Document",
  "PDF",
  "DOCX",
  "XLSX",
  "CSV",
  "PPTX",
  "Image",
  "Spec Sheet",
  "Certificate",
  "COA",
  "SDS",
  "Other"
];
const ATTACHMENT_CATEGORY_OPTIONS = ["Reference", "Compliance", "Pricing", "Sensory", "Demand Brief", "Other"];
const VENDOR_OPTION_LIBRARY = [
  "Arbor Flavor Group",
  "BluePeak Beverage Systems",
  "BrightBrew Components",
  "CitrusCraft Ingredients",
  "Coastal Culinary Systems",
  "CrunchLab Foods",
  "Fermenta Labs",
  "FiberNorth Ingredients",
  "FlavorWorks Labs",
  "GrainSmith Partners",
  "Heritage Blends",
  "HydraTaste Collective",
  "Peak Pantry Co.",
  "SauceForge Solutions",
  "Savory Trail Labs",
  "SpiceRoute Co.",
  "Texture Forge",
  "Umami Foundry"
];
const THEME_STORAGE_KEY = "zample_theme_mode";
const PROFILE_STORAGE_KEY = "zample_profile";
const DEFAULT_PROFILE: UserProfile = {
  fullName: "Launch Manager",
  email: "manager@zample.app",
  role: "Marketplace Program Lead"
};

function profileFromSessionUser(user: SessionUser): UserProfile {
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
}

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

function ViewIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function DocPdfIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M8 15h8M8 18h6" />
    </svg>
  );
}

function DocSheetIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M8 11h8M8 14h8M8 17h8" />
    </svg>
  );
}

function DocImageIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <circle cx="10" cy="12" r="1.5" />
      <path d="m8 18 3-3 2.2 2.2L16 14l2 2" />
    </svg>
  );
}

function DocCertIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <circle cx="11" cy="13" r="2.5" />
      <path d="m10 15 1.2 2L12.7 15" />
    </svg>
  );
}

function DocTextIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M8 11h8M8 14h8M8 17h5" />
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

const MAIN_NAV: Array<{ id: NavItemId; label: string; icon: ComponentType<IconProps> }> = [
  { id: "my_launches", label: "My Launches", icon: LaunchIcon },
  { id: "inbox", label: "Inbox", icon: HomeIcon },
  { id: "reviews", label: "Reviews", icon: ReviewIcon },
  { id: "pulse", label: "Pulse", icon: PulseIcon }
];
const LAUNCH_DETAILS_TABS: Array<{ id: LaunchDetailsTab; label: string; hint: string }> = [
  { id: "overview", label: "Overview", hint: "Launch summary and lifecycle progress" },
  { id: "brief", label: "Brief", hint: "Intake and product brief details" },
  { id: "vendors", label: "Vendors", hint: "Approved and suggested vendors plus selection workflow" },
  { id: "attachments", label: "Attachments", hint: "Attachments and compliance document tracking" },
  { id: "tasks", label: "Tasks", hint: "Active and completed launch tasks" },
  { id: "feedback", label: "Feedback", hint: "Structured vendor and demand company feedback loop" },
  { id: "participants", label: "Participants", hint: "Launch team and participant messaging" }
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

function labelFromOrgId(orgId: string, fallback: string) {
  const cleaned = String(orgId || "").trim();
  if (!cleaned) {
    return fallback;
  }

  const base = cleaned
    .replace(/^org_(vendor|demand|marketplace)_/, "")
    .replace(/_/g, " ")
    .trim();

  if (!base) {
    return fallback;
  }

  return base
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugifyToken(value: string, fallback = "item") {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || fallback;
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

function stagePillClass(stage: LaunchStage, themeMode: ThemeMode) {
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

function priorityPillClass(priority: LaunchPriority, themeMode: ThemeMode) {
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

function riskPillClass(riskLevel: LaunchRisk, themeMode: ThemeMode) {
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

function inferLaunchType(launch: Launch) {
  const explicit = String(launch.launchType || "").trim();
  if (explicit) {
    return explicit;
  }

  const descriptor = `${launch.category || ""} ${launch.title || ""}`.toLowerCase();
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

function launchVisual(launch: Launch, themeMode: ThemeMode) {
  const descriptor = `${launch.category || ""} ${launch.launchType || ""} ${launch.title || ""}`.toLowerCase();

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

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const cleaned = String(value || "").trim();
    if (!cleaned) {
      return;
    }
    const token = cleaned.toLowerCase();
    if (seen.has(token)) {
      return;
    }
    seen.add(token);
    output.push(cleaned);
  });

  return output;
}

function addListValue(values: string[], nextValue: string) {
  const cleaned = String(nextValue || "").trim();
  if (!cleaned) {
    return values;
  }
  return normalizeList([...values, cleaned]);
}

function removeListValue(values: string[], valueToRemove: string) {
  return values.filter((value) => value !== valueToRemove);
}

function listChipClass(value: string, themeMode: ThemeMode) {
  const hash = value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const light = [
    "border-cyan-300 bg-cyan-100 text-cyan-800",
    "border-emerald-300 bg-emerald-100 text-emerald-800",
    "border-indigo-300 bg-indigo-100 text-indigo-800",
    "border-amber-300 bg-amber-100 text-amber-800",
    "border-rose-300 bg-rose-100 text-rose-800"
  ];
  const dark = [
    "border-cyan-400/45 bg-cyan-700/20 text-cyan-200",
    "border-emerald-400/45 bg-emerald-700/20 text-emerald-200",
    "border-indigo-400/45 bg-indigo-700/20 text-indigo-200",
    "border-amber-400/45 bg-amber-700/20 text-amber-200",
    "border-rose-400/45 bg-rose-700/20 text-rose-200"
  ];
  const tones = themeMode === "dark" ? dark : light;
  return tones[hash % tones.length];
}

function attachmentIconData(fileType: string, themeMode: ThemeMode) {
  const normalized = fileType.toLowerCase();
  if (/(pdf)/.test(normalized)) {
    return {
      icon: DocPdfIcon,
      color: themeMode === "dark" ? "text-rose-200" : "text-rose-700"
    };
  }
  if (/(xls|csv|sheet)/.test(normalized)) {
    return {
      icon: DocSheetIcon,
      color: themeMode === "dark" ? "text-emerald-200" : "text-emerald-700"
    };
  }
  if (/(image|png|jpg|jpeg|gif|webp)/.test(normalized)) {
    return {
      icon: DocImageIcon,
      color: themeMode === "dark" ? "text-cyan-200" : "text-cyan-700"
    };
  }
  if (/(certificate|coa|sds)/.test(normalized)) {
    return {
      icon: DocCertIcon,
      color: themeMode === "dark" ? "text-amber-200" : "text-amber-700"
    };
  }
  return {
    icon: DocTextIcon,
    color: themeMode === "dark" ? "text-indigo-200" : "text-indigo-700"
  };
}

type MultiValueEditorProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  helperText?: string;
  themeMode: ThemeMode;
  title?: string;
};

function MultiValueEditor({
  label,
  values,
  onChange,
  options,
  placeholder = "Add item",
  helperText,
  themeMode,
  title
}: MultiValueEditorProps) {
  const [customValue, setCustomValue] = useState("");

  const availableOptions = useMemo(
    () => options.filter((option) => !values.some((value) => value.toLowerCase() === option.toLowerCase())),
    [options, values]
  );

  function addCustomValue() {
    const nextValues = addListValue(values, customValue);
    if (nextValues !== values) {
      onChange(nextValues);
    }
    setCustomValue("");
  }

  return (
    <div className="space-y-1" title={title}>
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      {helperText ? <p className="text-[11px] text-[var(--text-dim)]">{helperText}</p> : null}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {values.length ? (
          values.map((value) => (
            <span
              key={value}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${listChipClass(value, themeMode)}`}
              title={`${label}: ${value}`}
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(removeListValue(values, value))}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
                title={`Remove ${value}`}
              >
                <CancelIcon className="h-2.5 w-2.5" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-[11px] text-[var(--text-dim)]">No items selected.</span>
        )}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select
          value=""
          onChange={(event) => {
            const selected = event.target.value;
            if (selected) {
              onChange(addListValue(values, selected));
            }
          }}
          className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
          title={`Select ${label.toLowerCase()} option`}
        >
          <option value="">Select Option</option>
          {availableOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomValue();
            }
          }}
          className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
          placeholder={placeholder}
          title={`Add custom ${label.toLowerCase()} item`}
        />
        <button
          type="button"
          onClick={addCustomValue}
          className="inline-flex h-8 items-center rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs font-semibold text-[var(--text-base)] transition hover:border-cyan-400/45"
          title={`Add custom ${label.toLowerCase()} item`}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function launchFormFromLaunch(launch?: Launch): LaunchFormState {
  if (!launch) {
    return {
      title: "",
      owner: "",
      launchType: LAUNCH_TYPE_OPTIONS[0],
      category: "",
      brand: "",
      market: "",
      demandCompanyName: "",
      requesterName: "",
      requestChannel: "Email",
      projectKind: "Real Project",
      beverageClass: "Non-Beverage",
      targetLaunchTiming: "",
      estimatedAnnualVolume: "",
      targetPrice: "",
      knownCommercialOpportunity: false,
      requiredComplianceDocuments: [],
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
    title: launch.title || "",
    owner: launch.owner || "",
    launchType: inferLaunchType(launch),
    category: launch.category || "",
    brand: launch.brand || "",
    market: launch.market || "",
    demandCompanyName: launch.intake?.demandCompanyName || launch.brand || "",
    requesterName: launch.intake?.requesterName || launch.owner || "",
    requestChannel: launch.intake?.requestChannel || "Email",
    projectKind: launch.intake?.projectKind || "Real Project",
    beverageClass: launch.intake?.beverageClass || "Non-Beverage",
    targetLaunchTiming: launch.intake?.targetLaunchTiming || "",
    estimatedAnnualVolume: launch.intake?.estimatedAnnualVolume || "",
    targetPrice: launch.intake?.targetPrice || "",
    knownCommercialOpportunity: Boolean(launch.intake?.knownCommercialOpportunity),
    requiredComplianceDocuments: normalizeList(launch.requiredComplianceDocuments || []),
    stage: launch.stage,
    priority: launch.priority,
    riskLevel: launch.riskLevel,
    dueDate: launch.dueDate ? launch.dueDate.slice(0, 10) : "",
    description: launch.description || "",
    stakeholders:
      launch.stakeholders && launch.stakeholders.length
        ? launch.stakeholders.map((stakeholder) => ({
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

function normalizeLaunchForUi(launch: Launch): Launch {
  const intake: LaunchIntake = {
    demandCompanyName: launch.intake?.demandCompanyName || launch.brand || "Unknown Demand Company",
    requesterName: launch.intake?.requesterName || launch.owner || "",
    requestChannel: launch.intake?.requestChannel || "Email",
    requestDetails: launch.intake?.requestDetails || launch.description || "",
    projectKind: launch.intake?.projectKind || "Real Project",
    beverageClass: launch.intake?.beverageClass || (/beverage|drink|juice|tea|coffee|water/i.test(launch.title) ? "Beverage" : "Non-Beverage"),
    targetLaunchTiming: launch.intake?.targetLaunchTiming || (launch.dueDate || ""),
    knownCommercialOpportunity: Boolean(launch.intake?.knownCommercialOpportunity),
    estimatedAnnualVolume: launch.intake?.estimatedAnnualVolume || "",
    targetPrice: launch.intake?.targetPrice || "",
    supplierProposedPrice: launch.intake?.supplierProposedPrice || "",
    priceUnit: launch.intake?.priceUnit || "per lb",
    priceSensitivity: launch.intake?.priceSensitivity || "Medium"
  };

  const brief: LaunchBrief = {
    sampleType: launch.brief?.sampleType || "Flavor System",
    targetFlavorProfile: launch.brief?.targetFlavorProfile || "",
    flavorTags: launch.brief?.flavorTags || [],
    creativeDirection: launch.brief?.creativeDirection || "Match Exactly",
    vendorSuggestionsRequested: Boolean(launch.brief?.vendorSuggestionsRequested),
    vendorSuggestionNotes: launch.brief?.vendorSuggestionNotes || "",
    application: launch.brief?.application || launch.category || "",
    samplePhaseVolume: launch.brief?.samplePhaseVolume || "",
    commercialScaleEstimate: launch.brief?.commercialScaleEstimate || "",
    sampleDueDate: launch.brief?.sampleDueDate || launch.dueDate || null,
    milestoneDate: launch.brief?.milestoneDate || launch.dueDate || null,
    pricingRequestTiming: launch.brief?.pricingRequestTiming || "Required Later",
    certificationsRequired: launch.brief?.certificationsRequired || [],
    regulatoryDocumentation: launch.brief?.regulatoryDocumentation || [],
    ingredientConstraints: launch.brief?.ingredientConstraints || "",
    costTarget: launch.brief?.costTarget || "",
    physicalFormat: launch.brief?.physicalFormat || "",
    stabilityRequirements: launch.brief?.stabilityRequirements || "",
    packagingSampleSize: launch.brief?.packagingSampleSize || "",
    deliveryFormat: launch.brief?.deliveryFormat || "",
    referenceProducts: launch.brief?.referenceProducts || "",
    internalNotes: launch.brief?.internalNotes || ""
  };

  const selectedVendors = launch.vendorSelection?.selectedVendors || [];
  const approvedVendors = launch.vendorSelection?.approvedVendors || selectedVendors.map((vendor) => vendor.name).slice(0, 3);
  const suggestedVendors =
    launch.vendorSelection?.suggestedVendors ||
    selectedVendors
      .map((vendor) => vendor.name)
      .slice(0, 3);
  const demandOrg = launch.demandOrg || {
    id: (launch as Launch & { demandOrgId?: string }).demandOrgId || `org_demand_${slugifyToken(intake.demandCompanyName, "company")}`,
    name: intake.demandCompanyName,
    type: "demand" as const
  };
  const vendorOrg = launch.vendorOrg || {
    id: (launch as Launch & { vendorOrgId?: string }).vendorOrgId || "org_vendor_flavorworks_labs",
    name: labelFromOrgId((launch as Launch & { vendorOrgId?: string }).vendorOrgId || "org_vendor_flavorworks_labs", "FlavorWorks Labs"),
    type: "vendor" as const
  };
  const organizationRelationship =
    launch.organizationRelationship ||
    ({
      id: `${vendorOrg.id}__${demandOrg.id}`,
      vendorOrgId: vendorOrg.id,
      demandOrgId: demandOrg.id,
      status: launch.lifecycleStatus === "Closed Won" ? "won" : launch.lifecycleStatus === "Closed Lost" ? "lost" : "active",
      owner: launch.owner || "Unassigned"
    } as Launch["organizationRelationship"]);

  return {
    ...launch,
    launchType: launch.launchType || inferLaunchType(launch),
    vendorOrg,
    demandOrg,
    organizationRelationship,
    lifecycleStatus: launch.lifecycleStatus || "Draft",
    confirmationStatus: launch.confirmationStatus || "Not Sent",
    intake,
    brief,
    vendorSelection: {
      approvedVendors,
      suggestedVendors,
      selectedVendors,
      requestVisibility: launch.vendorSelection?.requestVisibility || "Visible"
    },
    attachments: launch.attachments || [],
    requiredComplianceDocuments: launch.requiredComplianceDocuments || [],
    feedbackLog: launch.feedbackLog || [],
    messageThread: launch.messageThread || []
  };
}

function launchExtendedDraftFromLaunch(launch: Launch): LaunchExtendedDraft {
  const normalized = normalizeLaunchForUi(launch);

  return {
    lifecycleStatus: normalized.lifecycleStatus || "Draft",
    confirmationStatus: normalized.confirmationStatus || "Not Sent",
    intake: normalized.intake as LaunchIntake,
    brief: normalized.brief as LaunchBrief,
    vendorSelection: {
      approvedVendors: normalizeList(normalized.vendorSelection?.approvedVendors || []),
      suggestedVendors: normalizeList(normalized.vendorSelection?.suggestedVendors || []),
      selectedVendors: (normalized.vendorSelection?.selectedVendors || []).map((vendor) => ({ ...vendor })),
      requestVisibility: normalized.vendorSelection?.requestVisibility || "Visible"
    },
    requiredComplianceDocuments: normalizeList(normalized.requiredComplianceDocuments || []),
    attachments: (normalized.attachments || []).map((attachment) => ({ ...attachment }))
  };
}

function extendedDraftToLaunchPatch(draft: LaunchExtendedDraft): Partial<Launch> {
  return {
    lifecycleStatus: draft.lifecycleStatus,
    confirmationStatus: draft.confirmationStatus,
    intake: draft.intake,
    brief: draft.brief,
    vendorSelection: {
      approvedVendors: normalizeList(draft.vendorSelection.approvedVendors),
      suggestedVendors: normalizeList(draft.vendorSelection.suggestedVendors),
      selectedVendors: draft.vendorSelection.selectedVendors,
      requestVisibility: draft.vendorSelection.requestVisibility
    },
    requiredComplianceDocuments: normalizeList(draft.requiredComplianceDocuments),
    attachments: draft.attachments
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

export default function HomePage({ initialSessionUser = null }: LaunchesClientPageProps) {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavItemId>((initialSessionUser?.defaultNav || "my_launches") as NavItemId);
  const [activeLaunchId, setActiveLaunchId] = useState<string | null>(null);
  const [favoriteLaunchIds, setFavoriteLaunchIds] = useState<string[]>([]);
  const [launchSearch, setLaunchSearch] = useState("");
  const [sessionRoleKey, setSessionRoleKey] = useState<SessionRoleKey | null>(initialSessionUser?.roleKey || null);
  const [didApplySessionDefaults, setDidApplySessionDefaults] = useState(false);

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [launchModalMode, setLaunchModalMode] = useState<"create" | "edit">("create");
  const [launchEditingId, setLaunchEditingId] = useState<string | null>(null);
  const [launchForm, setLaunchForm] = useState<LaunchFormState>(() => launchFormFromLaunch());
  const [launchDeleteTarget, setLaunchDeleteTarget] = useState<Launch | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(() => taskFormFromTask());

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatRecipientIds, setChatRecipientIds] = useState<string[]>([]);
  const [chatTag, setChatTag] = useState<ChatMessage["tag"]>("Update");
  const [chatFieldRef, setChatFieldRef] = useState("");
  const [chatUnresolved, setChatUnresolved] = useState(false);
  const [extendedDraft, setExtendedDraft] = useState<LaunchExtendedDraft | null>(null);
  const [extendedSaving, setExtendedSaving] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState<{
    type: LaunchFeedback["type"];
    note: string;
  }>({ type: "Clarification", note: "" });
  const [launchDetailsTab, setLaunchDetailsTab] = useState<LaunchDetailsTab>("overview");

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (initialSessionUser) {
      return profileFromSessionUser(initialSessionUser);
    }

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

  const isSalesRole = sessionRoleKey === "vendor_sales_rep";
  const isRdRole = sessionRoleKey === "rd_specialist";
  const isAdminRole = sessionRoleKey === "marketplace_admin";
  const launchDetailsTabs = useMemo(() => {
    if (isSalesRole) {
      const salesVisibleTabIds: LaunchDetailsTab[] = ["overview", "brief", "attachments", "tasks", "feedback", "participants"];
      return LAUNCH_DETAILS_TABS.filter((tab) => salesVisibleTabIds.includes(tab.id)).map((tab) =>
        tab.id === "feedback"
          ? {
              ...tab,
              label: "Buyer Comms",
              hint: "Demand company communication updates for this launch"
            }
          : tab
      );
    }

    return LAUNCH_DETAILS_TABS;
  }, [isSalesRole]);

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
      .filter((launch): launch is Launch => Boolean(launch));
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
      .filter((task) => task.launchId === activeLaunch.id)
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

  const volumeHint = useMemo(() => {
    if (!activeLaunch) {
      return "";
    }

    const activeType = inferLaunchType(activeLaunch);
    const comparable = sortedLaunches.filter(
      (launch) => launch.id !== activeLaunch.id && inferLaunchType(launch) === activeType && launch.intake?.estimatedAnnualVolume
    );

    if (!comparable.length) {
      return "";
    }

    return comparable[0].intake?.estimatedAnnualVolume || "";
  }, [activeLaunch, sortedLaunches]);

  const currentStageIndex = useMemo(() => {
    if (!activeLaunch) {
      return -1;
    }

    return LAUNCH_STAGES.indexOf(activeLaunch.stage);
  }, [activeLaunch]);

  const currentLifecycleIndex = useMemo(() => {
    if (!activeLaunch) {
      return -1;
    }

    return LIFECYCLE_STATUSES.indexOf(activeLaunch.lifecycleStatus || "Draft");
  }, [activeLaunch]);

  const canSendForConfirmation = Boolean(
    isAdminRole &&
      extendedDraft &&
      (extendedDraft.confirmationStatus === "Not Sent" || extendedDraft.confirmationStatus === "Needs Update")
  );
  const canMarkConfirmed = Boolean(isAdminRole && extendedDraft && extendedDraft.confirmationStatus !== "Confirmed");
  const canRequestClarification = Boolean(
    isAdminRole &&
      extendedDraft &&
      !(
        extendedDraft.confirmationStatus === "Needs Update" &&
        extendedDraft.lifecycleStatus === "Clarification Needed"
      )
  );

  const activeChatMessages = useMemo(() => {
    if (!activeLaunch) {
      return [] as ChatMessage[];
    }

    return ((activeLaunch.messageThread || []) as ChatMessage[]).slice().sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [activeLaunch]);

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
      const stageTasks = tasks.filter((task) => task.launchId && launchIds.has(task.launchId));
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

    const launchIdsWithTasks = new Set(tasks.map((task) => task.launchId).filter((value): value is string => Boolean(value)));
    const launchesWithoutTasks = sortedLaunches.filter((launch) => !launchIdsWithTasks.has(launch.id)).length;

    const overdueLaunchIdSet = new Set(
      overdueTaskList.map((task) => task.launchId).filter((value): value is string => Boolean(value))
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
        launchTitles: string[];
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
        launchTitles: []
      };
      existing.launches += 1;
      if (!existing.launchTitles.includes(launch.title)) {
        existing.launchTitles.push(launch.title);
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
      if (!task.launchId) {
        return;
      }
      const launch = launchesById.get(task.launchId);
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
      if (!task.launchId || task.status === "done") {
        return;
      }
      openTaskCountByLaunchId.set(task.launchId, (openTaskCountByLaunchId.get(task.launchId) || 0) + 1);
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

    const lifecycleCounts = LIFECYCLE_STATUSES.map((status) => ({
      status,
      count: sortedLaunches.filter((launch) => (launch.lifecycleStatus || "Draft") === status).length
    }));
    const newRequests = sortedLaunches.filter((launch) => (launch.lifecycleStatus || "Draft") === "Draft").length;
    const openOpportunities = sortedLaunches.filter((launch) => {
      const lifecycle = launch.lifecycleStatus || "Draft";
      return lifecycle !== "Closed Won" && lifecycle !== "Closed Lost" && lifecycle !== "Inactive";
    }).length;
    const awaitingDemandConfirmation = sortedLaunches.filter(
      (launch) => (launch.lifecycleStatus || "Draft") === "Sent to Demand Company"
    ).length;
    const awaitingFeedback = sortedLaunches.filter((launch) => {
      const lifecycle = launch.lifecycleStatus || "Draft";
      return lifecycle === "Sample Shipped" || lifecycle === "Awaiting Demand Feedback";
    }).length;
    const needsAction = sortedLaunches.filter((launch) => {
      const lifecycle = launch.lifecycleStatus || "Draft";
      return lifecycle === "Clarification Needed" || lifecycle === "Revision Requested";
    }).length;
    const commercialOpportunityLaunches = sortedLaunches.filter(
      (launch) => Boolean(launch.intake?.knownCommercialOpportunity)
    ).length;
    const realProjectCount = sortedLaunches.filter((launch) => (launch.intake?.projectKind || "Real Project") === "Real Project").length;
    const librarySampleCount = sortedLaunches.filter(
      (launch) => (launch.intake?.projectKind || "Real Project") === "Library Sample"
    ).length;
    const unresolvedMessageCount = sortedLaunches.reduce((total, launch) => {
      const unresolved = (launch.messageThread || []).filter((message) => message.unresolved).length;
      return total + unresolved;
    }, 0);
    const closedWonCount = sortedLaunches.filter((launch) => (launch.lifecycleStatus || "Draft") === "Closed Won").length;
    const closedLostCount = sortedLaunches.filter((launch) => (launch.lifecycleStatus || "Draft") === "Closed Lost").length;
    const decidedOpportunities = closedWonCount + closedLostCount;
    const winRate = decidedOpportunities ? Math.round((closedWonCount / decidedOpportunities) * 100) : 0;

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
      lifecycleCounts,
      newRequests,
      openOpportunities,
      awaitingDemandConfirmation,
      awaitingFeedback,
      needsAction,
      commercialOpportunityLaunches,
      realProjectCount,
      librarySampleCount,
      unresolvedMessageCount,
      closedWonCount,
      closedLostCount,
      winRate,
      byType,
      byStage
    };
  }, [sortedLaunches, tasks]);

  const inboxItems = useMemo(() => {
    const launchesById = new Map(sortedLaunches.map((launch) => [launch.id, launch]));

    return tasks
      .filter((task) => task.status !== "done")
      .map((task) => {
        const launch = task.launchId ? launchesById.get(task.launchId) || null : null;
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
        const relatedTasks = tasks.filter((task) => task.launchId === launch.id);
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
      .filter((item): item is { launch: Launch; doneTasks: number; openTasks: number; reasons: string[] } => Boolean(item))
      .slice(0, 18);
  }, [sortedLaunches, tasks]);

  const vendorActionLaunches = useMemo(() => {
    return sortedLaunches
      .filter((launch) => {
        const lifecycle = launch.lifecycleStatus || "Draft";
        return (
          lifecycle === "Draft" ||
          lifecycle === "Sent to Demand Company" ||
          lifecycle === "Clarification Needed" ||
          lifecycle === "Awaiting Demand Feedback" ||
          lifecycle === "Sample Shipped" ||
          lifecycle === "Revision Requested"
        );
      })
      .sort((a, b) => {
        const priorityA = a.priority === "Urgent" ? 3 : a.priority === "High" ? 2 : a.priority === "Medium" ? 1 : 0;
        const priorityB = b.priority === "Urgent" ? 3 : b.priority === "High" ? 2 : b.priority === "Medium" ? 1 : 0;
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 18);
  }, [sortedLaunches]);

  useEffect(() => {
    if (initialSessionUser) {
      configureApiSession({
        email: initialSessionUser.email,
        roleKey: initialSessionUser.roleKey,
        scopeType: initialSessionUser.scopeType,
        organizationIds: initialSessionUser.organizationIds
      });
    } else {
      configureApiSession(null);
    }

    return () => {
      configureApiSession(null);
    };
  }, [initialSessionUser]);

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
    if (!initialSessionUser || didApplySessionDefaults) {
      return;
    }

    const sessionProfile = profileFromSessionUser(initialSessionUser);
    setSessionRoleKey(initialSessionUser.roleKey);
    setProfile(sessionProfile);
    setProfileDraft(sessionProfile);
    setActiveNav(initialSessionUser.defaultNav);
    setDidApplySessionDefaults(true);
  }, [initialSessionUser, didApplySessionDefaults]);

  useEffect(() => {
    async function refreshAll() {
      setLoading(true);
      setError(null);

      try {
        const [launchesResponse, tasksResponse] = await Promise.all([listLaunches(), listTasks()]);
        setLaunches(launchesResponse.map((launch) => normalizeLaunchForUi(launch)));
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
    if (!activeLaunch) {
      setExtendedDraft(null);
      return;
    }

    setExtendedDraft(launchExtendedDraftFromLaunch(activeLaunch));
  }, [activeLaunch]);

  useEffect(() => {
    setLaunchDetailsTab("overview");
  }, [activeLaunchId]);

  useEffect(() => {
    if (!launchDetailsTabs.some((tab) => tab.id === launchDetailsTab)) {
      setLaunchDetailsTab(launchDetailsTabs[0]?.id || "overview");
    }
  }, [launchDetailsTabs, launchDetailsTab]);

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
      const [launchesResponse, tasksResponse] = await Promise.all([listLaunches(), listTasks()]);
      setLaunches(launchesResponse.map((launch) => normalizeLaunchForUi(launch)));
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

  function updateExtendedDraft(update: (current: LaunchExtendedDraft) => LaunchExtendedDraft) {
    setExtendedDraft((current) => (current ? update(current) : current));
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
    setLaunchForm(launchFormFromLaunch());
    setIsLaunchModalOpen(true);
  }

  function openEditLaunchModal(launch: Launch) {
    setLaunchModalMode("edit");
    setLaunchEditingId(launch.id);
    setLaunchForm(launchFormFromLaunch(launch));
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

    const editingLaunch =
      launchModalMode === "edit" && launchEditingId
        ? launches.find((item) => item.id === launchEditingId) || null
        : null;
    const demandCompanyName = launchForm.demandCompanyName.trim() || launchForm.brand.trim() || "Unknown Demand Company";
    const demandOrgId = editingLaunch?.demandOrg?.id || `org_demand_${slugifyToken(demandCompanyName, "company")}`;
    const scopedVendorOrgId =
      initialSessionUser?.scopeType === "vendor" && initialSessionUser.organizationIds.length
        ? initialSessionUser.organizationIds[0]
        : "";
    const vendorOrgId = scopedVendorOrgId || editingLaunch?.vendorOrg?.id || "org_vendor_flavorworks_labs";
    const vendorOrgName =
      editingLaunch?.vendorOrg?.name || labelFromOrgId(vendorOrgId, "FlavorWorks Labs");

    const basePayload = {
      title: launchForm.title.trim(),
      owner: launchForm.owner.trim(),
      stage: launchForm.stage,
      priority: launchForm.priority,
      riskLevel: launchForm.riskLevel,
      dueDate: launchForm.dueDate || null,
      description: launchForm.description.trim(),
      launchType: launchForm.launchType.trim() || "Other",
      category: launchForm.category.trim(),
      brand: launchForm.brand.trim(),
      market: launchForm.market.trim(),
      vendorOrg: {
        id: vendorOrgId,
        name: vendorOrgName,
        type: "vendor" as const
      },
      demandOrg: {
        id: demandOrgId,
        name: demandCompanyName,
        type: "demand" as const
      },
      organizationRelationship: {
        id: editingLaunch?.organizationRelationship?.id || `${vendorOrgId}__${demandOrgId}`,
        vendorOrgId,
        demandOrgId,
        status:
          editingLaunch?.organizationRelationship?.status ||
          (editingLaunch?.lifecycleStatus === "Closed Won"
            ? "won"
            : editingLaunch?.lifecycleStatus === "Closed Lost"
              ? "lost"
              : "active"),
        owner: launchForm.owner.trim() || editingLaunch?.owner || "Unassigned"
      },
      intake: {
        demandCompanyName,
        requesterName: launchForm.requesterName.trim() || launchForm.owner.trim(),
        requestChannel: launchForm.requestChannel,
        requestDetails: launchForm.description.trim(),
        projectKind: launchForm.projectKind,
        beverageClass: launchForm.beverageClass,
        targetLaunchTiming: launchForm.targetLaunchTiming.trim(),
        knownCommercialOpportunity: launchForm.knownCommercialOpportunity,
        estimatedAnnualVolume: launchForm.estimatedAnnualVolume.trim(),
        targetPrice: launchForm.targetPrice.trim(),
        supplierProposedPrice: "",
        priceUnit: "per lb",
        priceSensitivity: "Medium"
      },
      requiredComplianceDocuments: normalizeList(launchForm.requiredComplianceDocuments)
    };

    try {
      if (launchModalMode === "create") {
        const created = normalizeLaunchForUi(
          await apiCreateLaunch({
            ...basePayload,
            stakeholders: stakeholdersForCreate
          })
        );
        setLaunches((current) => [created, ...current]);
        setActiveLaunchId(created.id);
        setNotice("Launch brief created");
      } else {
        if (!launchEditingId) {
          setError("No launch selected for editing");
          return;
        }

        const updated = normalizeLaunchForUi(
          await apiUpdateLaunch(launchEditingId, {
            ...basePayload,
            stakeholders: stakeholdersForUpdate
          })
        );
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
      setTasks((current) => current.filter((task) => task.launchId !== launchDeleteTarget.id));
      setFavoriteLaunchIds((current) => current.filter((id) => id !== launchDeleteTarget.id));
      setLaunchDeleteTarget(null);
      setNotice("Launch deleted");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete launch";
      setError(message);
    }
  }

  async function saveExtendedLaunchData() {
    if (!activeLaunch || !extendedDraft) {
      return;
    }

    setExtendedSaving(true);
    setError(null);

    try {
      const patch = extendedDraftToLaunchPatch(extendedDraft);
      const updated = normalizeLaunchForUi(await apiUpdateLaunch(activeLaunch.id, patch));
      setLaunches((current) => current.map((launch) => (launch.id === updated.id ? updated : launch)));
      setNotice("Launch brief and lifecycle saved");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save launch brief details";
      setError(message);
    } finally {
      setExtendedSaving(false);
    }
  }

  function addSelectedVendor() {
    setExtendedDraft((current) => {
      if (!current) {
        return current;
      }

      const nextVendor: VendorChoice = {
        id: safeId("vendor"),
        name: "",
        source: "manual",
        included: true,
        priority: current.vendorSelection.selectedVendors.length + 1,
        expertise: "",
        certifications: ""
      };

      return {
        ...current,
        vendorSelection: {
          ...current.vendorSelection,
          selectedVendors: [...current.vendorSelection.selectedVendors, nextVendor]
        }
      };
    });
  }

  function updateSelectedVendor(id: string, patch: Partial<VendorChoice>) {
    setExtendedDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vendorSelection: {
          ...current.vendorSelection,
          selectedVendors: current.vendorSelection.selectedVendors.map((vendor) =>
            vendor.id === id ? { ...vendor, ...patch } : vendor
          )
        }
      };
    });
  }

  function removeSelectedVendor(id: string) {
    setExtendedDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        vendorSelection: {
          ...current.vendorSelection,
          selectedVendors: current.vendorSelection.selectedVendors.filter((vendor) => vendor.id !== id)
        }
      };
    });
  }

  function addAttachment() {
    setExtendedDraft((current) => {
      if (!current) {
        return current;
      }

      const nextAttachment: LaunchAttachment = {
        id: safeId("attachment"),
        name: "",
        fileType: "PDF",
        category: "Reference",
        url: "",
        visibility: "Shared",
        uploadedAt: new Date().toISOString()
      };

      return {
        ...current,
        attachments: [...current.attachments, nextAttachment]
      };
    });
  }

  function updateAttachment(id: string, patch: Partial<LaunchAttachment>) {
    setExtendedDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        attachments: current.attachments.map((attachment) =>
          attachment.id === id ? { ...attachment, ...patch } : attachment
        )
      };
    });
  }

  function removeAttachment(id: string) {
    setExtendedDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        attachments: current.attachments.filter((attachment) => attachment.id !== id)
      };
    });
  }

  function viewAttachment(attachment: LaunchAttachment) {
    const targetUrl = String(attachment.url || "").trim();
    if (!targetUrl) {
      setNotice(`No preview link available for "${attachment.name || "Untitled document"}".`);
      return;
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }

  async function addFeedbackItem() {
    if (!activeLaunch || !feedbackDraft.note.trim()) {
      return;
    }

    const currentLaunch = normalizeLaunchForUi(activeLaunch);
    const nextFeedback: LaunchFeedback = {
      id: safeId("feedback"),
      author: profile.fullName || "You",
      type: feedbackDraft.type,
      note: feedbackDraft.note.trim(),
      status: "Open",
      createdAt: new Date().toISOString()
    };

    try {
      const updated = normalizeLaunchForUi(
        await apiUpdateLaunch(activeLaunch.id, {
          feedbackLog: [...(currentLaunch.feedbackLog || []), nextFeedback]
        })
      );
      setLaunches((current) => current.map((launch) => (launch.id === updated.id ? updated : launch)));
      setFeedbackDraft({ type: "Clarification", note: "" });
      setNotice("Feedback note added");
    } catch (feedbackError) {
      const message = feedbackError instanceof Error ? feedbackError.message : "Unable to add feedback note";
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
          launchId: activeLaunch?.id || null,
          vendorOrgId: activeLaunch?.vendorOrg?.id || null,
          demandOrgId: activeLaunch?.demandOrg?.id || null
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

  async function handleSendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeLaunch || !chatDraft.trim() || !chatRecipientIds.length) {
      return;
    }

    const message: ChatMessage = {
      id: safeId("msg"),
      sender: profile.fullName || "You",
      recipients: chatRecipientIds,
      text: chatDraft.trim(),
      tag: chatTag,
      unresolved: chatUnresolved,
      fieldRef: chatFieldRef.trim(),
      createdAt: new Date().toISOString()
    };

    const normalizedLaunch = normalizeLaunchForUi(activeLaunch);

    try {
      const updated = normalizeLaunchForUi(
        await apiUpdateLaunch(activeLaunch.id, {
          messageThread: [...((normalizedLaunch.messageThread || []) as LaunchMessage[]), message]
        })
      );
      setLaunches((current) => current.map((launch) => (launch.id === updated.id ? updated : launch)));
      setChatDraft("");
      setChatFieldRef("");
      setChatTag("Update");
      setChatUnresolved(false);
      setNotice("Launch message sent");
    } catch (chatError) {
      const messageText = chatError instanceof Error ? chatError.message : "Unable to send launch message";
      setError(messageText);
    }
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
  const roleViewLabel = isSalesRole
    ? "Vendor Sales Rep"
    : isRdRole
      ? "R&D Specialist (Demand Company)"
      : isAdminRole
        ? "Marketplace Admin"
        : "Program";
  const roleDefaultViewLabel = isSalesRole ? "Inbox" : "My Launches";
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
      className="app-shell min-h-screen bg-[var(--app-bg)] px-3 py-3 text-[var(--text-base)] lg:px-4 lg:py-4"
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
                    const visual = launchVisual(launch, themeMode);
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
                  Welcome to Zample! Marketplace connecting demand companies and flavor vendors from brief to launch.
                </p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  Signed in as {profile.fullName} ({roleViewLabel}) · default role view: {roleDefaultViewLabel}
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
                        title="Log out"
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
                          <p className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                              {message.tag || "Update"}
                            </span>
                            {message.unresolved ? (
                              <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                Unresolved
                              </span>
                            ) : null}
                            {message.fieldRef ? (
                              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-dim)]">
                                {message.fieldRef}
                              </span>
                            ) : null}
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-[var(--text-dim)]">Tag</span>
                      <select
                        value={chatTag}
                        onChange={(event) => setChatTag(event.target.value as ChatMessage["tag"])}
                        className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                      >
                        {(["Clarification", "Urgent", "Blocking", "Update"] as ChatMessage["tag"][]).map((tag) => (
                          <option value={tag} key={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-[var(--text-dim)]">Field Link (optional)</span>
                      <input
                        value={chatFieldRef}
                        onChange={(event) => setChatFieldRef(event.target.value)}
                        placeholder="e.g., pricing.targetPrice"
                        className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                      />
                    </label>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={chatUnresolved}
                      onChange={(event) => setChatUnresolved(event.target.checked)}
                    />
                    Mark as unresolved question
                  </label>
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
                    <p className="text-xs text-[var(--text-dim)]">
                      {sessionRoleKey === "rd_specialist" ? "R&D workflow metrics" : "Live marketplace metrics"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Total Launches</p>
                      <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.totalLaunches}</p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Open Opportunities</p>
                      <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.openOpportunities}</p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Overdue Tasks</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-rose-200" : "text-rose-700"}`}>
                        {analytics.overdueTasks}
                      </p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Win Rate</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-emerald-200" : "text-emerald-700"}`}>
                        {analytics.winRate}%
                      </p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Closed Won</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-emerald-200" : "text-emerald-700"}`}>
                        {analytics.closedWonCount}
                      </p>
                    </div>
                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Awaiting Buyer Confirmation</p>
                      <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-violet-200" : "text-violet-700"}`}>
                        {analytics.awaitingDemandConfirmation}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-3">
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

                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Marketplace Pipeline Snapshot</p>
                      <div className="mt-2 space-y-2">
                        {[
                          { label: "New Briefs", value: analytics.newRequests },
                          { label: "Needs Vendor Action", value: analytics.needsAction },
                          { label: "Samples Awaiting Feedback", value: analytics.awaitingFeedback },
                          { label: "Commercial Opportunities", value: analytics.commercialOpportunityLaunches },
                          { label: "Closed Won", value: analytics.closedWonCount },
                          { label: "Closed Lost", value: analytics.closedLostCount }
                        ].map((entry) => (
                          <div key={entry.label} className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-muted)]">{entry.label}</span>
                            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--text-base)]">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="min-h-0 flex flex-1 overflow-hidden">
                  <div className="min-h-0 w-full border-b border-[var(--line)] lg:w-[430px] lg:border-b-0 lg:border-r">
                    <div className="flex h-full min-h-0 flex-col">
                      <div className="sticky top-0 z-20 h-[88px] border-b border-[var(--line)] bg-[var(--surface-3)] px-5">
                        <div className="flex h-full items-center justify-between">
                          <div>
                            <h2 className="text-lg font-semibold text-[var(--text-strong)]">Launches</h2>
                            <p className="text-xs text-[var(--text-dim)]">Marketplace opportunities with lifecycle tracking</p>
                          </div>
                          <button
                            type="button"
                            onClick={openCreateLaunchModal}
                            title="Create marketplace launch"
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${primaryActionClass}`}
                          >
                            <CreateIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5 pt-3">
                      {visibleLaunches.length ? (
                        visibleLaunches.map((launch) => {
                          const isActive = activeLaunch?.id === launch.id;
                          const isFavorite = favoriteLaunchIds.includes(launch.id);
                          const launchType = inferLaunchType(launch);
                          const visual = launchVisual(launch, themeMode);
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
                                        className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]"
                                        title={`Project kind: ${launch.intake?.projectKind || "Real Project"}`}
                                      >
                                        {launch.intake?.projectKind || "Real Project"}
                                      </span>
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stagePillClass(launch.stage, themeMode)}`}
                                        title={`Launch stage: ${launch.stage}`}
                                      >
                                        {launch.stage}
                                      </span>
                                      <span
                                        className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-4)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-base)]"
                                        title={`Lifecycle status: ${launch.lifecycleStatus || "Draft"}`}
                                      >
                                        {launch.lifecycleStatus || "Draft"}
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
                  </div>

                  <div className="min-h-0 min-w-0 flex-1">
                    {activeLaunch ? (
                      <div className="flex h-full min-h-0 flex-col">
                        <div className="h-[88px] border-b border-[var(--line)] bg-[var(--surface-3)] px-5">
                          <div className="flex h-full items-center justify-between gap-4">
                            <h2 className="shrink-0 text-lg font-semibold text-[var(--text-strong)]">Launch Details</h2>
                            <div className="ml-auto flex items-center gap-2 pb-1">
                                {launchDetailsTabs.map((tab) => {
                                  const isActive = launchDetailsTab === tab.id;
                                  return (
                                    <button
                                      key={tab.id}
                                      type="button"
                                      onClick={() => setLaunchDetailsTab(tab.id)}
                                      aria-pressed={isActive}
                                      title={tab.hint}
                                      className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition ${
                                        isActive
                                          ? primaryActionClass
                                          : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                      }`}
                                    >
                                      {tab.label}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
                        {launchDetailsTab === "overview" ? (
                          <>
                        <section className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-semibold text-[var(--text-strong)]">{activeLaunch.title}</h2>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {activeLaunch.owner} · due {formatDate(activeLaunch.dueDate)} · updated {formatRelative(activeLaunch.updatedAt)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-dim)]">
                                {(activeLaunch.intake?.demandCompanyName || activeLaunch.brand || "Unknown Demand Company")} ·{" "}
                                {(activeLaunch.intake?.projectKind || "Real Project")} ·{" "}
                                {(activeLaunch.intake?.beverageClass || "Non-Beverage")} · Buyer Confirmation:{" "}
                                {activeLaunch.confirmationStatus || "Not Sent"}
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

                        {extendedDraft ? (
                          <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Sample Request Lifecycle</p>
                                <p className="text-xs text-[var(--text-faint)]">
                                  Vendor sales + buyer R&D lifecycle from intake through feedback and closure
                                </p>
                              </div>
                              {isAdminRole ? (
                                <button
                                  type="button"
                                  onClick={saveExtendedLaunchData}
                                  disabled={extendedSaving}
                                  className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${primaryActionClass}`}
                                  title="Save lifecycle and brief data"
                                >
                                  <SaveIcon className="h-4 w-4" />
                                  {extendedSaving ? "Saving..." : "Save Workflow Changes"}
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                                    themeMode === "dark"
                                      ? "border-sky-300/35 bg-sky-500/10 text-sky-100"
                                      : "border-sky-300 bg-sky-100 text-sky-800"
                                  }`}
                                  title="Lifecycle updates are managed by marketplace admins"
                                >
                                  Read-only for {isSalesRole ? "Vendor Sales" : "R&D"}
                                </span>
                              )}
                            </div>

                            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-4)] p-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Current State</p>
                                {isAdminRole ? (
                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <label className="space-y-1">
                                      <span className="text-xs font-medium text-[var(--text-muted)]">Lifecycle status</span>
                                      <select
                                        value={extendedDraft.lifecycleStatus}
                                        onChange={(event) =>
                                          updateExtendedDraft((current) => ({
                                            ...current,
                                            lifecycleStatus: event.target.value as LaunchLifecycleStatus
                                          }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                        title="Set the launch lifecycle step"
                                      >
                                        {LIFECYCLE_STATUSES.map((status) => (
                                          <option value={status} key={status}>
                                            {status}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-xs font-medium text-[var(--text-muted)]">Buyer Confirmation</span>
                                      <select
                                        value={extendedDraft.confirmationStatus}
                                        onChange={(event) =>
                                          updateExtendedDraft((current) => ({
                                            ...current,
                                            confirmationStatus: event.target.value as LaunchConfirmationStatus
                                          }))
                                        }
                                        className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                        title="Set buyer confirmation status"
                                      >
                                        {CONFIRMATION_STATUSES.map((status) => (
                                          <option value={status} key={status}>
                                            {status}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                ) : (
                                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">Lifecycle status</p>
                                      <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{extendedDraft.lifecycleStatus}</p>
                                    </div>
                                    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">Buyer Confirmation</p>
                                      <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{extendedDraft.confirmationStatus}</p>
                                    </div>
                                  </div>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${themeMode === "dark" ? "border border-indigo-400/40 bg-indigo-500/20 text-indigo-100" : "border border-indigo-300 bg-indigo-100 text-indigo-800"}`}
                                    title={`Current lifecycle: ${extendedDraft.lifecycleStatus}`}
                                  >
                                    Lifecycle: {extendedDraft.lifecycleStatus}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      extendedDraft.confirmationStatus === "Confirmed"
                                        ? themeMode === "dark"
                                          ? "border border-emerald-400/45 bg-emerald-700/20 text-emerald-200"
                                          : "border border-emerald-300 bg-emerald-100 text-emerald-800"
                                        : extendedDraft.confirmationStatus === "Needs Update"
                                          ? themeMode === "dark"
                                            ? "border border-amber-400/45 bg-amber-700/20 text-amber-200"
                                            : "border border-amber-300 bg-amber-100 text-amber-800"
                                          : themeMode === "dark"
                                            ? "border border-sky-400/45 bg-sky-700/20 text-sky-200"
                                            : "border border-sky-300 bg-sky-100 text-sky-800"
                                    }`}
                                    title={`Current confirmation state: ${extendedDraft.confirmationStatus}`}
                                  >
                                    Confirmation: {extendedDraft.confirmationStatus}
                                  </span>
                                </div>
                              </div>

                              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-4)] p-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Workflow Actions</p>
                                <p className="mt-1 text-xs text-[var(--text-faint)]">
                                  {isAdminRole
                                    ? "Use guided actions for common transitions in this stage."
                                    : "Transition controls are managed by marketplace admins."}
                                </p>
                                {isAdminRole ? (
                                  <div className="mt-3 grid gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateExtendedDraft((current) => ({
                                          ...current,
                                          lifecycleStatus: "Sent to Demand Company",
                                          confirmationStatus: "Sent"
                                        }))
                                      }
                                      disabled={!canSendForConfirmation}
                                      className={`h-9 rounded-md border px-3 text-left text-xs font-semibold transition ${
                                        canSendForConfirmation
                                          ? "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-base)] hover:border-cyan-400/45"
                                          : "cursor-not-allowed border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-faint)] opacity-70"
                                      }`}
                                      title="Move launch to sent-to-demand-company state"
                                    >
                                      Send to Demand Company
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateExtendedDraft((current) => ({
                                          ...current,
                                          lifecycleStatus: "Confirmed by Demand Company",
                                          confirmationStatus: "Confirmed"
                                        }))
                                      }
                                      disabled={!canMarkConfirmed}
                                      className={`h-9 rounded-md border px-3 text-left text-xs font-semibold transition ${
                                        canMarkConfirmed
                                          ? "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-base)] hover:border-cyan-400/45"
                                          : "cursor-not-allowed border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-faint)] opacity-70"
                                      }`}
                                      title="Mark buyer confirmation as complete"
                                    >
                                      Mark Buyer Confirmed
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateExtendedDraft((current) => ({
                                          ...current,
                                          lifecycleStatus: "Clarification Needed",
                                          confirmationStatus: "Needs Update"
                                        }))
                                      }
                                      disabled={!canRequestClarification}
                                      className={`h-9 rounded-md border px-3 text-left text-xs font-semibold transition ${
                                        canRequestClarification
                                          ? "border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-base)] hover:border-cyan-400/45"
                                          : "cursor-not-allowed border-[var(--line)] bg-[var(--surface-2)] text-[var(--text-faint)] opacity-70"
                                      }`}
                                      title="Route launch back for buyer clarifications"
                                    >
                                      Request Clarification
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-1)] px-3 py-3 text-xs text-[var(--text-dim)]">
                                    You can review lifecycle progress here. Ask a marketplace admin to move this launch between buyer
                                    confirmation states.
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-[var(--text-dim)]">
                              {(activeLaunch.messageThread || []).filter((message) => message.unresolved).length} unresolved thread question
                              {(activeLaunch.messageThread || []).filter((message) => message.unresolved).length === 1 ? "" : "s"} linked to this brief.
                            </p>

                            <div className="mt-3 flex min-w-0 items-center overflow-x-auto pb-2">
                              {LIFECYCLE_STATUSES.map((status, index) => {
                                const isComplete = currentLifecycleIndex > index;
                                const isCurrent = currentLifecycleIndex === index;
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
                                  currentLifecycleIndex > index
                                    ? themeMode === "dark"
                                      ? "bg-emerald-400/70"
                                      : "bg-emerald-500"
                                    : currentLifecycleIndex === index
                                      ? themeMode === "dark"
                                        ? "bg-sky-400/70"
                                        : "bg-sky-500"
                                      : themeMode === "dark"
                                        ? "bg-sky-200/24"
                                        : "bg-slate-300";

                                return (
                                  <div key={status} className="flex items-center">
                                    <div className="min-w-[170px]">
                                      <div
                                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${circleClass}`}
                                        title={`Lifecycle step ${index + 1}: ${status}`}
                                      >
                                        {isComplete ? "✓" : index + 1}
                                      </div>
                                      <p className={`mt-2 text-center text-[11px] ${isCurrent ? "text-[var(--text-base)]" : "text-[var(--text-dim)]"}`}>
                                        {status}
                                      </p>
                                    </div>
                                    {index < LIFECYCLE_STATUSES.length - 1 ? (
                                      <div className={`mx-1 h-[2px] w-8 rounded ${lineClass}`} />
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        ) : null}
                          </>
                        ) : null}

                        {launchDetailsTab === "brief" && extendedDraft ? (
                          <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                            <div className="mb-3">
                              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Brief Intake</p>
                              <p className="text-xs text-[var(--text-faint)]">
                                Structured intake and brief schema for product requirements and launch scope.
                              </p>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Demand Company</span>
                                <input
                                  value={extendedDraft.intake.demandCompanyName}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, demandCompanyName: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Buyer R&D Requester</span>
                                <input
                                  value={extendedDraft.intake.requesterName}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, requesterName: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Request channel</span>
                                <select
                                  value={extendedDraft.intake.requestChannel}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: {
                                        ...current.intake,
                                        requestChannel: event.target.value as LaunchRequestChannel
                                      }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                >
                                  {REQUEST_CHANNEL_OPTIONS.map((channel) => (
                                    <option key={channel} value={channel}>
                                      {channel}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Project type</span>
                                <select
                                  value={extendedDraft.intake.projectKind}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: {
                                        ...current.intake,
                                        projectKind: event.target.value as LaunchProjectKind
                                      }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                >
                                  {PROJECT_KIND_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Beverage class</span>
                                <select
                                  value={extendedDraft.intake.beverageClass}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: {
                                        ...current.intake,
                                        beverageClass: event.target.value as LaunchIntake["beverageClass"]
                                      }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                >
                                  {BEVERAGE_CLASS_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Target launch timing</span>
                                <input
                                  value={extendedDraft.intake.targetLaunchTiming}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, targetLaunchTiming: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Q3 2026"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Estimated annual volume</span>
                                <input
                                  value={extendedDraft.intake.estimatedAnnualVolume}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, estimatedAnnualVolume: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="e.g., 450k lbs/year"
                                />
                                {volumeHint ? (
                                  <span className="text-[11px] text-[var(--text-dim)]">
                                    Similar {inferLaunchType(activeLaunch)} launch estimate: {volumeHint}
                                  </span>
                                ) : null}
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Target price</span>
                                <input
                                  value={extendedDraft.intake.targetPrice}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, targetPrice: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="$7.10"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Supplier proposed price</span>
                                <input
                                  value={extendedDraft.intake.supplierProposedPrice}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, supplierProposedPrice: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="$7.65"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Price unit</span>
                                <input
                                  value={extendedDraft.intake.priceUnit}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, priceUnit: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="per lb"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Price sensitivity</span>
                                <input
                                  value={extendedDraft.intake.priceSensitivity}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      intake: { ...current.intake, priceSensitivity: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Low / Medium / High"
                                />
                              </label>
                            </div>

                            <label className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
                              <input
                                type="checkbox"
                                checked={extendedDraft.intake.knownCommercialOpportunity}
                                onChange={(event) =>
                                  updateExtendedDraft((current) => ({
                                    ...current,
                                    intake: { ...current.intake, knownCommercialOpportunity: event.target.checked }
                                  }))
                                }
                              />
                              Known commercial opportunity
                            </label>

                            <label className="mt-3 block space-y-1">
                              <span className="text-xs text-[var(--text-muted)]">Request details intake</span>
                              <textarea
                                value={extendedDraft.intake.requestDetails}
                                onChange={(event) =>
                                  updateExtendedDraft((current) => ({
                                    ...current,
                                    intake: { ...current.intake, requestDetails: event.target.value }
                                  }))
                                }
                                rows={3}
                                className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                placeholder="Paste buyer email notes or call transcript summary"
                              />
                            </label>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Sample type</span>
                                <input
                                  value={extendedDraft.brief.sampleType}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, sampleType: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Flavor system, seasoning, ingredient..."
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Application</span>
                                <input
                                  value={extendedDraft.brief.application}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, application: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="End product/application"
                                />
                              </label>
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <MultiValueEditor
                                label="Flavor Tags"
                                values={extendedDraft.brief.flavorTags}
                                onChange={(values) =>
                                  updateExtendedDraft((current) => ({
                                    ...current,
                                    brief: { ...current.brief, flavorTags: values }
                                  }))
                                }
                                options={FLAVOR_TAG_OPTIONS}
                                placeholder="Add Custom Flavor Tag"
                                themeMode={themeMode}
                                title="Manage flavor tags"
                              />
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Creative direction</span>
                                <select
                                  value={extendedDraft.brief.creativeDirection}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: {
                                        ...current.brief,
                                        creativeDirection: event.target.value as LaunchBrief["creativeDirection"]
                                      }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                >
                                  {(["Match Exactly", "Open Innovation"] as LaunchBrief["creativeDirection"][]).map((direction) => (
                                    <option value={direction} key={direction}>
                                      {direction}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1 lg:col-span-2">
                                <span className="text-xs text-[var(--text-muted)]">Vendor suggestion request</span>
                                <div className="grid gap-2 lg:grid-cols-[190px_1fr]">
                                  <label className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)]">
                                    <input
                                      type="checkbox"
                                      checked={extendedDraft.brief.vendorSuggestionsRequested}
                                      onChange={(event) =>
                                        updateExtendedDraft((current) => ({
                                          ...current,
                                          brief: {
                                            ...current.brief,
                                            vendorSuggestionsRequested: event.target.checked
                                          }
                                        }))
                                      }
                                    />
                                    Request suggestions
                                  </label>
                                  <input
                                    value={extendedDraft.brief.vendorSuggestionNotes}
                                    onChange={(event) =>
                                      updateExtendedDraft((current) => ({
                                        ...current,
                                        brief: {
                                          ...current.brief,
                                          vendorSuggestionNotes: event.target.value
                                        }
                                      }))
                                    }
                                    className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                    placeholder="What kind of alternatives should vendors propose?"
                                  />
                                </div>
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Sample phase volume</span>
                                <input
                                  value={extendedDraft.brief.samplePhaseVolume}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, samplePhaseVolume: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="e.g., 25 kg sample run"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Commercial scale estimate</span>
                                <input
                                  value={extendedDraft.brief.commercialScaleEstimate}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, commercialScaleEstimate: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="e.g., 500k lbs/year"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Sample due date</span>
                                <input
                                  type="date"
                                  value={extendedDraft.brief.sampleDueDate ? extendedDraft.brief.sampleDueDate.slice(0, 10) : ""}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, sampleDueDate: event.target.value || null }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Milestone date</span>
                                <input
                                  type="date"
                                  value={extendedDraft.brief.milestoneDate ? extendedDraft.brief.milestoneDate.slice(0, 10) : ""}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, milestoneDate: event.target.value || null }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Pricing request timing</span>
                                <select
                                  value={extendedDraft.brief.pricingRequestTiming}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: {
                                        ...current.brief,
                                        pricingRequestTiming: event.target.value as LaunchBrief["pricingRequestTiming"]
                                      }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                >
                                  {PRICING_REQUEST_TIMING_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Cost target</span>
                                <input
                                  value={extendedDraft.brief.costTarget}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, costTarget: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="e.g., <= $5.10/lb"
                                />
                              </label>
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Packaging / sample size</span>
                                <input
                                  value={extendedDraft.brief.packagingSampleSize}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, packagingSampleSize: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="e.g., 2 x 1kg bags"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Delivery format</span>
                                <input
                                  value={extendedDraft.brief.deliveryFormat}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, deliveryFormat: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Chilled courier, ambient parcel..."
                                />
                              </label>
                              <label className="space-y-1 lg:col-span-2">
                                <span className="text-xs text-[var(--text-muted)]">Reference products</span>
                                <input
                                  value={extendedDraft.brief.referenceProducts}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, referenceProducts: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Benchmark products or links"
                                />
                              </label>
                              <label className="space-y-1 lg:col-span-2">
                                <span className="text-xs text-[var(--text-muted)]">Internal notes (private)</span>
                                <textarea
                                  value={extendedDraft.brief.internalNotes}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, internalNotes: event.target.value }
                                    }))
                                  }
                                  rows={2}
                                  className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Private R&D notes not visible to vendor"
                                />
                              </label>
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Target flavor profile</span>
                                <textarea
                                  value={extendedDraft.brief.targetFlavorProfile}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, targetFlavorProfile: event.target.value }
                                    }))
                                  }
                                  rows={3}
                                  className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Ingredient constraints / exclusions</span>
                                <textarea
                                  value={extendedDraft.brief.ingredientConstraints}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, ingredientConstraints: event.target.value }
                                    }))
                                  }
                                  rows={3}
                                  className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                />
                              </label>
                            </div>

                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                              <MultiValueEditor
                                label="Certifications Required"
                                values={extendedDraft.brief.certificationsRequired}
                                onChange={(values) =>
                                  updateExtendedDraft((current) => ({
                                    ...current,
                                    brief: { ...current.brief, certificationsRequired: values }
                                  }))
                                }
                                options={CERTIFICATION_OPTIONS}
                                placeholder="Add Custom Certification"
                                helperText="Use predefined certifications and remove with x."
                                themeMode={themeMode}
                                title="Manage certification requirements"
                              />
                              <MultiValueEditor
                                label="Regulatory Documents"
                                values={extendedDraft.brief.regulatoryDocumentation}
                                onChange={(values) =>
                                  updateExtendedDraft((current) => ({
                                    ...current,
                                    brief: { ...current.brief, regulatoryDocumentation: values }
                                  }))
                                }
                                options={REGULATORY_DOCUMENT_OPTIONS}
                                placeholder="Add Custom Regulatory Document"
                                themeMode={themeMode}
                                title="Manage regulatory documentation list"
                              />
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Physical format</span>
                                <input
                                  value={extendedDraft.brief.physicalFormat}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, physicalFormat: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Liquid, powder, paste..."
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-[var(--text-muted)]">Stability requirements</span>
                                <input
                                  value={extendedDraft.brief.stabilityRequirements}
                                  onChange={(event) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      brief: { ...current.brief, stabilityRequirements: event.target.value }
                                    }))
                                  }
                                  className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  placeholder="Shelf life, temperature constraints..."
                                />
                              </label>
                            </div>

                          </section>
                        ) : null}

                        {launchDetailsTab === "vendors" && extendedDraft ? (
                          <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                            <div className="mb-3">
                              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Vendor Selection</p>
                              <p className="text-xs text-[var(--text-faint)]">
                                Approved and suggested vendor lists, plus ranked vendor participation.
                              </p>
                            </div>
                            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-4)] p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Vendor Pool</p>
                                <button
                                  type="button"
                                  onClick={addSelectedVendor}
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] transition hover:border-cyan-400/45"
                                  title="Add vendor row"
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  Add Vendor
                                </button>
                              </div>
                              <div className="grid gap-2 lg:grid-cols-2">
                                <MultiValueEditor
                                  label="Approved Vendors"
                                  values={extendedDraft.vendorSelection.approvedVendors}
                                  onChange={(values) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      vendorSelection: {
                                        ...current.vendorSelection,
                                        approvedVendors: values
                                      }
                                    }))
                                  }
                                  options={normalizeList([
                                    ...VENDOR_OPTION_LIBRARY,
                                    ...extendedDraft.vendorSelection.selectedVendors.map((vendor) => vendor.name)
                                  ])}
                                  placeholder="Add Approved Vendor"
                                  themeMode={themeMode}
                                  title="Manage approved vendors"
                                />
                                <MultiValueEditor
                                  label="Suggested Vendors"
                                  values={extendedDraft.vendorSelection.suggestedVendors}
                                  onChange={(values) =>
                                    updateExtendedDraft((current) => ({
                                      ...current,
                                      vendorSelection: {
                                        ...current.vendorSelection,
                                        suggestedVendors: values
                                      }
                                    }))
                                  }
                                  options={normalizeList([
                                    ...VENDOR_OPTION_LIBRARY,
                                    ...extendedDraft.vendorSelection.selectedVendors.map((vendor) => vendor.name)
                                  ])}
                                  placeholder="Add Suggested Vendor"
                                  themeMode={themeMode}
                                  title="Manage suggested vendors"
                                />
                                <label className="space-y-1">
                                  <span className="text-xs text-[var(--text-muted)]">Vendor request visibility</span>
                                  <select
                                    value={extendedDraft.vendorSelection.requestVisibility}
                                    onChange={(event) =>
                                      updateExtendedDraft((current) => ({
                                        ...current,
                                        vendorSelection: {
                                          ...current.vendorSelection,
                                          requestVisibility: event.target.value as "Visible" | "Blind"
                                        }
                                      }))
                                    }
                                    className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                  >
                                    {(["Visible", "Blind"] as Array<"Visible" | "Blind">).map((mode) => (
                                      <option key={mode} value={mode}>
                                        {mode}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="mt-2 space-y-2">
                                {extendedDraft.vendorSelection.selectedVendors.map((vendor) => (
                                  <div key={vendor.id} className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-2 xl:grid-cols-[1.2fr_120px_86px_120px_auto]">
                                    <input
                                      value={vendor.name}
                                      onChange={(event) => updateSelectedVendor(vendor.id, { name: event.target.value })}
                                      className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                      placeholder="Vendor name"
                                    />
                                    <select
                                      value={vendor.source}
                                      onChange={(event) =>
                                        updateSelectedVendor(vendor.id, {
                                          source: event.target.value as VendorChoice["source"]
                                        })
                                      }
                                      className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                    >
                                      {(["approved", "suggested", "manual"] as VendorChoice["source"][]).map((source) => (
                                        <option key={source} value={source}>
                                          {source}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      min={1}
                                      value={vendor.priority}
                                      onChange={(event) =>
                                        updateSelectedVendor(vendor.id, {
                                          priority: Number(event.target.value || 1)
                                        })
                                      }
                                      className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                      title="Vendor rank priority"
                                    />
                                    <label className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)]">
                                      <input
                                        type="checkbox"
                                        checked={vendor.included}
                                        onChange={(event) =>
                                          updateSelectedVendor(vendor.id, { included: event.target.checked })
                                        }
                                      />
                                      Include
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => removeSelectedVendor(vendor.id)}
                                      className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-muted)] transition hover:border-cyan-400/45"
                                      title="Remove vendor"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </section>
                        ) : null}

                        {launchDetailsTab === "attachments" && extendedDraft ? (
                          <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                            <div className="mb-3">
                              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Attachments and Compliance</p>
                              <p className="text-xs text-[var(--text-faint)]">
                                Compliance checklist and launch attachment records with view and delete actions.
                              </p>
                            </div>
                            <div className="rounded-md border border-[var(--line)] bg-[var(--surface-4)] p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">Attachment Records</p>
                                <button
                                  type="button"
                                  onClick={addAttachment}
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] transition hover:border-cyan-400/45"
                                  title="Add attachment row"
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  Add Attachment
                                </button>
                              </div>
                              <MultiValueEditor
                                label="Required Compliance Documents"
                                values={extendedDraft.requiredComplianceDocuments}
                                onChange={(values) =>
                                  updateExtendedDraft((current) => ({
                                    ...current,
                                    requiredComplianceDocuments: values
                                  }))
                                }
                                options={COMPLIANCE_DOCUMENT_OPTIONS}
                                placeholder="Add Compliance Document"
                                themeMode={themeMode}
                                title="Manage required compliance documents"
                              />
                              <div className="space-y-2">
                                {extendedDraft.attachments.length ? (
                                  extendedDraft.attachments.map((attachment) => (
                                    <div
                                      key={attachment.id}
                                      className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-2 xl:grid-cols-[minmax(0,1.2fr)_150px_130px_120px_auto]"
                                    >
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const iconData = attachmentIconData(attachment.fileType, themeMode);
                                          const Icon = iconData.icon;
                                          return (
                                            <span
                                              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-1)] ${iconData.color}`}
                                              title={`Document type icon: ${attachment.fileType || "Document"}`}
                                            >
                                              <Icon className="h-4 w-4" />
                                            </span>
                                          );
                                        })()}
                                        <input
                                          value={attachment.name}
                                          onChange={(event) => updateAttachment(attachment.id, { name: event.target.value })}
                                          className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                          placeholder="Document Name"
                                          title="Attachment document name"
                                        />
                                      </div>
                                      <select
                                        value={attachment.fileType}
                                        onChange={(event) => updateAttachment(attachment.id, { fileType: event.target.value })}
                                        className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                        title="Document file type"
                                      >
                                        {ATTACHMENT_FILE_TYPE_OPTIONS.map((type) => (
                                          <option key={type} value={type}>
                                            {type}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={attachment.category}
                                        onChange={(event) => updateAttachment(attachment.id, { category: event.target.value })}
                                        className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                        title="Attachment category"
                                      >
                                        {ATTACHMENT_CATEGORY_OPTIONS.map((category) => (
                                          <option key={category} value={category}>
                                            {category}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={attachment.visibility}
                                        onChange={(event) =>
                                          updateAttachment(attachment.id, {
                                            visibility: event.target.value as LaunchAttachment["visibility"]
                                          })
                                        }
                                        className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                                        title="Attachment visibility"
                                      >
                                        {(["Shared", "Internal"] as LaunchAttachment["visibility"][]).map((visibility) => (
                                          <option key={visibility} value={visibility}>
                                            {visibility}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => viewAttachment(attachment)}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-1)] text-[var(--text-muted)] transition hover:border-cyan-400/45 hover:text-[var(--text-base)]"
                                          title={attachment.url ? "View document" : "No document link available"}
                                        >
                                          <ViewIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeAttachment(attachment.id)}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-1)] text-rose-500 transition hover:border-rose-400/45 hover:text-rose-600"
                                          title="Delete attachment"
                                        >
                                          <DeleteIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 text-xs text-[var(--text-dim)]">
                                    No attachments yet. Add reference products, regulatory docs, or spec sheets.
                                  </div>
                                )}
                              </div>
                            </div>
                          </section>
                        ) : null}

                        {launchDetailsTab === "tasks" ? (
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
                        ) : null}

                        {launchDetailsTab === "feedback" ? (
                          <section className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-dim)]">
                                {isSalesRole ? "Buyer Comms" : "Feedback Loop"}
                              </p>
                              <p className="text-xs text-[var(--text-faint)]">
                                {isSalesRole
                                  ? "Demand-company updates, confirmations, and vendor communication history"
                                  : "Vendor acknowledgements, clarifications, feasibility notes, and timeline commitments"}
                              </p>
                            </div>
                            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                              {(activeLaunch.feedbackLog || []).length} items
                            </span>
                          </div>

                          <div className="space-y-2">
                            {(activeLaunch.feedbackLog || []).length ? (
                              (activeLaunch.feedbackLog || []).map((entry) => (
                                <article key={entry.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-[var(--text-strong)]">{entry.type}</p>
                                      <p className="text-xs text-[var(--text-dim)]">
                                        {entry.author} · {formatRelative(entry.createdAt)}
                                      </p>
                                    </div>
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        entry.status === "Resolved"
                                          ? themeMode === "dark"
                                            ? "border border-emerald-400/45 bg-emerald-700/20 text-emerald-200"
                                            : "border border-emerald-300 bg-emerald-100 text-emerald-800"
                                          : themeMode === "dark"
                                            ? "border border-amber-400/45 bg-amber-700/20 text-amber-200"
                                            : "border border-amber-300 bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-[var(--text-base)]">{entry.note}</p>
                                </article>
                              ))
                            ) : (
                              <div className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 text-sm text-[var(--text-dim)]">
                                No structured feedback captured yet.
                              </div>
                            )}
                          </div>

                          <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
                            <select
                              value={feedbackDraft.type}
                              onChange={(event) =>
                                setFeedbackDraft((current) => ({
                                  ...current,
                                  type: event.target.value as LaunchFeedback["type"]
                                }))
                              }
                              className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                            >
                              {FEEDBACK_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <input
                              value={feedbackDraft.note}
                              onChange={(event) =>
                                setFeedbackDraft((current) => ({
                                  ...current,
                                  note: event.target.value
                                }))
                              }
                              placeholder="Add a structured feedback update..."
                              className="h-9 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                            />
                            <button
                              type="button"
                              onClick={addFeedbackItem}
                              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${primaryActionClass}`}
                              title="Add feedback to this launch"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Add Feedback
                            </button>
                          </div>
                          </section>
                        ) : null}

                        {launchDetailsTab === "participants" ? (
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
                        ) : null}
                        </div>
                      </div>
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
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">Opportunity Inbox</h2>
                  <p className="text-xs text-[var(--text-dim)]">{inboxItems.length} pending actions</p>
                </div>
                {sessionRoleKey === "vendor_sales_rep" ? (
                  <p className="mb-3 text-xs text-[var(--text-dim)]">
                    Vendor sales view: prioritize new briefs, buyer confirmations, and stalled sample follow-ups.
                  </p>
                ) : null}
                <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">New Briefs</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.newRequests}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Awaiting Buyer Confirmation</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.awaitingDemandConfirmation}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Needs Vendor Action</p>
                    <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-amber-200" : "text-amber-700"}`}>
                      {analytics.needsAction}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Samples Awaiting Feedback</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.awaitingFeedback}</p>
                  </div>
                </div>
                <section className="mb-4 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--text-strong)]">Vendor Opportunity Queue</h3>
                    <p className="text-xs text-[var(--text-dim)]">{vendorActionLaunches.length} launches</p>
                  </div>
                  <div className="space-y-2">
                    {vendorActionLaunches.length ? (
                      vendorActionLaunches.map((launch) => (
                        <article key={launch.id} className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--text-strong)]">{launch.title}</p>
                              <p className="truncate text-xs text-[var(--text-dim)]">
                                {launch.intake?.demandCompanyName || launch.brand || "Unknown Demand Company"} · {launch.owner}
                              </p>
                            </div>
                            <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-1)] px-2 py-0.5 text-[11px] text-[var(--text-base)]">
                              {launch.lifecycleStatus || "Draft"}
                            </span>
                          </div>
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLaunchId(launch.id);
                                setActiveNav("my_launches");
                              }}
                              className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-2.5 py-1 text-xs text-[var(--text-base)] transition hover:border-cyan-400/45"
                              title={`Open lifecycle detail for ${launch.title}`}
                            >
                              Open opportunity
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 text-xs text-[var(--text-dim)]">
                        No vendor lifecycle actions are pending.
                      </p>
                    )}
                  </div>
                </section>
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

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Awaiting Buyer Confirmation</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--text-strong)]">{analytics.awaitingDemandConfirmation}</p>
                  </div>
                  <div className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-dim)]">Unresolved Questions</p>
                    <p className={`mt-1 text-2xl font-semibold ${themeMode === "dark" ? "text-amber-200" : "text-amber-700"}`}>
                      {analytics.unresolvedMessageCount}
                    </p>
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
                                Launches: {owner.launchTitles.join(", ")}
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
                  {launchModalMode === "edit" ? "Edit Launch Brief" : "Create Launch Brief"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--text-strong)]">
                  {launchModalMode === "edit" ? "Update launch details" : "Turn a demand brief into a structured launch"}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Demand Company</span>
                  <input
                    value={launchForm.demandCompanyName}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, demandCompanyName: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Demand company name"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Buyer R&D requester</span>
                  <input
                    value={launchForm.requesterName}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, requesterName: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Contact / requester"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Request channel</span>
                  <select
                    value={launchForm.requestChannel}
                    onChange={(event) =>
                      setLaunchForm((current) => ({ ...current, requestChannel: event.target.value as LaunchRequestChannel }))
                    }
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {REQUEST_CHANNEL_OPTIONS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Project type</span>
                  <select
                    value={launchForm.projectKind}
                    onChange={(event) =>
                      setLaunchForm((current) => ({ ...current, projectKind: event.target.value as LaunchProjectKind }))
                    }
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {PROJECT_KIND_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Beverage class</span>
                  <select
                    value={launchForm.beverageClass}
                    onChange={(event) =>
                      setLaunchForm((current) => ({
                        ...current,
                        beverageClass: event.target.value as LaunchIntake["beverageClass"]
                      }))
                    }
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {BEVERAGE_CLASS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Target launch timing</span>
                  <input
                    value={launchForm.targetLaunchTiming}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, targetLaunchTiming: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="Q3 2026"
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

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Estimated annual volume</span>
                  <input
                    value={launchForm.estimatedAnnualVolume}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, estimatedAnnualVolume: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="e.g., 400k lbs/year"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[var(--text-muted)]">Target price</span>
                  <input
                    value={launchForm.targetPrice}
                    onChange={(event) => setLaunchForm((current) => ({ ...current, targetPrice: event.target.value }))}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                    placeholder="$6.25 per lb"
                  />
                </label>
                <label className="inline-flex items-center gap-2 pt-6 text-sm text-[var(--text-base)]">
                  <input
                    type="checkbox"
                    checked={launchForm.knownCommercialOpportunity}
                    onChange={(event) =>
                      setLaunchForm((current) => ({ ...current, knownCommercialOpportunity: event.target.checked }))
                    }
                  />
                  Known commercial opportunity
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
                        stage: event.target.value as LaunchStage
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
                        priority: event.target.value as LaunchPriority
                      }))
                    }
                    title="Select launch priority"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {(["Low", "Medium", "High", "Urgent"] as LaunchPriority[]).map((priority) => (
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
                        riskLevel: event.target.value as LaunchRisk
                      }))
                    }
                    title="Select launch risk level"
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-base)] outline-none transition focus:border-cyan-400/45"
                  >
                    {(["Low", "Medium", "High"] as LaunchRisk[]).map((riskLevel) => (
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

              <MultiValueEditor
                label="Required Compliance Documents"
                values={launchForm.requiredComplianceDocuments}
                onChange={(values) =>
                  setLaunchForm((current) => ({
                    ...current,
                    requiredComplianceDocuments: values
                  }))
                }
                options={COMPLIANCE_DOCUMENT_OPTIONS}
                placeholder="Add Compliance Document"
                themeMode={themeMode}
                title="Manage required compliance document checklist"
              />

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
                  title={launchModalMode === "edit" ? "Save launch updates" : "Create launch brief"}
                  className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${primaryActionClass}`}
                >
                  {launchModalMode === "edit" ? <SaveIcon className="h-5 w-5" /> : <CreateIcon className="h-5 w-5" />}
                  {launchModalMode === "edit" ? "Save" : "Create Brief"}
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
