import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  DIVAN_CATEGORY,
  seedProduct,
  type ListingStatus,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Product,
  type ProductOptions,
  type User,
  type UserRole,
} from "@/lib/marketplace";
import { assertSupabaseResult, getSupabaseClient } from "@/lib/supabase";

type SupabaseUserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: User["status"];
};

type SupabaseProductRow = {
  id: string;
  seller_id: string | null;
  seller_name: string;
  title: string;
  base_price: number;
  compare_at_price: number;
  description: string;
  category: string;
  images: string[];
  options: ProductOptions;
  status: ListingStatus;
};

type SupabaseOrderRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  address: string;
  status: OrderStatus;
  created_at: string;
  total: number;
  items: OrderItem[];
};

function readSupabaseUser(row: SupabaseUserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

function readSupabaseProduct(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    basePrice: Number(row.base_price),
    compareAtPrice: Number(row.compare_at_price),
    description: row.description,
    category: row.category,
    images: row.images,
    options: row.options,
    status: row.status,
    sellerName: row.seller_name,
  };
}

function readSupabaseOrder(row: SupabaseOrderRow): Order {
  return {
    id: row.id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
    total: Number(row.total),
    items: row.items,
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createAdminAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const id = randomBytes(16).toString("hex");
  const supabase = getSupabaseClient();
  {
    const existingResult = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if ((assertSupabaseResult(existingResult) ?? []).length > 0) {
      throw new Error("An admin account has already been set up.");
    }
    const result = await supabase
      .from("users")
      .insert({
        id,
        name: input.name,
        email: input.email,
        password_hash: hashPassword(input.password),
        role: "admin",
        status: "approved",
      })
      .select("id, name, email, role, status")
      .single();
    const row = assertSupabaseResult(result) as Omit<SupabaseUserRow, "password_hash">;
    return readSupabaseUser({ ...row, password_hash: "" });
  }

}

export function hashSession(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function findUserByEmail(
  email: string,
): Promise<(User & { passwordHash: string }) | null> {
  const supabase = getSupabaseClient();
  {
    const result = await supabase
      .from("users")
      .select("id, name, email, password_hash, role, status")
      .eq("email", email)
      .maybeSingle();
    const row = assertSupabaseResult(result) as SupabaseUserRow | null;
    return row
      ? { ...readSupabaseUser(row), passwordHash: row.password_hash }
      : null;
  }
}

export async function findUserBySession(token: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  {
    const now = new Date().toISOString();
    const sessionResult = await supabase
      .from("sessions")
      .select("user_id")
      .eq("token_hash", hashSession(token))
      .gt("expires_at", now)
      .maybeSingle();
    const session = assertSupabaseResult(sessionResult) as { user_id: string } | null;
    if (!session) return null;
    const userResult = await supabase
      .from("users")
      .select("id, name, email, role, status")
      .eq("id", session.user_id)
      .maybeSingle();
    const row = assertSupabaseResult(userResult) as Omit<SupabaseUserRow, "password_hash"> | null;
    return row ? readSupabaseUser({ ...row, password_hash: "" }) : null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const supabase = getSupabaseClient();
  {
    const result = await supabase.from("sessions").insert({
      token_hash: hashSession(token),
      user_id: userId,
      expires_at: expiresAt,
    });
    assertSupabaseResult(result);
    return token;
  }
}

export async function deleteSession(token: string): Promise<void> {
  const supabase = getSupabaseClient();
  {
    const result = await supabase
      .from("sessions")
      .delete()
      .eq("token_hash", hashSession(token));
    assertSupabaseResult(result);
    return;
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "buyer" | "seller";
}): Promise<User> {
  const id = randomBytes(16).toString("hex");
  const status = input.role === "seller" ? "pending" : "approved";
  const supabase = getSupabaseClient();
  {
    const userResult = await supabase
      .from("users")
      .insert({
        id,
        name: input.name,
        email: input.email,
        password_hash: hashPassword(input.password),
        role: input.role,
        status,
      })
      .select("id, name, email, role, status")
      .single();
    const user = assertSupabaseResult(userResult) as Omit<SupabaseUserRow, "password_hash">;
    if (input.role === "seller") {
      const claimResult = await supabase
        .from("products")
        .update({ seller_id: id, seller_name: input.name })
        .eq("id", seedProduct.id)
        .is("seller_id", null);
      assertSupabaseResult(claimResult);
    }
    return readSupabaseUser({ ...user, password_hash: "" });
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = getSupabaseClient();
  {
    const result = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    const row = assertSupabaseResult(result) as SupabaseProductRow | null;
    return row ? readSupabaseProduct(row) : null;
  }
}

export async function claimUnownedProduct(
  id: string,
  sellerId: string,
  sellerName: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  {
    return await supabase
      .from("products")
      .update({ seller_id: sellerId, seller_name: sellerName })
      .eq("id", id)
      .is("seller_id", null)
      .select("id")
      .then((result) => (assertSupabaseResult(result) ?? []).length > 0);
  }
}

export async function getProductOwner(id: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  {
    const result = await supabase
      .from("products")
      .select("seller_id")
      .eq("id", id)
      .maybeSingle();
    const row = assertSupabaseResult(result) as { seller_id: string | null } | null;
    return row?.seller_id ?? null;
  }
}

export async function listProducts(
  options: { all?: boolean; sellerId?: string } = {},
): Promise<Product[]> {
  const supabase = getSupabaseClient();
  {
    let query = supabase.from("products").select("*").order("title");
    if (options.sellerId) query = query.eq("seller_id", options.sellerId);
    else if (!options.all) query = query.eq("status", "approved");
    const result = await query;
    const rows = assertSupabaseResult(result) as SupabaseProductRow[];
    return rows.map(readSupabaseProduct);
  }
}

async function storeProductImages(
  sellerId: string,
  productId: string,
  images: string[],
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const stored: string[] = [];

  for (const [index, image] of images.entries()) {
    if (!image.startsWith("data:image/")) {
      stored.push(image);
      continue;
    }

    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image);
    if (!match) throw new Error("An uploaded product image has an unsupported format.");
    const contentType = match[1];
    const bytes = Buffer.from(match[2], "base64");
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.slice(6);
    const filePath = `${sellerId}/${productId}/${index}.${extension}`;
    const uploadResult = await supabase.storage
      .from("product-images")
      .upload(filePath, bytes, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });
    assertSupabaseResult(uploadResult);
    stored.push(
      supabase.storage.from("product-images").getPublicUrl(filePath).data.publicUrl,
    );
  }

  return stored;
}

export async function saveProduct(
  input: Omit<Product, "status" | "sellerName"> & { sellerId: string; sellerName: string },
  existingStatus?: ListingStatus,
): Promise<Product> {
  const supabase = getSupabaseClient();
  {
    const images = await storeProductImages(input.sellerId, input.id, input.images);
    const values = {
      seller_id: input.sellerId,
      seller_name: input.sellerName,
      title: input.title,
      base_price: input.basePrice,
      compare_at_price: input.compareAtPrice,
      description: input.description,
      category: input.category,
      images,
      options: input.options,
      status: existingStatus ?? "pending",
    };
    const result = existingStatus
      ? await supabase
          .from("products")
          .update(values)
          .eq("id", input.id)
          .eq("seller_id", input.sellerId)
          .select("*")
          .maybeSingle()
      : await supabase
          .from("products")
          .insert({ id: input.id, ...values })
          .select("*")
          .single();
    const row = assertSupabaseResult(result) as SupabaseProductRow | null;
    if (!row) throw new Error("Product could not be saved for this seller.");
    return readSupabaseProduct(row);
  }
}

export async function listUsers(): Promise<User[]> {
  const supabase = getSupabaseClient();
  {
    const result = await supabase
      .from("users")
      .select("id, name, email, role, status")
      .order("role")
      .order("name");
    const rows = assertSupabaseResult(result) as Omit<SupabaseUserRow, "password_hash">[];
    return rows.map((row) => readSupabaseUser({ ...row, password_hash: "" }));
  }
}

export async function updateUserStatus(
  id: string,
  status: "pending" | "approved" | "hidden",
): Promise<boolean> {
  const supabase = getSupabaseClient();
  {
    return await supabase
      .from("users")
      .update({ status })
      .eq("id", id)
      .eq("role", "seller")
      .select("id")
      .then((result) => (assertSupabaseResult(result) ?? []).length > 0);
  }
}

export async function updateProductStatus(
  id: string,
  status: ListingStatus,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  {
    const result = await supabase
      .from("products")
      .update({ status })
      .eq("id", id)
      .select("id");
    return (assertSupabaseResult(result) ?? []).length > 0;
  }
}

export async function createOrder(input: {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  address: string;
  total: number;
  items: OrderItem[];
}): Promise<Order> {
  const id = randomBytes(12).toString("hex");
  const createdAt = new Date().toISOString();
  const supabase = getSupabaseClient();
  {
    const result = await supabase
      .from("orders")
      .insert({
        id,
        buyer_id: input.buyerId,
        buyer_name: input.buyerName,
        buyer_email: input.buyerEmail,
        address: input.address,
        status: "New",
        created_at: createdAt,
        total: input.total,
        items: input.items,
      })
      .select(
        "id, buyer_name, buyer_email, address, status, created_at, total, items",
      )
      .single();
    const row = assertSupabaseResult(result) as SupabaseOrderRow;
    return readSupabaseOrder(row);
  }
}

export async function listOrdersForUser(user: User): Promise<Order[]> {
  const supabase = getSupabaseClient();
  {
    let query = supabase
      .from("orders")
      .select("id, buyer_name, buyer_email, address, status, created_at, total, items")
      .order("created_at", { ascending: false });
    if (user.role === "buyer") query = query.eq("buyer_id", user.id);
    const result = await query;
    const rows = assertSupabaseResult(result) as SupabaseOrderRow[];
    if (user.role !== "seller") return rows.map(readSupabaseOrder);
    const productsResult = await supabase
      .from("products")
      .select("id")
      .eq("seller_id", user.id);
    const productRows = assertSupabaseResult(productsResult) as { id: string }[];
    const productIds = new Set(productRows.map((row) => row.id));
    return rows
      .map((row) => ({
        ...row,
        items: row.items.filter((item) => productIds.has(item.productId)),
      }))
      .filter((row) => row.items.length > 0)
      .map(readSupabaseOrder);
  }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  user: User,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  {
    return (async () => {
      if (user.role !== "admin") {
        const orderResult = await supabase
          .from("orders")
          .select("items")
          .eq("id", id)
          .maybeSingle();
        const order = assertSupabaseResult(orderResult) as {
          items: OrderItem[];
        } | null;
        if (!order) return false;
        const productIds = new Set(
          order.items.map((item) => item.productId),
        );
        const productsResult = await supabase
          .from("products")
          .select("id")
          .eq("seller_id", user.id);
        const products = assertSupabaseResult(productsResult) as { id: string }[];
        if (!products.some((product) => productIds.has(product.id))) return false;
      }

      const updateResult = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select("id");
      return (assertSupabaseResult(updateResult) ?? []).length > 0;
    })();
  }
}
