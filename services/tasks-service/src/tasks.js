const validStatuses = ["todo", "in_progress", "done"];
const validPriorities = ["Low", "Medium", "High"];
const validScopeTypes = ["vendor", "demand", "admin"];

function cleanStringArray(values) {
  const list = Array.isArray(values) ? values : [];
  return list
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function normalizeOrgId(value) {
  const cleaned = String(value || "").trim();
  return cleaned || null;
}

function normalizeTaskRecord(task) {
  return {
    ...task,
    description: String(task?.description || "").trim(),
    assignee: String(task?.assignee || "Unassigned").trim() || "Unassigned",
    dueDate: task?.dueDate || null,
    priority: validPriorities.includes(task?.priority) ? task.priority : "Medium",
    taskType: String(task?.taskType || "General").trim() || "General",
    launchId: task?.launchId || null,
    vendorOrgId: normalizeOrgId(task?.vendorOrgId),
    demandOrgId: normalizeOrgId(task?.demandOrgId),
    status: validStatuses.includes(task?.status) ? task.status : "todo"
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

function canAccessTask(task, scope) {
  if (!scope) {
    return false;
  }

  if (scope.scopeType === "admin") {
    return true;
  }

  if (scope.scopeType === "vendor") {
    return Boolean(task.vendorOrgId && scope.organizationIds.has(task.vendorOrgId));
  }

  if (scope.scopeType === "demand") {
    return Boolean(task.demandOrgId && scope.organizationIds.has(task.demandOrgId));
  }

  return false;
}

function registerTaskRoutes(app, store) {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "tasks-service" });
  });

  app.get("/tasks", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const launchId = req.query.launchId;
    const tasks = store
      .list()
      .map((task) => normalizeTaskRecord(task))
      .filter((task) => (!launchId ? true : task.launchId === launchId))
      .filter((task) => canAccessTask(task, scope))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json(tasks);
  });

  app.get("/tasks/:id", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const task = store.getById(req.params.id);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const normalized = normalizeTaskRecord(task);
    if (!canAccessTask(normalized, scope)) {
      res.status(403).json({ error: "Forbidden for current organization scope" });
      return;
    }

    res.json(normalized);
  });

  app.post("/tasks", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const {
      title,
      description,
      assignee,
      dueDate,
      priority,
      taskType,
      launchId,
      vendorOrgId,
      demandOrgId,
      status
    } = req.body || {};

    if (!title || typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const normalizedTask = normalizeTaskRecord({
      title: title.trim(),
      description,
      assignee,
      dueDate,
      priority,
      taskType,
      launchId: launchId || null,
      vendorOrgId,
      demandOrgId,
      status
    });

    if (normalizedTask.launchId && (!normalizedTask.vendorOrgId || !normalizedTask.demandOrgId)) {
      res.status(400).json({ error: "vendorOrgId and demandOrgId are required for launch tasks" });
      return;
    }

    if (!canAccessTask(normalizedTask, scope)) {
      res.status(403).json({ error: "Cannot create task outside current organization scope" });
      return;
    }

    const task = store.create(normalizedTask);
    res.status(201).json(normalizeTaskRecord(task));
  });

  app.patch("/tasks/:id", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const existing = store.getById(req.params.id);

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const normalizedExisting = normalizeTaskRecord(existing);
    if (!canAccessTask(normalizedExisting, scope)) {
      res.status(403).json({ error: "Cannot update task outside current organization scope" });
      return;
    }

    const patch = { ...req.body };

    if (patch.status && !validStatuses.includes(patch.status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    if (patch.priority && !validPriorities.includes(patch.priority)) {
      res.status(400).json({ error: `priority must be one of: ${validPriorities.join(", ")}` });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(patch, "description")) {
      patch.description = String(patch.description || "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(patch, "taskType")) {
      patch.taskType = String(patch.taskType || "General").trim() || "General";
    }

    if (Object.prototype.hasOwnProperty.call(patch, "vendorOrgId")) {
      patch.vendorOrgId = normalizeOrgId(patch.vendorOrgId);
    }

    if (Object.prototype.hasOwnProperty.call(patch, "demandOrgId")) {
      patch.demandOrgId = normalizeOrgId(patch.demandOrgId);
    }

    const candidate = normalizeTaskRecord({ ...normalizedExisting, ...patch });
    if (!canAccessTask(candidate, scope)) {
      res.status(403).json({ error: "Cannot re-scope task outside current organization scope" });
      return;
    }

    const updated = store.update(req.params.id, candidate);

    if (!updated) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(normalizeTaskRecord(updated));
  });

  app.delete("/tasks/:id", (req, res) => {
    const scope = requireScope(req, res);
    if (!scope) {
      return;
    }

    const task = store.getById(req.params.id);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const normalizedTask = normalizeTaskRecord(task);
    if (!canAccessTask(normalizedTask, scope)) {
      res.status(403).json({ error: "Cannot delete task outside current organization scope" });
      return;
    }

    const removed = store.remove(req.params.id);

    if (!removed) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.status(204).send();
  });
}

module.exports = {
  registerTaskRoutes
};
