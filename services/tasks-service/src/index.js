const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { JsonDocumentStore } = require("@zample/document-store");

dotenv.config({ path: "../../.env" });
dotenv.config();

const PORT = Number(process.env.TASKS_PORT || 4102);
const DATA_FILE = process.env.TASKS_DATA_FILE || path.join(__dirname, "..", "data", "tasks.json");
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const validStatuses = ["todo", "in_progress", "done"];
const validPriorities = ["Low", "Medium", "High"];

const store = new JsonDocumentStore(DATA_FILE);
const app = express();

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tasks-service" });
});

app.get("/tasks", (req, res) => {
  const launchId = req.query.launchId;
  const tasks = store
    .list()
    .filter((task) => (!launchId ? true : task.launchId === launchId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {
  const task = store.getById(req.params.id);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(task);
});

app.post("/tasks", (req, res) => {
  const { title, description, assignee, dueDate, priority, taskType, launchId, status } = req.body || {};

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const normalizedStatus = validStatuses.includes(status) ? status : "todo";
  const normalizedPriority = validPriorities.includes(priority) ? priority : "Medium";

  const task = store.create({
    title: title.trim(),
    description: String(description || "").trim(),
    assignee: assignee ? assignee.trim() : "Unassigned",
    dueDate: dueDate || null,
    priority: normalizedPriority,
    taskType: String(taskType || "General").trim() || "General",
    launchId: launchId || null,
    status: normalizedStatus
  });

  res.status(201).json(task);
});

app.patch("/tasks/:id", (req, res) => {
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

  const updated = store.update(req.params.id, patch);

  if (!updated) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(updated);
});

app.delete("/tasks/:id", (req, res) => {
  const removed = store.remove(req.params.id);

  if (!removed) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Tasks service listening on http://localhost:${PORT}`);
});
