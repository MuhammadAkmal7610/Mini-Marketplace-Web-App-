export type UserRole = 'buyer' | 'seller' | 'admin';
export type OrderStatus = 'New' | 'Confirmed' | 'Shipped' | 'Delivered';
export type PriceOption = { label: string; extraPrice: number };
export type ColorOption = { name: string; hex: string };
export type Product = {
  id: string; title: string; basePrice: number; compareAtPrice: number; description: string;
  category: string; images: string[]; status: 'pending' | 'approved' | 'hidden'; sellerName: string;
  options: { colors: ColorOption[]; sizes: PriceOption[]; storage: PriceOption[]; headboards: PriceOption[]; bases: PriceOption[]; assemblyPrice: number };
};
export type User = { id: string; name: string; email: string; role: UserRole; status: 'pending' | 'approved' | 'hidden' };
export type SelectedOptions = { color: string; size: string; storage: string; headboard: string; base: string; assembly: boolean };
export type CartLine = SelectedOptions & { key: string; productId: string; productTitle: string; image: string; quantity: number; unitPrice: number };
export type OrderItem = SelectedOptions & { productId: string; productTitle: string; quantity: number; unitPrice: number };
export type Order = { id: string; buyerName: string; buyerEmail: string; address: string; status: OrderStatus; createdAt: string; total: number; items: OrderItem[] };

export function calculatePrice(product: Product, selected: SelectedOptions) {
  const extra = (options: PriceOption[], label: string) => options.find((option) => option.label === label)?.extraPrice ?? 0;
  return Number((product.basePrice + extra(product.options.sizes, selected.size) + extra(product.options.storage, selected.storage) + extra(product.options.headboards, selected.headboard) + extra(product.options.bases, selected.base) + (selected.assembly ? product.options.assemblyPrice : 0)).toFixed(2));
}
export function formatPrice(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}
export function cartLineKey(productId: string, selected: SelectedOptions) {
  return JSON.stringify([productId, ...Object.values(selected)]);
}
