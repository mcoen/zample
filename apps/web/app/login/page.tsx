import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authenticateSeedUser,
  encodeSessionUser,
  getSeedAccountSummaries,
  SESSION_COOKIE_NAME,
  SESSION_USER_COOKIE_NAME
} from "@/lib/auth";
import styles from "./page.module.css";

function sanitizeNextPath(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname === "/logout") {
    return "/launches";
  }

  return pathname;
}

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const nextPath = sanitizeNextPath(String(formData.get("next") || "/launches"));

  if (!email || !password) {
    redirect(`/login?error=missing_credentials&next=${encodeURIComponent(nextPath)}`);
  }

  const sessionUser = authenticateSeedUser(email, password);

  if (!sessionUser) {
    redirect(`/login?error=invalid_credentials&next=${encodeURIComponent(nextPath)}`);
  }

  cookies().set(SESSION_COOKIE_NAME, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12
  });
  cookies().set(SESSION_USER_COOKIE_NAME, encodeSessionUser(sessionUser), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12
  });

  redirect(nextPath);
}

export default function LoginPage({
  searchParams
}: {
  searchParams?: { next?: string; error?: string };
}) {
  const nextPath = sanitizeNextPath(String(searchParams?.next || "/launches"));
  const errorCode = String(searchParams?.error || "");
  const seedAccounts = getSeedAccountSummaries();
  const authErrorMessage =
    errorCode === "invalid_credentials"
      ? "Invalid account or password. Use one of the seeded marketplace role accounts below."
      : errorCode === "missing_credentials"
        ? "Enter both account and password."
        : "";

  return (
    <div className={`${styles.page} app-shell`}>
      <div className={styles.background} />
      <div className={styles.overlay} />

      <main className={styles.centerWrap}>
        <section className={styles.card} aria-label="Zample sign in">
          <div className={styles.brandRow}>
            <img
              src="https://www.michaelcoen.com/images/ZampleLogo.png"
              alt="Zample"
              className={styles.logo}
            />
          </div>

          <div className={styles.copyBlock}>
            <p className={styles.kicker}>Zample Platform</p>
            <h1 className={styles.title}>Sign in to continue</h1>
            <p className={styles.subtitle}>
              Match demand companies launching products with flavor vendors supplying formulations.
            </p>
          </div>

          <form action={loginAction} className={styles.form}>
            <input type="hidden" name="next" value={nextPath} />
            {authErrorMessage ? (
              <p
                style={{
                  margin: "0 0 6px 0",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#b91c1c",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  lineHeight: "1.35"
                }}
              >
                {authErrorMessage}
              </p>
            ) : null}
            <label htmlFor="email" className={styles.label}>
              Account
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              className={styles.input}
            />

            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className={styles.input}
            />

            <div className={styles.rowLinks}>
              <label className={styles.rememberMe}>
                <input type="checkbox" className={styles.checkbox} />
                <span>Keep me signed in</span>
              </label>
              <a href="#" className={styles.link}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className={styles.primaryButton}>
              Continue
              <span aria-hidden="true" className={styles.arrowBadge}>
                <svg viewBox="0 0 24 24" fill="none" className={styles.arrowIcon}>
                  <path d="M5 12H19" />
                  <path d="M13 6L19 12L13 18" />
                </svg>
              </span>
            </button>
          </form>

          <p className={styles.footnote}>
            Need access? Contact your marketplace admin for the right role account.
          </p>
          <div
            style={{
              marginTop: "8px",
              borderTop: "1px solid rgba(148, 163, 184, 0.3)",
              paddingTop: "8px"
            }}
          >
            <p style={{ margin: "0 0 6px 0", fontSize: "11px", color: "#334155", fontWeight: 600 }}>Seeded Marketplace Accounts</p>
            {seedAccounts.map((account) => (
              <p key={account.email} style={{ margin: "0 0 4px 0", fontSize: "11px", color: "#475569" }}>
                {account.role}: {account.email} / {account.password}
              </p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
