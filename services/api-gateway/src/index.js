const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("node:http");
const https = require("node:https");

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
  return function proxyHandler(req, res) {
    const suffix = req.originalUrl.startsWith(mountPath) ? req.originalUrl.slice(mountPath.length) : "";
    const targetUrl = `${serviceBaseUrl}${servicePath}${suffix}`;
    let target;

    try {
      target = new URL(targetUrl);
    } catch (error) {
      res.status(502).json({
        error: "Upstream service unavailable",
        detail: `Invalid upstream URL: ${targetUrl}`,
        targetUrl
      });
      return;
    }

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];
    delete headers["transfer-encoding"];
    delete headers["keep-alive"];

    let payload = null;
    if (!["GET", "HEAD"].includes(req.method)) {
      payload = Buffer.from(JSON.stringify(req.body || {}));
      headers["content-type"] = "application/json";
      headers["content-length"] = String(payload.length);
    }

    const client = target.protocol === "https:" ? https : http;
    const upstreamRequest = client.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      method: req.method,
      path: `${target.pathname}${target.search}`,
      headers,
      timeout: 15000
    });

    upstreamRequest.on("timeout", () => {
      upstreamRequest.destroy(new Error("Upstream request timed out"));
    });

    upstreamRequest.on("response", (upstreamResponse) => {
      for (const [key, value] of Object.entries(upstreamResponse.headers)) {
        if (value === undefined) {
          continue;
        }

        if (["content-length", "connection", "transfer-encoding", "keep-alive"].includes(key.toLowerCase())) {
          continue;
        }

        res.setHeader(key, value);
      }

      const chunks = [];

      upstreamResponse.on("data", (chunk) => {
        chunks.push(chunk);
      });

      upstreamResponse.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        res.status(upstreamResponse.statusCode || 502).send(body);
      });

      upstreamResponse.on("error", (error) => {
        // eslint-disable-next-line no-console
        console.error(
          `[gateway] Upstream stream error for ${req.method} ${req.originalUrl} -> ${targetUrl}: ${error.message}`
        );
        if (!res.headersSent) {
          res.status(502).json({
            error: "Upstream service unavailable",
            detail: error.message,
            targetUrl
          });
        }
      });
    });

    upstreamRequest.on("error", (error) => {
      // eslint-disable-next-line no-console
      console.error(`[gateway] Proxy error for ${req.method} ${req.originalUrl} -> ${targetUrl}: ${error.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Upstream service unavailable",
          detail: error.message,
          targetUrl
        });
      }
    });

    if (payload) {
      upstreamRequest.write(payload);
    }

    upstreamRequest.end();
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
