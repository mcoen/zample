const { randomUUID } = require("node:crypto");

const validStages = ["Intake", "In Validation", "Pilot", "Production"];
const validPriorities = ["Low", "Medium", "High", "Urgent"];
const validRiskLevels = ["Low", "Medium", "High"];
const validLifecycleStatuses = [
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
const validConfirmationStatuses = ["Not Sent", "Sent", "Confirmed", "Needs Update"];
const validProjectKinds = ["Real Project", "Library Sample"];
const validBeverageClasses = ["Beverage", "Non-Beverage"];
const validRequestChannels = ["Email", "Phone", "Meeting", "Portal", "Other"];
const validCreativeDirections = ["Match Exactly", "Open Innovation"];
const validPricingRequestTimings = ["Required Now", "Required Later", "Not Needed Yet"];
const validRequestVisibility = ["Visible", "Blind"];
const validAttachmentVisibility = ["Shared", "Internal"];
const validFeedbackTypes = ["Acknowledgement", "Clarification", "Feasibility", "Timeline", "Sample Feedback"];
const validFeedbackStatuses = ["Open", "Resolved"];
const validMessageTags = ["Clarification", "Urgent", "Blocking", "Update"];
const validOrgTypes = ["vendor", "demand"];
const validRelationshipStatuses = ["prospect", "active", "paused", "won", "lost"];
const validScopeTypes = ["vendor", "demand", "admin"];

function toId(input, fallback = "launches_default") {
  const normalized = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function cleanStringArray(values) {
  const list = Array.isArray(values) ? values : [];
  return list
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function mergeUnique(values) {
  const seen = new Set();
  const output = [];

  values.forEach((value) => {
    const cleaned = String(value || "").trim();
    if (!cleaned) {
      return;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(cleaned);
  });

  return output;
}

function normalizeStakeholders(stakeholders, owner) {
  const entries = Array.isArray(stakeholders) ? stakeholders : [];
  const normalized = entries
    .map((stakeholder) => {
      const name = String(stakeholder?.name || "").trim();
      const role = String(stakeholder?.role || "Launch Stakeholder").trim() || "Launch Stakeholder";
      const email = String(stakeholder?.email || "").trim();

      if (!name) {
        return null;
      }

      return {
        id: String(stakeholder?.id || randomUUID()),
        name,
        role,
        email
      };
    })
    .filter(Boolean);

  const ownerName = String(owner || "").trim();
  if (ownerName && !normalized.some((party) => party.name.toLowerCase() === ownerName.toLowerCase())) {
    normalized.unshift({
      id: randomUUID(),
      name: ownerName,
      role: "Launch Owner",
      email: ""
    });
  }

  return normalized;
}

function normalizeLaunchType(launchType, legacyWorkspaceType) {
  return String(launchType || legacyWorkspaceType || "Other").trim() || "Other";
}

function inferLaunchTypeLabel(launch) {
  const explicit = normalizeLaunchType(launch.launchType, launch.workspaceType);
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

  return "Ingredient";
}

function defaultSuggestedVendors(launch) {
  const launchType = inferLaunchTypeLabel(launch).toLowerCase();

  if (launchType.includes("beverage")) {
    return ["FlavorWorks Labs", "BluePeak Beverage Systems", "CitrusCraft Ingredients"];
  }

  if (launchType.includes("snack")) {
    return ["CrunchLab Foods", "GrainSmith Partners", "Savory Trail Labs"];
  }

  if (launchType.includes("condiment") || launchType.includes("sauce")) {
    return ["SauceForge Solutions", "SpiceRoute Co.", "Heritage Blends"];
  }

  return ["Core Ingredient Works", "Precision Flavor Systems", "Nexus Ingredient Group"];
}

function inferVendorOrgFallback(launch) {
  const selected = Array.isArray(launch?.vendorSelection?.selectedVendors)
    ? launch.vendorSelection.selectedVendors.find((vendor) => vendor && vendor.included !== false && vendor.name)
    : null;

  if (selected?.name) {
    return String(selected.name).trim();
  }

  const approved = Array.isArray(launch?.vendorSelection?.approvedVendors)
    ? launch.vendorSelection.approvedVendors.find((name) => String(name || "").trim())
    : "";
  if (approved) {
    return String(approved).trim();
  }

  const suggested = Array.isArray(launch?.vendorSelection?.suggestedVendors)
    ? launch.vendorSelection.suggestedVendors.find((name) => String(name || "").trim())
    : "";
  if (suggested) {
    return String(suggested).trim();
  }

  return "FlavorWorks Labs";
}

function normalizeOrganization(org, fallbackName, type, idPrefix) {
  const normalizedType = validOrgTypes.includes(org?.type) ? org.type : type;
  const fallback = String(fallbackName || "").trim() || (type === "vendor" ? "Unassigned Vendor" : "Unknown Demand Company");
  const name = String(org?.name || fallback).trim() || fallback;
  const id = String(org?.id || "").trim() || toId(`${idPrefix}_${name}`, `${idPrefix}_default`);

  return {
    id,
    name,
    type: normalizedType
  };
}

function relationshipStatusFromLifecycle(lifecycleStatus) {
  if (lifecycleStatus === "Closed Won") {
    return "won";
  }
  if (lifecycleStatus === "Closed Lost") {
    return "lost";
  }
  return "active";
}

function normalizeOrganizationRelationship(relationship, vendorOrg, demandOrg, owner, lifecycleStatus) {
  const status = validRelationshipStatuses.includes(relationship?.status)
    ? relationship.status
    : relationshipStatusFromLifecycle(lifecycleStatus);

  return {
    id: String(relationship?.id || `${vendorOrg.id}__${demandOrg.id}`).trim() || `${vendorOrg.id}__${demandOrg.id}`,
    vendorOrgId: vendorOrg.id,
    demandOrgId: demandOrg.id,
    status,
    owner: String(relationship?.owner || owner || "Unassigned").trim() || "Unassigned"
  };
}

function normalizeIntake(intake, launch, demandOrg) {
  const source = intake && typeof intake === "object" ? intake : {};

  const projectKind = validProjectKinds.includes(source.projectKind) ? source.projectKind : "Real Project";
  const beverageClass = validBeverageClasses.includes(source.beverageClass)
    ? source.beverageClass
    : /(beverage|drink|juice|coffee|tea|water|protein)/.test(`${launch.category || ""} ${launch.title || ""}`.toLowerCase())
      ? "Beverage"
      : "Non-Beverage";

  return {
    demandCompanyName:
      String(
        source.demandCompanyName ||
          source.customerName ||
          demandOrg?.name ||
          launch.brand ||
          "Unknown Demand Company"
      ).trim() || "Unknown Demand Company",
    requesterName: String(source.requesterName || launch.owner || "").trim(),
    requestChannel: validRequestChannels.includes(source.requestChannel) ? source.requestChannel : "Email",
    requestDetails: String(source.requestDetails || launch.description || "").trim(),
    projectKind,
    beverageClass,
    targetLaunchTiming: String(source.targetLaunchTiming || launch.dueDate || "").trim(),
    knownCommercialOpportunity: Boolean(source.knownCommercialOpportunity),
    estimatedAnnualVolume: String(source.estimatedAnnualVolume || "").trim(),
    targetPrice: String(source.targetPrice || "").trim(),
    supplierProposedPrice: String(source.supplierProposedPrice || "").trim(),
    priceUnit: String(source.priceUnit || "per lb").trim() || "per lb",
    priceSensitivity: String(source.priceSensitivity || "Medium").trim() || "Medium"
  };
}

function normalizeBrief(brief, launch) {
  const source = brief && typeof brief === "object" ? brief : {};

  const flavorTags = cleanStringArray(source.flavorTags);
  const certificationsRequired = cleanStringArray(source.certificationsRequired);
  const regulatoryDocumentation = cleanStringArray(source.regulatoryDocumentation);

  return {
    sampleType: String(source.sampleType || "Flavor System").trim() || "Flavor System",
    targetFlavorProfile: String(source.targetFlavorProfile || "").trim(),
    flavorTags,
    creativeDirection: validCreativeDirections.includes(source.creativeDirection)
      ? source.creativeDirection
      : "Match Exactly",
    vendorSuggestionsRequested: Boolean(source.vendorSuggestionsRequested),
    vendorSuggestionNotes: String(source.vendorSuggestionNotes || "").trim(),
    application: String(source.application || launch.category || "").trim(),
    samplePhaseVolume: String(source.samplePhaseVolume || "").trim(),
    commercialScaleEstimate: String(source.commercialScaleEstimate || "").trim(),
    sampleDueDate: source.sampleDueDate || launch.dueDate || null,
    milestoneDate: source.milestoneDate || launch.dueDate || null,
    pricingRequestTiming: validPricingRequestTimings.includes(source.pricingRequestTiming)
      ? source.pricingRequestTiming
      : "Required Later",
    certificationsRequired,
    regulatoryDocumentation,
    ingredientConstraints: String(source.ingredientConstraints || "").trim(),
    costTarget: String(source.costTarget || "").trim(),
    physicalFormat: String(source.physicalFormat || "").trim(),
    stabilityRequirements: String(source.stabilityRequirements || "").trim(),
    packagingSampleSize: String(source.packagingSampleSize || "").trim(),
    deliveryFormat: String(source.deliveryFormat || "").trim(),
    referenceProducts: String(source.referenceProducts || "").trim(),
    internalNotes: String(source.internalNotes || "").trim()
  };
}

function normalizeVendorSelection(vendorSelection, launch) {
  const source = vendorSelection && typeof vendorSelection === "object" ? vendorSelection : {};
  const approvedVendors = cleanStringArray(source.approvedVendors);
  const suggestedVendors = cleanStringArray(source.suggestedVendors);
  const defaults = defaultSuggestedVendors(launch);

  const selectedVendors = (Array.isArray(source.selectedVendors) ? source.selectedVendors : [])
    .map((vendor, index) => {
      const name = String(vendor?.name || "").trim();
      if (!name) {
        return null;
      }

      return {
        id: String(vendor?.id || randomUUID()),
        name,
        source: ["approved", "suggested", "manual"].includes(vendor?.source) ? vendor.source : "manual",
        included: Boolean(vendor?.included !== false),
        priority: Number.isFinite(Number(vendor?.priority)) ? Math.max(1, Number(vendor.priority)) : index + 1,
        expertise: String(vendor?.expertise || "").trim(),
        certifications: String(vendor?.certifications || "").trim()
      };
    })
    .filter(Boolean);

  if (!selectedVendors.length) {
    const seedNames = approvedVendors.length ? approvedVendors : defaults;
    seedNames.slice(0, 3).forEach((vendorName, index) => {
      selectedVendors.push({
        id: randomUUID(),
        name: vendorName,
        source: approvedVendors.includes(vendorName) ? "approved" : "suggested",
        included: index < 2,
        priority: index + 1,
        expertise: "",
        certifications: ""
      });
    });
  }

  return {
    approvedVendors: mergeUnique(approvedVendors.length ? approvedVendors : defaults),
    suggestedVendors: mergeUnique(suggestedVendors.length ? suggestedVendors : defaults),
    selectedVendors,
    requestVisibility: validRequestVisibility.includes(source.requestVisibility) ? source.requestVisibility : "Visible"
  };
}

function normalizeAttachments(attachments) {
  const entries = Array.isArray(attachments) ? attachments : [];

  return entries
    .map((attachment) => {
      const name = String(attachment?.name || "").trim();
      const url = String(attachment?.url || "").trim();
      if (!name && !url) {
        return null;
      }

      return {
        id: String(attachment?.id || randomUUID()),
        name: name || "Untitled document",
        fileType: String(attachment?.fileType || "Document").trim() || "Document",
        category: String(attachment?.category || "Reference").trim() || "Reference",
        url,
        visibility: validAttachmentVisibility.includes(attachment?.visibility) ? attachment.visibility : "Shared",
        uploadedAt: attachment?.uploadedAt || new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function normalizeFeedbackLog(feedbackLog) {
  const entries = Array.isArray(feedbackLog) ? feedbackLog : [];

  return entries
    .map((entry) => {
      const note = String(entry?.note || "").trim();
      if (!note) {
        return null;
      }

      return {
        id: String(entry?.id || randomUUID()),
        author: String(entry?.author || "Unknown").trim() || "Unknown",
        type: validFeedbackTypes.includes(entry?.type) ? entry.type : "Clarification",
        note,
        status: validFeedbackStatuses.includes(entry?.status) ? entry.status : "Open",
        createdAt: entry?.createdAt || new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function normalizeMessageThread(messageThread) {
  const entries = Array.isArray(messageThread) ? messageThread : [];

  return entries
    .map((entry) => {
      const text = String(entry?.text || "").trim();
      if (!text) {
        return null;
      }

      return {
        id: String(entry?.id || randomUUID()),
        sender: String(entry?.sender || "Unknown").trim() || "Unknown",
        recipients: cleanStringArray(entry?.recipients),
        text,
        tag: validMessageTags.includes(entry?.tag) ? entry.tag : "Update",
        unresolved: Boolean(entry?.unresolved),
        fieldRef: String(entry?.fieldRef || "").trim(),
        createdAt: entry?.createdAt || new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function normalizeLaunchRecord(record) {
  const launch = { ...(record || {}) };
  const { workspaceId, workspaceName, workspaceType, ...launchWithoutLegacyWorkspace } = launch;

  const owner = String(launch.owner || "Unassigned").trim() || "Unassigned";
  const launchType = normalizeLaunchType(launch.launchType, workspaceType);

  const provisionalDemandOrg = normalizeOrganization(
    launch.demandOrg,
    launch.intake?.demandCompanyName || launch.intake?.customerName || launch.brand || "Unknown Demand Company",
    "demand",
    "org_demand"
  );

  const provisionalVendorOrg = normalizeOrganization(
    launch.vendorOrg,
    inferVendorOrgFallback(launch),
    "vendor",
    "org_vendor"
  );

  const intake = normalizeIntake(launch.intake, launch, provisionalDemandOrg);
  const demandOrg = normalizeOrganization(launch.demandOrg, intake.demandCompanyName, "demand", "org_demand");
  const vendorOrg = normalizeOrganization(launch.vendorOrg, provisionalVendorOrg.name, "vendor", "org_vendor");

  return {
    ...launchWithoutLegacyWorkspace,
    title: String(launch.title || "Untitled Launch").trim() || "Untitled Launch",
    owner,
    stage: validStages.includes(launch.stage) ? launch.stage : "Intake",
    priority: validPriorities.includes(launch.priority) ? launch.priority : "Medium",
    riskLevel: validRiskLevels.includes(launch.riskLevel) ? launch.riskLevel : "Medium",
    dueDate: launch.dueDate || null,
    description: String(launch.description || "").trim(),
    status: launch.status === "archived" ? "archived" : "active",
    launchType,
    category: String(launch.category || "General").trim() || "General",
    brand: String(launch.brand || "").trim(),
    market: String(launch.market || "").trim(),
    vendorOrg,
    demandOrg,
    organizationRelationship: normalizeOrganizationRelationship(
      launch.organizationRelationship,
      vendorOrg,
      demandOrg,
      owner,
      launch.lifecycleStatus
    ),
    vendorOrgId: vendorOrg.id,
    demandOrgId: demandOrg.id,
    stakeholders: normalizeStakeholders(launch.stakeholders, owner),
    lifecycleStatus: validLifecycleStatuses.includes(launch.lifecycleStatus)
      ? launch.lifecycleStatus
      : "Draft",
    confirmationStatus: validConfirmationStatuses.includes(launch.confirmationStatus)
      ? launch.confirmationStatus
      : "Not Sent",
    intake,
    brief: normalizeBrief(launch.brief, launch),
    vendorSelection: normalizeVendorSelection(launch.vendorSelection, launch),
    attachments: normalizeAttachments(launch.attachments),
    requiredComplianceDocuments: cleanStringArray(launch.requiredComplianceDocuments),
    feedbackLog: normalizeFeedbackLog(launch.feedbackLog),
    messageThread: normalizeMessageThread(launch.messageThread)
  };
}

function parseRequestScope(req) {
  const roleKey = String(req.get("x-zample-role-key") || "").trim();
  const scopeType = String(req.get("x-zample-scope-type") || "").trim();
  const userEmail = String(req.get("x-zample-user-email") || "").trim().toLowerCase();
  const organizationIds = cleanStringArray(String(req.get("x-zample-org-ids") || "").split(","));

  if (!roleKey || !scopeType || !userEmail || !validScopeTypes.includes(scopeType)) {
    return null;
  }

  if (scopeType !== "admin" && !organizationIds.length) {
    return null;
  }

  return {
    roleKey,
    scopeType,
    userEmail,
    organizationIds: new Set(organizationIds)
  };
}

function requireScope(req, res) {
  const scope = parseRequestScope(req);

  if (!scope) {
    res.status(401).json({
      error: "Missing auth scope",
      detail: "Provide x-zample-user-email, x-zample-role-key, x-zample-scope-type, and x-zample-org-ids headers"
    });
    return null;
  }

  return scope;
}

function canAccessLaunch(launch, scope) {
  if (!scope) {
    return false;
  }

  if (scope.scopeType === "admin") {
    return true;
  }

  if (scope.scopeType === "vendor") {
    return scope.organizationIds.has(launch.vendorOrg?.id);
  }

  if (scope.scopeType === "demand") {
    return scope.organizationIds.has(launch.demandOrg?.id);
  }

  return false;
}

function canWriteLaunch(launchLike, scope) {
  if (!scope) {
    return false;
  }

  if (scope.scopeType === "admin") {
    return true;
  }

  if (scope.scopeType === "vendor") {
    return scope.organizationIds.has(launchLike.vendorOrg?.id || launchLike.vendorOrgId);
  }

  if (scope.scopeType === "demand") {
    return scope.organizationIds.has(launchLike.demandOrg?.id || launchLike.demandOrgId);
  }

  return false;
}

function registerLaunchRoutes(app, store) {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "launches-service" });
  });

  app.get("/launches", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const launches = store
      .list()
      .map((launch) => normalizeLaunchRecord(launch))
      .filter((launch) => canAccessLaunch(launch, scope))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json(launches);
  });

  app.get("/launches/:id", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const launch = store.getById(req.params.id);

    if (!launch) {
      res.status(404).json({ error: "Launch not found" });
      return;
    }

    const normalized = normalizeLaunchRecord(launch);
    if (!canAccessLaunch(normalized, scope)) {
      res.status(403).json({ error: "Forbidden for current organization scope" });
      return;
    }

    res.json(normalized);
  });

  app.post("/launches", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const {
      title,
      owner,
      stage,
      priority,
      riskLevel,
      dueDate,
      description,
      launchType,
      workspaceType,
      category,
      brand,
      market,
      vendorOrg,
      demandOrg,
      organizationRelationship,
      stakeholders,
      lifecycleStatus,
      confirmationStatus,
      intake,
      brief,
      vendorSelection,
      attachments,
      requiredComplianceDocuments,
      feedbackLog,
      messageThread
    } = req.body || {};

    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const normalizedOwner = String(owner || "Unassigned").trim() || "Unassigned";
    const normalizedStage = validStages.includes(stage) ? stage : "Intake";
    const normalizedPriority = validPriorities.includes(priority) ? priority : "Medium";
    const normalizedRiskLevel = validRiskLevels.includes(riskLevel) ? riskLevel : "Medium";

    const normalizedInput = normalizeLaunchRecord({
      title: title.trim(),
      owner: normalizedOwner,
      stage: normalizedStage,
      priority: normalizedPriority,
      riskLevel: normalizedRiskLevel,
      dueDate: dueDate || null,
      description: description || "",
      status: "active",
      launchType: normalizeLaunchType(launchType, workspaceType),
      category: String(category || "General").trim() || "General",
      brand: String(brand || "").trim(),
      market: String(market || "").trim(),
      vendorOrg,
      demandOrg,
      organizationRelationship,
      stakeholders,
      lifecycleStatus: validLifecycleStatuses.includes(lifecycleStatus) ? lifecycleStatus : "Draft",
      confirmationStatus: validConfirmationStatuses.includes(confirmationStatus) ? confirmationStatus : "Not Sent",
      intake,
      brief,
      vendorSelection,
      attachments,
      requiredComplianceDocuments,
      feedbackLog,
      messageThread
    });

    if (!canWriteLaunch(normalizedInput, scope)) {
      res.status(403).json({ error: "Cannot create launch outside current organization scope" });
      return;
    }

    const launch = store.create(normalizedInput);
    res.status(201).json(normalizeLaunchRecord(launch));
  });

  app.patch("/launches/:id", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const existing = store.getById(req.params.id);

    if (!existing) {
      res.status(404).json({ error: "Launch not found" });
      return;
    }

    const normalizedExisting = normalizeLaunchRecord(existing);
    if (!canWriteLaunch(normalizedExisting, scope)) {
      res.status(403).json({ error: "Cannot update launch outside current organization scope" });
      return;
    }

    const patch = { ...req.body };

    if (patch.stage && !validStages.includes(patch.stage)) {
      res.status(400).json({ error: `stage must be one of: ${validStages.join(", ")}` });
      return;
    }

    if (patch.priority && !validPriorities.includes(patch.priority)) {
      res.status(400).json({ error: `priority must be one of: ${validPriorities.join(", ")}` });
      return;
    }

    if (patch.riskLevel && !validRiskLevels.includes(patch.riskLevel)) {
      res.status(400).json({ error: `riskLevel must be one of: ${validRiskLevels.join(", ")}` });
      return;
    }

    if (patch.lifecycleStatus && !validLifecycleStatuses.includes(patch.lifecycleStatus)) {
      res.status(400).json({ error: `lifecycleStatus must be one of: ${validLifecycleStatuses.join(", ")}` });
      return;
    }

    if (patch.confirmationStatus && !validConfirmationStatuses.includes(patch.confirmationStatus)) {
      res.status(400).json({
        error: `confirmationStatus must be one of: ${validConfirmationStatuses.join(", ")}`
      });
      return;
    }

    if (patch.stakeholders && !Array.isArray(patch.stakeholders)) {
      res.status(400).json({ error: "stakeholders must be an array" });
      return;
    }

    const normalizedPatch = {
      ...patch,
      launchType: normalizeLaunchType(patch.launchType, patch.workspaceType || normalizedExisting.launchType)
    };

    if (normalizedPatch.stakeholders) {
      normalizedPatch.stakeholders = normalizeStakeholders(
        normalizedPatch.stakeholders,
        normalizedPatch.owner || normalizedExisting.owner
      );
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "requiredComplianceDocuments")) {
      normalizedPatch.requiredComplianceDocuments = cleanStringArray(normalizedPatch.requiredComplianceDocuments);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "attachments")) {
      normalizedPatch.attachments = normalizeAttachments(normalizedPatch.attachments);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "feedbackLog")) {
      normalizedPatch.feedbackLog = normalizeFeedbackLog(normalizedPatch.feedbackLog);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "messageThread")) {
      normalizedPatch.messageThread = normalizeMessageThread(normalizedPatch.messageThread);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "intake")) {
      const mergedIntake = {
        ...(normalizedExisting.intake || {}),
        ...(normalizedPatch.intake || {})
      };
      normalizedPatch.intake = normalizeIntake(mergedIntake, { ...normalizedExisting, ...normalizedPatch }, normalizedExisting.demandOrg);
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "brief")) {
      normalizedPatch.brief = normalizeBrief(
        { ...(normalizedExisting.brief || {}), ...(normalizedPatch.brief || {}) },
        { ...normalizedExisting, ...normalizedPatch }
      );
    }

    if (Object.prototype.hasOwnProperty.call(normalizedPatch, "vendorSelection")) {
      normalizedPatch.vendorSelection = normalizeVendorSelection(
        { ...(normalizedExisting.vendorSelection || {}), ...(normalizedPatch.vendorSelection || {}) },
        { ...normalizedExisting, ...normalizedPatch }
      );
    }

    const candidate = normalizeLaunchRecord({
      ...normalizedExisting,
      ...normalizedPatch,
      intake: normalizedPatch.intake || normalizedExisting.intake,
      brief: normalizedPatch.brief || normalizedExisting.brief,
      vendorSelection: normalizedPatch.vendorSelection || normalizedExisting.vendorSelection
    });

    if (!canWriteLaunch(candidate, scope)) {
      res.status(403).json({ error: "Cannot re-scope launch outside current organization scope" });
      return;
    }

    const updated = store.update(req.params.id, candidate);

    if (!updated) {
      res.status(404).json({ error: "Launch not found" });
      return;
    }

    res.json(normalizeLaunchRecord(updated));
  });

  app.delete("/launches/:id", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const existing = store.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "Launch not found" });
      return;
    }

    const normalizedExisting = normalizeLaunchRecord(existing);
    if (!canWriteLaunch(normalizedExisting, scope)) {
      res.status(403).json({ error: "Cannot delete launch outside current organization scope" });
      return;
    }

    const removed = store.remove(req.params.id);

    if (!removed) {
      res.status(404).json({ error: "Launch not found" });
      return;
    }

    res.status(204).send();
  });
}

module.exports = {
  registerLaunchRoutes
};
