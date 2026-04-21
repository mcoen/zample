const path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { JsonDocumentStore } = require("@zample/document-store");

dotenv.config({ path: "../../.env" });
dotenv.config();

const PORT = Number(process.env.LAUNCHES_PORT || 4101);
const DATA_FILE = process.env.LAUNCHES_DATA_FILE || path.join(__dirname, "..", "data", "launches.json");
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const validStages = ["Intake", "In Validation", "Pilot", "Production"];
const validPriorities = ["Low", "Medium", "High", "Urgent"];
const validRiskLevels = ["Low", "Medium", "High"];

const store = new JsonDocumentStore(DATA_FILE);
const app = express();

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

function toId(input, fallback = "workspace_default") {
  const normalized = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
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

function normalizeWorkspace({ workspaceId, workspaceName, workspaceType }) {
  const name = String(workspaceName || "Core Innovation Workspace").trim() || "Core Innovation Workspace";
  const id = String(workspaceId || "").trim() || toId(name);
  const type = String(workspaceType || "General").trim() || "General";

  return {
    workspaceId: id,
    workspaceName: name,
    workspaceType: type
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "launches-service" });
});

app.get("/launches", (_req, res) => {
  const launches = store
    .list()
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json(launches);
});

app.get("/launches/:id", (req, res) => {
  const launch = store.getById(req.params.id);

  if (!launch) {
    res.status(404).json({ error: "Launch not found" });
    return;
  }

  res.json(launch);
});

app.post("/launches", (req, res) => {
  const {
    title,
    owner,
    stage,
    priority,
    riskLevel,
    dueDate,
    description,
    workspaceId,
    workspaceName,
    workspaceType,
    category,
    brand,
    market,
    stakeholders
  } = req.body || {};

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const normalizedOwner = String(owner || "Unassigned").trim() || "Unassigned";
  const normalizedStage = validStages.includes(stage) ? stage : "Intake";
  const normalizedPriority = validPriorities.includes(priority) ? priority : "Medium";
  const normalizedRiskLevel = validRiskLevels.includes(riskLevel) ? riskLevel : "Medium";
  const normalizedWorkspace = normalizeWorkspace({ workspaceId, workspaceName, workspaceType });

  const launch = store.create({
    title: title.trim(),
    owner: normalizedOwner,
    stage: normalizedStage,
    priority: normalizedPriority,
    riskLevel: normalizedRiskLevel,
    dueDate: dueDate || null,
    description: description || "",
    status: "active",
    ...normalizedWorkspace,
    category: String(category || "General").trim() || "General",
    brand: String(brand || "").trim(),
    market: String(market || "").trim(),
    stakeholders: normalizeStakeholders(stakeholders, normalizedOwner)
  });

  res.status(201).json(launch);
});

app.patch("/launches/:id", (req, res) => {
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

  if (patch.stakeholders && !Array.isArray(patch.stakeholders)) {
    res.status(400).json({ error: "stakeholders must be an array" });
    return;
  }

  if (patch.workspaceName || patch.workspaceType || patch.workspaceId) {
    const normalizedWorkspace = normalizeWorkspace({
      workspaceId: patch.workspaceId,
      workspaceName: patch.workspaceName,
      workspaceType: patch.workspaceType
    });

    patch.workspaceId = normalizedWorkspace.workspaceId;
    patch.workspaceName = normalizedWorkspace.workspaceName;
    patch.workspaceType = normalizedWorkspace.workspaceType;
  }

  if (patch.stakeholders) {
    patch.stakeholders = normalizeStakeholders(patch.stakeholders, patch.owner);
  }

  const updated = store.update(req.params.id, patch);

  if (!updated) {
    res.status(404).json({ error: "Launch not found" });
    return;
  }

  res.json(updated);
});

app.delete("/launches/:id", (req, res) => {
  const removed = store.remove(req.params.id);

  if (!removed) {
    res.status(404).json({ error: "Launch not found" });
    return;
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Launches service listening on http://localhost:${PORT}`);
});
