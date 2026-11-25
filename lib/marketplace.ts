export type UserRole = "buyer" | "seller" | "admin";
export type ListingStatus = "pending" | "approved" | "hidden";
export type OrderStatus = "New" | "Confirmed" | "Shipped" | "Delivered";

export interface PriceOption {
  label: string;
  extraPrice: number;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface ProductOptions {
  colors: ColorOption[];
  sizes: PriceOption[];
  storage: PriceOption[];
  headboards: PriceOption[];
  bases: PriceOption[];
  assemblyPrice: number;
}

export interface Product {
  id: string;
  title: string;
  basePrice: number;
  compareAtPrice: number;
  description: string;
  category: string;
  images: string[];
  options: ProductOptions;
  status: ListingStatus;
  sellerName: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "pending" | "approved" | "hidden";
}

export interface SelectedOptions {
  color: string;
  size: string;
  storage: string;
  headboard: string;
  base: string;
  assembly: boolean;
}

export interface CartLine extends SelectedOptions {
  key: string;
  productId: string;
  productTitle: string;
  image: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderItem extends SelectedOptions {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  buyerName: string;
  buyerEmail: string;
  address: string;
  status: OrderStatus;
  createdAt: string;
  total: number;
  items: OrderItem[];
}

export const DIVAN_CATEGORY = "Furniture > Divan Beds";

export const seedOptions: ProductOptions = {
  colors: [
    { name: "Cream Naples", hex: "#e9e2d4" },
    { name: "Beige Naples", hex: "#c9b9a2" },
    { name: "Silver Naples", hex: "#c4c6c5" },
    { name: "Grey Naples", hex: "#858582" },
    { name: "Charcoal Naples", hex: "#4b4a49" },
    { name: "Black Naples", hex: "#272626" },
    { name: "Brown Naples", hex: "#755d4d" },
    { name: "Blue Naples", hex: "#657783" },
  ],
  sizes: [
    { label: "Small Single 2FT6", extraPrice: 90 },
    { label: "Single 3FT", extraPrice: 95 },
    { label: "Small Double 4FT", extraPrice: 100 },
    { label: "Double 4FT6", extraPrice: 110 },
    { label: "King 5FT", extraPrice: 125 },
    { label: "Super King 6FT", extraPrice: 150 },
  ],
  storage: [
    { label: "No Storage", extraPrice: 0 },
    { label: "2 Drawers Left Side", extraPrice: 50 },
    { label: "2 Drawers Right Side", extraPrice: 45 },
    { label: "2 Drawers Foot End", extraPrice: 155 },
    { label: "4 Drawers", extraPrice: 210 },
  ],
  headboards: [
    { label: 'FREE 26" Headboard', extraPrice: 0 },
    { label: '54" Floor Standing Headboard', extraPrice: 10 },
  ],
  bases: [
    { label: "Standard Base (holds 50 stone)", extraPrice: 0 },
    { label: "Reinforced Base (holds 100 stone)", extraPrice: 25 },
  ],
  assemblyPrice: 39.99,
};

export const seedProduct = {
  id: "prague-divan-bed",
  title: "Prague Divan Bed",
  basePrice: 269.99,
  compareAtPrice: 539.98,
  description:
    "A softly upholstered divan bed with a clean, tailored finish. Choose your fabric colour, size, storage, headboard and base to make it yours.",
  category: DIVAN_CATEGORY,
  images: [
    "/images/divan-front.svg",
    "/images/divan-angle.svg",
    "/images/divan-detail.svg",
    "/images/divan-storage.svg",
    "/images/divan-room.svg",
  ],
  options: seedOptions,
};

export function calculatePrice(
  product: Product,
  selected: SelectedOptions,
): number {
  const findExtra = (options: PriceOption[], label: string) =>
    options.find((option) => option.label === label)?.extraPrice ?? 0;
  const assembly = selected.assembly ? product.options.assemblyPrice : 0;

  return Number(
    (
      product.basePrice +
      findExtra(product.options.sizes, selected.size) +
      findExtra(product.options.storage, selected.storage) +
      findExtra(product.options.headboards, selected.headboard) +
      findExtra(product.options.bases, selected.base) +
      assembly
    ).toFixed(2),
  );
}

export function cartLineKey(
  productId: string,
  selected: SelectedOptions,
): string {
  return JSON.stringify([productId, ...Object.values(selected)]);
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}
