const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({ path: "../../.env" });

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const LAUNCHES_SERVICE_URL = process.env.LAUNCHES_SERVICE_URL || "http://localhost:4101";
const TASKS_SERVICE_URL = process.env.TASKS_SERVICE_URL || "http://localhost:4102";

const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-zample-user-email",
      "x-zample-role-key",
      "x-zample-scope-type",
      "x-zample-org-ids"
    ]
  })
);
app.use(express.json({ limit: "1mb" }));

function createProxy({ mountPath, serviceBaseUrl, servicePath }) {
  return async function proxyHandler(req, res) {
    const suffix = req.originalUrl.replace(mountPath, "");
    const targetUrl = `${serviceBaseUrl}${servicePath}${suffix}`;

    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];

    const init = {
      method: req.method,
      headers
    };

    if (!["GET", "HEAD"].includes(req.method)) {
      init.body = JSON.stringify(req.body || {});
      init.headers["content-type"] = "application/json";
    }

    try {
      const response = await fetch(targetUrl, init);
      const body = await response.text();

      for (const [key, value] of response.headers.entries()) {
        if (["content-length", "connection", "transfer-encoding", "keep-alive"].includes(key.toLowerCase())) {
          continue;
        }
        res.setHeader(key, value);
      }

      res.status(response.status).send(body);
    } catch (error) {
      res.status(502).json({
        error: "Upstream service unavailable",
        detail: error.message,
        targetUrl
      });
    }
  };
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    gateway: "zample-api-gateway",
    services: {
      launches: LAUNCHES_SERVICE_URL,
      tasks: TASKS_SERVICE_URL
    }
  });
});

app.use(
  "/api/launches",
  createProxy({
    mountPath: "/api/launches",
    serviceBaseUrl: LAUNCHES_SERVICE_URL,
    servicePath: "/launches"
  })
);

app.use(
  "/api/tasks",
  createProxy({
    mountPath: "/api/tasks",
    serviceBaseUrl: TASKS_SERVICE_URL,
    servicePath: "/tasks"
  })
);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API gateway listening on http://localhost:${PORT}`);
});
