import {
  createOrder,
  listOrdersForUser,
  getProduct,
  updateOrderStatus,
} from "@/lib/database";
import { getRequestUser, isRecord } from "@/lib/api-auth";
import {
  calculatePrice,
  type OrderItem,
  type OrderStatus,
  type SelectedOptions,
} from "@/lib/marketplace";

const orderStatuses: OrderStatus[] = ["New", "Confirmed", "Shipped", "Delivered"];

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in to view orders." }, { status: 401 });
  if (user.role === "seller" && user.status !== "approved") {
    return Response.json({ error: "Your seller account is awaiting approval." }, { status: 403 });
  }
  return Response.json({ orders: await listOrdersForUser(user) });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "buyer") {
    return Response.json({ error: "Sign in with a buyer account to place an order." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please send valid JSON." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.address !== "string" || body.address.trim().length < 8) {
    return Response.json({ error: "Enter a complete delivery address." }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return Response.json({ error: "Your basket is empty or contains too many items." }, { status: 400 });
  }

  const items: OrderItem[] = [];
  for (const rawItem of body.items) {
    if (!isRecord(rawItem) || typeof rawItem.productId !== "string") {
      return Response.json({ error: "A basket item is invalid." }, { status: 400 });
    }
    const product = await getProduct(rawItem.productId);
    if (!product || product.status !== "approved") {
      return Response.json({ error: "A product in your basket is no longer available." }, { status: 409 });
    }
    const color = rawItem.color;
    const size = rawItem.size;
    const storage = rawItem.storage;
    const headboard = rawItem.headboard;
    const base = rawItem.base;
    const assembly = rawItem.assembly;
    if (
      typeof color !== "string" ||
      typeof size !== "string" ||
      typeof storage !== "string" ||
      typeof headboard !== "string" ||
      typeof base !== "string" ||
      typeof assembly !== "boolean" ||
      typeof rawItem.quantity !== "number" ||
      !Number.isInteger(rawItem.quantity) ||
      rawItem.quantity < 1 ||
      rawItem.quantity > 10
    ) {
      return Response.json({ error: "A basket variation is no longer available." }, { status: 409 });
    }

    const selected: SelectedOptions = { color, size, storage, headboard, base, assembly };
    if (
      !product.options.colors.some((option) => option.name === color) ||
      !product.options.sizes.some((option) => option.label === size) ||
      !product.options.storage.some((option) => option.label === storage) ||
      !product.options.headboards.some((option) => option.label === headboard) ||
      !product.options.bases.some((option) => option.label === base)
    ) {
      return Response.json({ error: "A basket variation is no longer available." }, { status: 409 });
    }

    items.push({
      productId: product.id,
      productTitle: product.title,
      ...selected,
      quantity: rawItem.quantity,
      unitPrice: calculatePrice(product, selected),
    });
  }

  const total = Number(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
  );
  const order = await createOrder({
    buyerId: user.id,
    buyerName: user.name,
    buyerEmail: user.email,
    address: body.address.trim().slice(0, 500),
    total,
    items,
  });
  return Response.json({ order }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getRequestUser(request);
  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return Response.json({ error: "Seller or admin access is required." }, { status: 403 });
  }
  if (user.role === "seller" && user.status !== "approved") {
    return Response.json({ error: "Your seller account is awaiting approval." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please send valid JSON." }, { status: 400 });
  }
  if (
    !isRecord(body) ||
    typeof body.id !== "string" ||
    typeof body.status !== "string" ||
    !orderStatuses.includes(body.status as OrderStatus)
  ) {
    return Response.json({ error: "A valid order and status are required." }, { status: 400 });
  }
  const updated = await updateOrderStatus(body.id, body.status as OrderStatus, user);
  if (!updated) return Response.json({ error: "Order not found for this seller." }, { status: 404 });
  return Response.json({ ok: true });
}
