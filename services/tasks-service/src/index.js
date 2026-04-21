const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { JsonDocumentStore } = require("@zample/document-store");
const { registerTaskRoutes } = require("./tasks");

dotenv.config({ path: "../../.env" });
dotenv.config();

const PORT = Number(process.env.TASKS_PORT || 4102);
const DATA_FILE = process.env.TASKS_DATA_FILE || path.join(__dirname, "..", "data", "tasks.json");
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const store = new JsonDocumentStore(DATA_FILE);
const app = express();

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

registerTaskRoutes(app, store);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Tasks service listening on http://localhost:${PORT}`);
});
