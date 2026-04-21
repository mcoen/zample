const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { JsonDocumentStore } = require("@zample/document-store");
const { registerLaunchRoutes } = require("./launches");

dotenv.config({ path: "../../.env" });
dotenv.config();

const PORT = Number(process.env.LAUNCHES_PORT || 4101);
const DATA_FILE = process.env.LAUNCHES_DATA_FILE || path.join(__dirname, "..", "data", "launches.json");
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const store = new JsonDocumentStore(DATA_FILE);
const app = express();

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

registerLaunchRoutes(app, store);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Launches service listening on http://localhost:${PORT}`);
});
