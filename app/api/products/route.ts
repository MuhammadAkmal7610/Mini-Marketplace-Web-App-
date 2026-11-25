import { randomUUID } from "node:crypto";
import {
  claimUnownedProduct,
  getProduct,
  getProductOwner,
  listProducts,
  saveProduct,
} from "@/lib/database";
import { getRequestUser, isRecord } from "@/lib/api-auth";
import {
  DIVAN_CATEGORY,
  type ColorOption,
  type PriceOption,
  type ProductOptions,
} from "@/lib/marketplace";

function isPriceOption(value: unknown): value is PriceOption {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    value.label.trim().length > 0 &&
    value.label.length <= 100 &&
    typeof value.extraPrice === "number" &&
    Number.isFinite(value.extraPrice) &&
    value.extraPrice >= 0
  );
}

function isColorOption(value: unknown): value is ColorOption {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= 80 &&
    typeof value.hex === "string" &&
    /^#[0-9a-f]{6}$/i.test(value.hex)
  );
}

function isProductOptions(value: unknown): value is ProductOptions {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.colors) &&
    value.colors.length > 0 &&
    value.colors.length <= 16 &&
    value.colors.every(isColorOption) &&
    Array.isArray(value.sizes) &&
    value.sizes.length > 0 &&
    value.sizes.length <= 20 &&
    value.sizes.every(isPriceOption) &&
    Array.isArray(value.storage) &&
    value.storage.length > 0 &&
    value.storage.length <= 20 &&
    value.storage.every(isPriceOption) &&
    Array.isArray(value.headboards) &&
    value.headboards.length > 0 &&
    value.headboards.length <= 20 &&
    value.headboards.every(isPriceOption) &&
    Array.isArray(value.bases) &&
    value.bases.length > 0 &&
    value.bases.length <= 20 &&
    value.bases.every(isPriceOption) &&
    typeof value.assemblyPrice === "number" &&
    Number.isFinite(value.assemblyPrice) &&
    value.assemblyPrice >= 0
  );
}

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const user = await getRequestUser(request);
  if (parameters.get("mine") === "1") {
    if (!user || (user.role !== "seller" && user.role !== "admin")) {
      return Response.json({ error: "Sign in as a seller to manage listings." }, { status: 401 });
    }
    return Response.json({ products: await listProducts({ sellerId: user.id }) });
  }
  if (parameters.get("all") === "1") {
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access is required." }, { status: 403 });
    }
    return Response.json({ products: await listProducts({ all: true }) });
  }

  let products = await listProducts();
  const query = parameters.get("q")?.trim().toLowerCase();
  const color = parameters.get("color")?.toLowerCase();
  const size = parameters.get("size")?.toLowerCase();
  const category = parameters.get("category");
  const minPrice = Number(parameters.get("minPrice") ?? 0);
  const maxPrice = Number(parameters.get("maxPrice") ?? Number.MAX_SAFE_INTEGER);
  if (query) {
    products = products.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query),
    );
  }
  if (color) {
    products = products.filter((product) =>
      product.options.colors.some((option) => option.name.toLowerCase().includes(color)),
    );
  }
  if (size) {
    products = products.filter((product) =>
      product.options.sizes.some((option) => option.label.toLowerCase().includes(size)),
    );
  }
  if (category) products = products.filter((product) => product.category === category);
  if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
    products = products.filter(
      (product) => product.basePrice >= minPrice && product.basePrice <= maxPrice,
    );
  }
  return Response.json({ products });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user || user.role !== "seller") {
    return Response.json({ error: "Sign in with a seller account to save products." }, { status: 401 });
  }
  if (user.status !== "approved") {
    return Response.json({ error: "Your seller account needs admin approval before listing products." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please send valid JSON." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "A product is required." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const basePrice = body.basePrice;
  const compareAtPrice = body.compareAtPrice;
  const images = body.images;
  const options = body.options;
  const id = typeof body.id === "string" ? body.id : randomUUID();
  if (
    title.length < 3 ||
    title.length > 120 ||
    description.length > 4000 ||
    typeof basePrice !== "number" ||
    !Number.isFinite(basePrice) ||
    basePrice < 0 ||
    typeof compareAtPrice !== "number" ||
    !Number.isFinite(compareAtPrice) ||
    compareAtPrice < basePrice ||
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > 8 ||
    !images.every(
      (image) =>
        typeof image === "string" &&
        image.length <= 1_500_000 &&
        (image.startsWith("/") || image.startsWith("data:image/")),
    ) ||
    !isProductOptions(options)
  ) {
    return Response.json(
      { error: "Check the product title, prices, photos, and variation options." },
      { status: 400 },
    );
  }

  const current = await getProduct(id);
  const ownerId = await getProductOwner(id);
  if (current && !ownerId) {
    const claimed = await claimUnownedProduct(id, user.id, user.name);
    if (!claimed && (await getProductOwner(id)) !== user.id) {
      return Response.json({ error: "Another seller claimed this listing." }, { status: 409 });
    }
  }
  else if (current && ownerId !== user.id) {
    return Response.json({ error: "You can only edit your own listings." }, { status: 403 });
  }

  const product = await saveProduct(
    {
      id,
      title,
      basePrice,
      compareAtPrice,
      description,
      category: DIVAN_CATEGORY,
      images,
      options,
      sellerId: user.id,
      sellerName: user.name,
    },
    current?.status,
  );
  return Response.json({ product }, { status: current ? 200 : 201 });
}
