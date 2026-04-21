const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class JsonDocumentStore {
  constructor(filePath, idField = "id") {
    if (!filePath) {
      throw new Error("A file path is required for JsonDocumentStore");
    }

    this.filePath = path.resolve(filePath);
    this.idField = idField;
    this.ensureStore();
  }

  ensureStore() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "[]", "utf8");
    }
  }

  read() {
    this.ensureStore();
    const raw = fs.readFileSync(this.filePath, "utf8").trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      throw new Error(`Invalid JSON in store ${this.filePath}: ${error.message}`);
    }
  }

  write(documents) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");
  }

  list() {
    return this.read();
  }

  getById(id) {
    const documents = this.read();
    return documents.find((doc) => doc[this.idField] === id) || null;
  }

  create(payload) {
    const documents = this.read();
    const now = new Date().toISOString();
    const next = {
      [this.idField]: payload[this.idField] || randomUUID(),
      ...payload,
      createdAt: payload.createdAt || now,
      updatedAt: now
    };

    documents.push(next);
    this.write(documents);
    return next;
  }

  update(id, patch) {
    const documents = this.read();
    const index = documents.findIndex((doc) => doc[this.idField] === id);

    if (index === -1) {
      return null;
    }

    const updated = {
      ...documents[index],
      ...patch,
      [this.idField]: id,
      updatedAt: new Date().toISOString()
    };

    documents[index] = updated;
    this.write(documents);
    return updated;
  }

  remove(id) {
    const documents = this.read();
    const remaining = documents.filter((doc) => doc[this.idField] !== id);

    if (remaining.length === documents.length) {
      return false;
    }

    this.write(remaining);
    return true;
  }
}

module.exports = { JsonDocumentStore };
