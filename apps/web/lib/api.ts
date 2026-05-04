import type { SessionRoleKey } from "@/lib/auth";

export type LaunchStage = "Intake" | "In Validation" | "Pilot" | "Production";
export type LaunchPriority = "Low" | "Medium" | "High" | "Urgent";
export type LaunchRisk = "Low" | "Medium" | "High";
export type OrganizationScopeType = "vendor" | "demand" | "admin";

export type LaunchLifecycleStatus =
  | "Draft"
  | "Sent to Demand Company"
  | "Confirmed by Demand Company"
  | "In Review"
  | "Clarification Needed"
  | "Approved for Sampling"
  | "In Formulation / Sample Prep"
  | "Sample Shipped"
  | "Awaiting Demand Feedback"
  | "Feedback Received"
  | "Revision Requested"
  | "Closed Won"
  | "Closed Lost"
  | "Inactive";

export type LaunchConfirmationStatus = "Not Sent" | "Sent" | "Confirmed" | "Needs Update";
export type LaunchProjectKind = "Real Project" | "Library Sample";
export type LaunchBeverageClass = "Beverage" | "Non-Beverage";
export type LaunchRequestChannel = "Email" | "Phone" | "Meeting" | "Portal" | "Other";
export type LaunchOrganizationType = "vendor" | "demand";
export type LaunchRelationshipStatus = "prospect" | "active" | "paused" | "won" | "lost";

export type LaunchParty = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type LaunchBrief = {
  sampleType: string;
  targetFlavorProfile: string;
  flavorTags: string[];
  creativeDirection: "Match Exactly" | "Open Innovation";
  vendorSuggestionsRequested: boolean;
  vendorSuggestionNotes: string;
  application: string;
  samplePhaseVolume: string;
  commercialScaleEstimate: string;
  sampleDueDate: string | null;
  milestoneDate: string | null;
  pricingRequestTiming: "Required Now" | "Required Later" | "Not Needed Yet";
  certificationsRequired: string[];
  regulatoryDocumentation: string[];
  ingredientConstraints: string;
  costTarget: string;
  physicalFormat: string;
  stabilityRequirements: string;
  packagingSampleSize: string;
  deliveryFormat: string;
  referenceProducts: string;
  internalNotes: string;
};

export type LaunchIntake = {
  demandCompanyName: string;
  requesterName: string;
  requestChannel: LaunchRequestChannel;
  requestDetails: string;
  projectKind: LaunchProjectKind;
  beverageClass: LaunchBeverageClass;
  targetLaunchTiming: string;
  knownCommercialOpportunity: boolean;
  estimatedAnnualVolume: string;
  targetPrice: string;
  supplierProposedPrice: string;
  priceUnit: string;
  priceSensitivity: string;
};

export type VendorChoice = {
  id: string;
  name: string;
  source: "approved" | "suggested" | "manual";
  included: boolean;
  priority: number;
  expertise: string;
  certifications: string;
};

export type LaunchVendorSelection = {
  approvedVendors: string[];
  suggestedVendors: string[];
  selectedVendors: VendorChoice[];
  requestVisibility: "Visible" | "Blind";
};

export type LaunchAttachment = {
  id: string;
  name: string;
  fileType: string;
  category: string;
  url: string;
  visibility: "Shared" | "Internal";
  uploadedAt: string;
};

export type LaunchFeedback = {
  id: string;
  author: string;
  type: "Acknowledgement" | "Clarification" | "Feasibility" | "Timeline" | "Sample Feedback";
  note: string;
  status: "Open" | "Resolved";
  createdAt: string;
};

export type LaunchMessage = {
  id: string;
  sender: string;
  recipients: string[];
  text: string;
  tag: "Clarification" | "Urgent" | "Blocking" | "Update";
  unresolved: boolean;
  fieldRef: string;
  createdAt: string;
};

export type LaunchOrganization = {
  id: string;
  name: string;
  type: LaunchOrganizationType;
};

export type LaunchOrganizationRelationship = {
  id: string;
  vendorOrgId: string;
  demandOrgId: string;
  status: LaunchRelationshipStatus;
  owner: string;
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
  launchType: string;
  category: string;
  brand: string;
  market: string;
  vendorOrg: LaunchOrganization;
  demandOrg: LaunchOrganization;
  organizationRelationship: LaunchOrganizationRelationship;
  vendorOrgId?: string;
  demandOrgId?: string;
  stakeholders: LaunchParty[];
  lifecycleStatus?: LaunchLifecycleStatus;
  confirmationStatus?: LaunchConfirmationStatus;
  intake?: LaunchIntake;
  brief?: LaunchBrief;
  vendorSelection?: LaunchVendorSelection;
  attachments?: LaunchAttachment[];
  requiredComplianceDocuments?: string[];
  feedbackLog?: LaunchFeedback[];
  messageThread?: LaunchMessage[];
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
  vendorOrgId: string | null;
  demandOrgId: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

type ApiSessionContext = {
  email: string;
  roleKey: SessionRoleKey;
  scopeType: OrganizationScopeType;
  organizationIds: string[];
};

let apiSessionContext: ApiSessionContext | null = null;

export function configureApiSession(context: ApiSessionContext | null) {
  apiSessionContext = context;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(apiSessionContext
          ? {
              "x-zample-user-email": apiSessionContext.email,
              "x-zample-role-key": apiSessionContext.roleKey,
              "x-zample-scope-type": apiSessionContext.scopeType,
              "x-zample-org-ids": apiSessionContext.organizationIds.join(",")
            }
          : {}),
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
  launchType?: string;
  category?: string;
  brand?: string;
  market?: string;
  vendorOrg?: Partial<LaunchOrganization>;
  demandOrg?: Partial<LaunchOrganization>;
  organizationRelationship?: Partial<LaunchOrganizationRelationship>;
  stakeholders?: Array<{ name: string; role?: string; email?: string }>;
  lifecycleStatus?: LaunchLifecycleStatus;
  confirmationStatus?: LaunchConfirmationStatus;
  intake?: Partial<LaunchIntake>;
  brief?: Partial<LaunchBrief>;
  vendorSelection?: Partial<LaunchVendorSelection>;
  attachments?: Array<Partial<LaunchAttachment>>;
  requiredComplianceDocuments?: string[];
  feedbackLog?: Array<Partial<LaunchFeedback>>;
  messageThread?: Array<Partial<LaunchMessage>>;
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
  vendorOrgId?: string | null;
  demandOrgId?: string | null;
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
