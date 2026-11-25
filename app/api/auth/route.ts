import { timingSafeEqual } from "node:crypto";
import {
  createAdminAccount,
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  verifyPassword,
} from "@/lib/database";
import {
  expiredSessionCookie,
  getRequestUser,
  isRecord,
  sessionCookie,
} from "@/lib/api-auth";

export async function GET(request: Request) {
  return Response.json({ user: await getRequestUser(request) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please send valid JSON." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.action !== "string") {
    return Response.json({ error: "A valid account action is required." }, { status: 400 });
  }

  if (body.action === "logout") {
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("marketplace_session="));
    if (cookie) await deleteSession(decodeURIComponent(cookie.split("=")[1] ?? ""));
    return Response.json({ user: null }, { headers: { "Set-Cookie": expiredSessionCookie() } });
  }

  if (body.action === "login") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const account = await findUserByEmail(email);
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return Response.json({ error: "Email or password is not correct." }, { status: 401 });
    }
    if (account.status === "hidden") {
      return Response.json({ error: "This account has been disabled." }, { status: 403 });
    }
    const token = await createSession(account.id);
    return Response.json(
      {
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
          status: account.status,
        },
      },
      { headers: { "Set-Cookie": sessionCookie(token) } },
    );
  }

  if (body.action === "signup") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role;
    if (
      name.length < 2 ||
      name.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 8 ||
      (role !== "buyer" && role !== "seller")
    ) {
      return Response.json(
        { error: "Enter a name, valid email, password (8+ characters), and account type." },
        { status: 400 },
      );
    }
    try {
      const user = await createUser({ name, email, password, role });
      const token = await createSession(user.id);
      return Response.json(
        { user, message: role === "seller" ? "Your seller account is awaiting approval." : undefined },
        { status: 201, headers: { "Set-Cookie": sessionCookie(token) } },
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("UNIQUE constraint failed") ||
          error.message.includes("duplicate key value"))
      ) {
        return Response.json({ error: "An account with that email already exists." }, { status: 409 });
      }
      throw error;
    }
  }

  if (body.action === "bootstrap-admin") {
    const secret = process.env.MARKETPLACE_ADMIN_BOOTSTRAP_TOKEN;
    const token = typeof body.token === "string" ? body.token : "";
    if (
      !secret ||
      Buffer.byteLength(token) !== Buffer.byteLength(secret) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
    ) {
      return Response.json({ error: "Admin setup is not enabled or the token is invalid." }, { status: 403 });
    }
    if (await getRequestUser(request)) {
      return Response.json({ error: "Sign out before setting up the admin account." }, { status: 409 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (
      name.length < 2 ||
      name.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12
    ) {
      return Response.json(
        { error: "Enter a name, valid email, and password with at least 12 characters." },
        { status: 400 },
      );
    }

    try {
      const user = await createAdminAccount({ name, email, password });
      const session = await createSession(user.id);
      return Response.json(
        { user },
        { status: 201, headers: { "Set-Cookie": sessionCookie(session) } },
      );
    } catch (reason) {
      if (reason instanceof Error && reason.message.includes("already been set up")) {
        return Response.json({ error: reason.message }, { status: 409 });
      }
      if (
        reason instanceof Error &&
        (reason.message.includes("UNIQUE constraint failed") ||
          reason.message.includes("duplicate key value"))
      ) {
        return Response.json({ error: "An account with that email already exists." }, { status: 409 });
      }
      throw reason;
    }
  }

  return Response.json({ error: "Unknown account action." }, { status: 400 });
}
