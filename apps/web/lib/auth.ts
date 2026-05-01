export type SessionRoleKey = "vendor_sales_rep" | "rd_specialist" | "marketplace_admin";
export type SessionDefaultNav = "inbox" | "my_launches";
export type SessionScopeType = "vendor" | "demand" | "admin";

export type SessionUser = {
  email: string;
  fullName: string;
  role: string;
  roleKey: SessionRoleKey;
  scopeType: SessionScopeType;
  organizationIds: string[];
  defaultNav: SessionDefaultNav;
};

type SeedAccount = SessionUser & { password: string };

export const SESSION_COOKIE_NAME = "zample_session";
export const SESSION_USER_COOKIE_NAME = "zample_user";

const seedAccounts: SeedAccount[] = [
  {
    email: "sales@zample.app",
    password: process.env.ZAMPLE_SALES_PASSWORD || "ZampleSales!2026",
    fullName: "Sasha Cole",
    role: "Vendor Sales Rep",
    roleKey: "vendor_sales_rep",
    scopeType: "vendor",
    organizationIds: ["org_vendor_flavorworks_labs"],
    defaultNav: "inbox"
  },
  {
    email: "rd@zample.app",
    password: process.env.ZAMPLE_RD_PASSWORD || "ZampleRD!2026",
    fullName: "Riley Park",
    role: "R&D Specialist (Demand Company)",
    roleKey: "rd_specialist",
    scopeType: "demand",
    organizationIds: ["org_demand_northstar_foods"],
    defaultNav: "my_launches"
  },
  {
    email: "admin@zample.app",
    password: process.env.ZAMPLE_ADMIN_PASSWORD || "ZampleAdmin!2026",
    fullName: "Alex Morgan",
    role: "Marketplace Admin",
    roleKey: "marketplace_admin",
    scopeType: "admin",
    organizationIds: ["org_marketplace_zample"],
    defaultNav: "my_launches"
  }
];

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeSessionUser(input: Partial<SessionUser> | null | undefined): SessionUser | null {
  if (!input) {
    return null;
  }

  const rawRoleKey = String((input as { roleKey?: string }).roleKey || "");
  const roleKey =
    rawRoleKey === "vendor_sales_rep"
      ? "vendor_sales_rep"
      : rawRoleKey === "sales_account_manager"
        ? "vendor_sales_rep"
        : rawRoleKey === "rd_specialist"
          ? "rd_specialist"
          : rawRoleKey === "marketplace_admin" || rawRoleKey === "admin"
            ? "marketplace_admin"
            : null;
  const defaultNav = input.defaultNav === "inbox" || input.defaultNav === "my_launches" ? input.defaultNav : null;
  const scopeType =
    input.scopeType === "vendor" || input.scopeType === "demand" || input.scopeType === "admin"
      ? input.scopeType
      : roleKey === "vendor_sales_rep"
        ? "vendor"
        : roleKey === "rd_specialist"
          ? "demand"
          : roleKey === "marketplace_admin"
            ? "admin"
            : null;
  const parsedOrganizationIds = Array.isArray((input as { organizationIds?: unknown }).organizationIds)
    ? (input as { organizationIds: unknown[] }).organizationIds
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];
  const fallbackOrganizationIds =
    roleKey === "vendor_sales_rep"
      ? ["org_vendor_flavorworks_labs"]
      : roleKey === "rd_specialist"
        ? ["org_demand_northstar_foods"]
        : ["org_marketplace_zample"];
  const organizationIds = parsedOrganizationIds.length ? parsedOrganizationIds : fallbackOrganizationIds;
  const email = normalizeEmail(String(input.email || ""));
  const fullName = String(input.fullName || "").trim();
  const role = String(input.role || "").trim();

  if (!roleKey || !defaultNav || !scopeType || !email || !fullName || !role) {
    return null;
  }

  return {
    email,
    fullName,
    role,
    roleKey,
    scopeType,
    organizationIds,
    defaultNav
  };
}

export function authenticateSeedUser(email: string, password: string): SessionUser | null {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "").trim();

  const matched = seedAccounts.find(
    (account) => normalizeEmail(account.email) === normalizedEmail && account.password === normalizedPassword
  );

  if (!matched) {
    return null;
  }

  return sanitizeSessionUser(matched);
}

export function encodeSessionUser(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64");
}

export function decodeSessionUser(serialized: string | null | undefined): SessionUser | null {
  if (!serialized) {
    return null;
  }

  try {
    const json = Buffer.from(serialized, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<SessionUser>;
    return sanitizeSessionUser(parsed);
  } catch {
    return null;
  }
}

export function getSeedAccountSummaries() {
  return seedAccounts.map((account) => ({
    email: account.email,
    role: account.role,
    password: account.password
  }));
}
