import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
    redirect("/login");
  }

  cookies().set("zample_session", "active", {
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
  searchParams?: { next?: string };
}) {
  const nextPath = sanitizeNextPath(String(searchParams?.next || "/launches"));

  return (
    <div className={styles.page}>
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
              Launch food and beverage products with a shared workspace for your team.
            </p>
          </div>

          <form action={loginAction} className={styles.form}>
            <input type="hidden" name="next" value={nextPath} />
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
            Need access? Contact your workspace admin to invite you to the correct launch workspace.
          </p>
        </section>
      </main>
    </div>
  );
}
