import {
  listProducts,
  listUsers,
  updateProductStatus,
  updateUserStatus,
} from "@/lib/database";
import { getRequestUser, isRecord } from "@/lib/api-auth";
import type { ListingStatus } from "@/lib/marketplace";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access is required." }, { status: 403 });
  }
  const [users, products] = await Promise.all([
    listUsers(),
    listProducts({ all: true }),
  ]);
  return Response.json({ users, products });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin access is required." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please send valid JSON." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.id !== "string") {
    return Response.json({ error: "A listing or seller is required." }, { status: 400 });
  }

  if (body.type === "seller" && ["pending", "approved", "hidden"].includes(String(body.status))) {
    const updated = await updateUserStatus(
      body.id,
      body.status as "pending" | "approved" | "hidden",
    );
    if (!updated) return Response.json({ error: "Seller account not found." }, { status: 404 });
    return Response.json({ ok: true });
  }
  if (
    body.type === "product" &&
    ["pending", "approved", "hidden"].includes(String(body.status))
  ) {
    const updated = await updateProductStatus(body.id, body.status as ListingStatus);
    if (!updated) return Response.json({ error: "Product not found." }, { status: 404 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "The requested moderation action is invalid." }, { status: 400 });
}
