"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  calculatePrice,
  cartLineKey,
  DIVAN_CATEGORY,
  formatPrice,
  type CartLine,
  type ColorOption,
  type Order,
  type OrderStatus,
  type PriceOption,
  type Product,
  type SelectedOptions,
  type User,
} from "@/lib/marketplace";

type View = "shop" | "detail" | "cart" | "seller" | "orders" | "admin";

interface ApiError {
  error?: string;
}

async function requestJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = await response.text();
  let result: (T & ApiError) | null = null;
  if (body) {
    try {
      result = JSON.parse(body) as T & ApiError;
    } catch {
      if (response.ok) throw new Error("The server returned an unreadable response.");
    }
  }
  if (!response.ok) {
    throw new Error(
      result?.error ?? `Request failed (${response.status}). Check the server logs.`,
    );
  }
  if (!result) throw new Error("The server returned an empty response.");
  return result;
}

function Icon({
  name,
  size = 20,
}: {
  name: "bag" | "search" | "user" | "arrow" | "close" | "sparkle" | "heart";
  size?: number;
}) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "bag")
    return (
      <svg {...shared}>
        <path d="M5 8h14l1 13H4L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </svg>
    );
  if (name === "search")
    return (
      <svg {...shared}>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    );
  if (name === "user")
    return (
      <svg {...shared}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...shared}>
        <path d="M4 12h15m-6-6 6 6-6 6" />
      </svg>
    );
  if (name === "close")
    return (
      <svg {...shared}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  if (name === "heart")
    return (
      <svg {...shared}>
        <path d="M20.8 8.6c0 5.3-8.8 10-8.8 10s-8.8-4.7-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z" />
      </svg>
    );
  return (
    <svg {...shared}>
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.6-6.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-10.8 2.1 2.1m6.6 6.6 2.1 2.1" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function BedIllustration({
  color,
  view,
}: {
  color: string;
  view: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const room = view === 4;
  const detail = view === 2;
  return (
    <svg
      className={`bed-art bed-art-${view}`}
      viewBox="0 0 900 690"
      role="img"
      aria-label="Illustration of the upholstered divan bed"
    >
      <defs>
        <linearGradient id={`fabric-${id}`} x2="0.9" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor="#998a7a" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={`wall-${id}`} x2="0" y2="1">
          <stop stopColor="#f4f0e9" />
          <stop offset="1" stopColor="#ebe5dc" />
        </linearGradient>
        <filter id={`shadow-${id}`} x="-30%" y="-30%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <rect width="900" height="690" fill={`url(#wall-${id})`} />
      {room && (
        <>
          <rect x="650" y="95" width="160" height="245" rx="80" fill="#d9e3da" />
          <rect x="675" y="125" width="110" height="185" rx="55" fill="#faf8f3" />
          <path d="M0 515h900v175H0z" fill="#ded5c9" />
          <path d="M60 520h780v18H60z" fill="#c6b9aa" opacity=".55" />
        </>
      )}
      {!room && <path d="M0 550h900v140H0z" fill="#e1d8cc" />}
      <ellipse
        cx="452"
        cy={detail ? 560 : 526}
        rx={detail ? 360 : 320}
        ry="37"
        fill="#716b62"
        opacity=".19"
        filter={`url(#shadow-${id})`}
      />
      {detail ? (
        <>
          <path d="M191 277q0-67 69-67h381q69 0 69 67v221H191V277Z" fill={`url(#fabric-${id})`} />
          <path d="M211 294h479v188H211z" fill="#f2ece3" />
          <path d="M211 425h479v70H211z" fill={color} />
          <path d="M229 437h443v1H229zm0 17h443v1H229zm0 17h443v1H229z" stroke="#fff" strokeOpacity=".22" />
          <path d="M220 297q0-22 25-22h147q25 0 25 22v105H220V297Z" fill="#faf8f3" />
          <path d="M419 297q0-22 25-22h216q25 0 25 22v105H419V297Z" fill="#faf8f3" />
        </>
      ) : (
        <>
          <path d="M274 257q0-48 48-48h256q48 0 48 48v169H274V257Z" fill={`url(#fabric-${id})`} stroke="#a99a88" strokeOpacity=".45" strokeWidth="3" />
          <path d="M294 270q0-23 23-23h99q23 0 23 23v91H294v-91Zm169 0q0-23 23-23h75q23 0 23 23v91H463v-91Z" fill="#faf8f3" />
          <path d="M251 364h398q21 0 21 21v115H230V385q0-21 21-21Z" fill={`url(#fabric-${view})`} stroke="#a99a88" strokeWidth="3" />
          <path d="M230 443h440v63H230z" fill={color} />
          <path d="M250 451h400m-400 17h400m-400 17h400" stroke="#fff" strokeOpacity=".23" />
          <path d="M264 504v23m374-23v23" stroke="#716455" strokeLinecap="round" strokeWidth="12" />
          {view === 1 && <path d="m648 378 78 24v101l-56-20v-98Z" fill="#a99a88" opacity=".34" />}
          {view === 3 && (
            <>
              <rect x="246" y="456" width="188" height="40" rx="6" fill="#ede5d9" stroke="#b6a792" strokeWidth="3" />
              <rect x="456" y="456" width="188" height="40" rx="6" fill="#ede5d9" stroke="#b6a792" strokeWidth="3" />
              <circle cx="340" cy="476" r="4" fill="#8f8172" />
              <circle cx="550" cy="476" r="4" fill="#8f8172" />
            </>
          )}
        </>
      )}
      <path d="M110 550h680" stroke="#c7bcaf" strokeWidth="2" />
    </svg>
  );
}

function ProductPicture({
  src,
  color,
  view,
  className = "",
}: {
  src: string;
  color: string;
  view: number;
  className?: string;
}) {
  if (src.startsWith("/images/divan-")) {
    return <BedIllustration color={color} view={view} />;
  }
  return (
    <div
      className={`uploaded-picture ${className}`}
      role="img"
      aria-label="Product photograph"
      style={{ backgroundImage: `url("${src}")` }}
    />
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-panel${wide ? " modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("shop");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selected, setSelected] = useState<SelectedOptions | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authRole, setAuthRole] = useState<"buyer" | "seller">("buyer");
  const [sellerDraft, setSellerDraft] = useState<Product | null>(null);
  const [sellerStatus, setSellerStatus] = useState("Sign in as a seller to manage your listings.");
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const galleryTrack = useRef<HTMLDivElement>(null);

  const loadProducts = useCallback(async () => {
    const result = await requestJson<{ products: Product[] }>("/api/products");
    setProducts(result.products);
    return result.products;
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      requestJson<{ products: Product[] }>("/api/products"),
      requestJson<{ user: User | null }>("/api/auth"),
    ])
      .then(([productResult, userResult]) => {
        if (!active) return;
        setProducts(productResult.products);
        setUser(userResult.user);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load the shop.");
      });
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem("demo-marketplace-cart");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) setCart(parsed as CartLine[]);
        }
      } catch (reason) {
        console.error("Could not restore the basket.", reason);
        setError("Your saved basket could not be restored.");
      }
      setCartReady(true);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (cartReady) {
      window.localStorage.setItem("demo-marketplace-cart", JSON.stringify(cart));
    }
  }, [cart, cartReady]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const product = products.find((item) => item.id === selectedProductId) ?? null;
  const color =
    product?.options.colors.find((item) => item.name === selected?.color) ??
    product?.options.colors[0];
  const productPrice =
    product && selected ? calculatePrice(product, selected) : 0;
  const cartTotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const minimum = minPrice === "" ? 0 : Number(minPrice);
    const maximum = maxPrice === "" ? Number.MAX_SAFE_INTEGER : Number(maxPrice);
    return products.filter((item) => {
      const matchQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle);
      const matchColor =
        !colorFilter ||
        item.options.colors.some((entry) => entry.name === colorFilter);
      const matchSize =
        !sizeFilter ||
        item.options.sizes.some((entry) => entry.label === sizeFilter);
      return (
        matchQuery &&
        matchColor &&
        matchSize &&
        item.basePrice >= minimum &&
        item.basePrice <= maximum
      );
    });
  }, [products, query, colorFilter, sizeFilter, minPrice, maxPrice]);

  const showError = (reason: unknown) => {
    setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
  };

  const openProduct = (item: Product) => {
    setSelectedProductId(item.id);
    setSelected({
      color: item.options.colors[0]?.name ?? "",
      size: item.options.sizes[0]?.label ?? "",
      storage: item.options.storage[0]?.label ?? "",
      headboard: item.options.headboards[0]?.label ?? "",
      base: item.options.bases[0]?.label ?? "",
      assembly: false,
    });
    setGalleryIndex(0);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeOption = <K extends keyof SelectedOptions>(
    key: K,
    value: SelectedOptions[K],
  ) => {
    setSelected((current) => (current ? { ...current, [key]: value } : current));
  };

  const addToCart = () => {
    if (!product || !selected || !color) return;
    const key = cartLineKey(product.id, selected);
    const line: CartLine = {
      ...selected,
      key,
      productId: product.id,
      productTitle: `${product.title} – ${color.name}`,
      image: product.images[0],
      quantity: 1,
      unitPrice: productPrice,
    };
    setCart((current) => {
      const exists = current.find((item) => item.key === key);
      return exists
        ? current.map((item) =>
            item.key === key ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item,
          )
        : [...current, line];
    });
    setNotice("Added to your basket");
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(10, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const action = authMode === "login" ? "login" : "signup";
      const result = await requestJson<{ user: User; message?: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action,
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role: authRole,
        }),
      });
      setUser(result.user);
      setAuthOpen(false);
      if (result.message) setNotice(result.message);
      else setNotice(`Welcome${result.user.name ? `, ${result.user.name}` : ""}`);
      if (result.user.role === "seller") {
        setView("seller");
        void openSellerPanel();
      }
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setError("");
    try {
      await requestJson("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" }),
      });
      setUser(null);
      setNotice("You have signed out");
      setView("shop");
    } catch (reason) {
      showError(reason);
    }
  };

  const openSellerPanel = async () => {
    setView("seller");
    setError("");
    setSellerStatus("Loading your listing…");
    try {
      const result = await requestJson<{ products: Product[] }>("/api/products?mine=1");
      const own = result.products[0];
      if (own) {
        setSellerDraft(own);
        setSellerStatus(
          own.status === "approved"
            ? "Your listing is live."
            : `Your listing is ${own.status}.`,
        );
        return;
      }
      const starter = products[0];
      if (!starter) {
        setSellerStatus("There are no products to edit yet.");
        return;
      }
      setSellerDraft({ ...starter, id: "", title: "New divan bed", status: "pending" });
      setSellerStatus("Create your first listing. New listings go to admin review.");
    } catch (reason) {
      setSellerDraft(null);
      showError(reason);
      setSellerStatus("Sign in as a seller to manage your listings.");
    }
  };

  const updateDraft = <K extends keyof Product>(
    key: K,
    value: Product[K],
  ) => {
    setSellerDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateOptionList = (
    key: "sizes" | "storage" | "headboards" | "bases",
    index: number,
    field: keyof PriceOption,
    value: string | number,
  ) => {
    setSellerDraft((current) => {
      if (!current) return current;
      const entries = current.options[key].map((option, entryIndex) =>
        entryIndex === index
          ? {
              ...option,
              [field]: field === "extraPrice" ? Math.max(0, Number(value) || 0) : value,
            }
          : option,
      );
      return { ...current, options: { ...current.options, [key]: entries } };
    });
  };

  const updateColor = (
    index: number,
    field: keyof ColorOption,
    value: string,
  ) => {
    setSellerDraft((current) => {
      if (!current) return current;
      const colors = current.options.colors.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry,
      );
      return { ...current, options: { ...current.options, colors } };
    });
  };

  const addPriceOption = (key: "sizes" | "storage" | "headboards" | "bases") => {
    setSellerDraft((current) =>
      current
        ? {
            ...current,
            options: {
              ...current.options,
              [key]: [...current.options[key], { label: "New option", extraPrice: 0 }],
            },
          }
        : current,
    );
  };

  const removePriceOption = (key: "sizes" | "storage" | "headboards" | "bases", index: number) => {
    setSellerDraft((current) =>
      current
        ? {
            ...current,
            options: {
              ...current.options,
              [key]: current.options[key].filter((_, itemIndex) => itemIndex !== index),
            },
          }
        : current,
    );
  };

  const saveListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sellerDraft) return;
    setBusy(true);
    setError("");
    try {
      const result = await requestJson<{ product: Product }>("/api/products", {
        method: "POST",
        body: JSON.stringify(sellerDraft),
      });
      setSellerDraft(result.product);
      setSellerStatus(
        result.product.status === "approved"
          ? "Saved. Your listing is live."
          : "Saved. Your listing is waiting for admin approval.",
      );
      await loadProducts();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const addProductPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!sellerDraft || !event.target.files?.length) return;
    setBusy(true);
    setError("");
    try {
      const additions = await Promise.all(
        Array.from(event.target.files).slice(0, 8 - sellerDraft.images.length).map(resizePhoto),
      );
      updateDraft("images", [...sellerDraft.images, ...additions].slice(0, 8));
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const loadOrders = async () => {
    try {
      const result = await requestJson<{ orders: Order[] }>("/api/orders");
      setOrders(result.orders);
    } catch (reason) {
      showError(reason);
    }
  };

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || user.role !== "buyer") {
      setAuthMode("login");
      setAuthRole("buyer");
      setAuthOpen(true);
      setError("Sign in with a buyer account before placing your order.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestJson<{ order: Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          address: checkoutAddress,
          items: cart.map((item) => ({
            productId: item.productId,
            color: item.color,
            size: item.size,
            storage: item.storage,
            headboard: item.headboard,
            base: item.base,
            assembly: item.assembly,
            quantity: item.quantity,
          })),
        }),
      });
      setCart([]);
      setCheckoutAddress("");
      setCheckoutComplete(true);
      setOrders((current) => [result.order, ...current]);
      setNotice(`Order ${result.order.id.slice(0, 8)} placed`);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const updateOrder = async (id: string, status: OrderStatus) => {
    setError("");
    try {
      await requestJson("/api/orders", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      setOrders((current) =>
        current.map((order) => (order.id === id ? { ...order, status } : order)),
      );
    } catch (reason) {
      showError(reason);
    }
  };

  const loadAdmin = async () => {
    setError("");
    try {
      const result = await requestJson<{ users: User[]; products: Product[] }>("/api/admin");
      setAdminUsers(result.users);
      setAdminProducts(result.products);
    } catch (reason) {
      showError(reason);
    }
  };

  const moderate = async (
    type: "seller" | "product",
    id: string,
    status: "pending" | "approved" | "hidden",
  ) => {
    setError("");
    try {
      await requestJson("/api/admin", {
        method: "POST",
        body: JSON.stringify({ type, id, status }),
      });
      await loadAdmin();
      await loadProducts();
      setNotice("Marketplace status updated");
    } catch (reason) {
      showError(reason);
    }
  };

  const navigate = (next: View) => {
    setError("");
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (next === "seller") void openSellerPanel();
    if (next === "orders") void loadOrders();
    if (next === "admin") void loadAdmin();
    if (next === "cart") setCheckoutComplete(false);
  };

  const title = product
    ? `${product.title} – ${color?.name ?? ""}`.replace(/\s+$/, "")
    : "";
  const selectedSummary = (item: SelectedOptions) =>
    [
      `Colour: ${item.color}`,
      `Size: ${item.size}`,
      `Storage: ${item.storage}`,
      `Headboard: ${item.headboard}`,
      `Base: ${item.base}`,
      `Assembly: ${item.assembly ? "Yes" : "No"}`,
    ].join(" · ");

  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Thoughtful pieces for a softer landing</span>
        <span className="announcement-side">Complimentary delivery on every bed</span>
      </div>

      <header className="site-header">
        <button
          className="wordmark wordmark-button"
          onClick={() => navigate("shop")}
          aria-label="Demo Seller home"
        >
          <span className="wordmark-mark">d</span>
          <span>demo seller<span className="wordmark-period">.</span></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === "shop" || view === "detail" ? "nav-active" : ""} onClick={() => navigate("shop")}>Shop</button>
          <button onClick={() => navigate("shop")}>Our story</button>
          <button onClick={() => navigate("shop")}>Journal</button>
        </nav>
        <div className="header-actions">
          {user ? (
            <div className="account-menu">
              <button className="header-account" onClick={() => setAuthOpen(true)}>
                <Icon name="user" size={19} />
                <span>{user.name.split(" ")[0]}</span>
              </button>
              <div className="account-dropdown">
                {user.role === "buyer" && <button onClick={() => navigate("orders")}>My orders</button>}
                {user.role === "seller" && <button onClick={() => navigate("seller")}>Seller studio</button>}
                {user.role === "admin" && <button onClick={() => navigate("admin")}>Admin</button>}
                <button onClick={() => void signOut()}>Sign out</button>
              </div>
            </div>
          ) : (
            <button className="header-account" onClick={() => setAuthOpen(true)}>
              <Icon name="user" size={19} />
              <span>Account</span>
            </button>
          )}
          <button className="header-bag" onClick={() => navigate("cart")} aria-label={`Basket, ${cart.length} items`}>
            <Icon name="bag" size={20} />
            <span>Basket</span>
            <span className="bag-count">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </button>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button className={view === "shop" || view === "detail" ? "mobile-nav-active" : ""} onClick={() => navigate("shop")}>Shop</button>
          <button className={view === "orders" ? "mobile-nav-active" : ""} onClick={() => navigate("orders")}>Orders</button>
          {user?.role === "seller" && <button className={view === "seller" ? "mobile-nav-active" : ""} onClick={() => navigate("seller")}>Seller studio</button>}
          {user?.role === "admin" && <button className={view === "admin" ? "mobile-nav-active" : ""} onClick={() => navigate("admin")}>Admin</button>}
        </nav>
      </header>

      <main>
        {error && (
          <div className="toast toast-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={17} /></button>
          </div>
        )}
        {notice && <div className="toast toast-success" role="status">{notice}</div>}

        {view === "shop" && (
          <>
            <section className="hero-banner">
              <div className="hero-copy">
                <span className="eyebrow">A little more room to unwind</span>
                <h1>Home, made<br />a little softer.</h1>
                <p>Thoughtful furniture, made for slow mornings and long evenings.</p>
                <button className="button button-dark hero-button" onClick={() => document.getElementById("shop-the-edit")?.scrollIntoView({ behavior: "smooth" })}>
                  Shop the edit <Icon name="arrow" size={18} />
                </button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="hero-sun" />
                <div className="hero-plant"><span /><span /><span /></div>
                <div className="hero-chair"><div /><span /></div>
                <div className="hero-side-table"><span /></div>
                <div className="hero-rug" />
              </div>
              <span className="hero-caption">THE SLOW LIVING COLLECTION · 01</span>
            </section>

            <section className="shop-section page-width" id="shop-the-edit">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">The bedroom edit</span>
                  <h2>Pieces to rest easy in.</h2>
                </div>
                <span className="result-count">{filteredProducts.length} considered piece{filteredProducts.length === 1 ? "" : "s"}</span>
              </div>

              <div className="shop-layout">
                <aside className="filters" aria-label="Product filters">
                  <div className="filter-title">Find your fit <span>⌄</span></div>
                  <label className="search-field">
                    <Icon name="search" size={17} />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search products" />
                  </label>
                  <div className="filter-group">
                    <label className="filter-label" htmlFor="price-min">Price range</label>
                    <div className="price-inputs">
                      <label><span>From £</span><input id="price-min" type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" /></label>
                      <label><span>To £</span><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" /></label>
                    </div>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Colour</span>
                    <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} aria-label="Filter by colour">
                      <option value="">All colours</option>
                      {[...new Set(products.flatMap((item) => item.options.colors.map((entry) => entry.name)))].map((entry) => <option key={entry}>{entry}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Size</span>
                    <select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)} aria-label="Filter by size">
                      <option value="">All sizes</option>
                      {[...new Set(products.flatMap((item) => item.options.sizes.map((entry) => entry.label)))].map((entry) => <option key={entry}>{entry}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Category</span>
                    <button className="category-choice" aria-pressed="true" onClick={() => setQuery("")}><span className="category-dot" />Furniture <small>1</small></button>
                    <button className="category-subchoice" onClick={() => setQuery("divan")}>Divan Beds</button>
                  </div>
                  <div className="filter-note"><Icon name="heart" size={16} /><span>Made for the way you live. Chosen to stay.</span></div>
                </aside>

                <div className="product-grid">
                  {filteredProducts.map((item) => {
                    const firstColor = item.options.colors[0];
                    return (
                      <article className="product-card" key={item.id}>
                        <button className="product-card-image" onClick={() => openProduct(item)} aria-label={`View ${item.title}`}>
                          <span className="sale-badge">50% off</span>
                          <span className="card-heart" aria-hidden="true"><Icon name="heart" size={18} /></span>
                          <ProductPicture src={item.images[0]} color={firstColor?.hex ?? "#e9e2d4"} view={0} />
                          <span className="quick-view">Quick view <Icon name="arrow" size={15} /></span>
                        </button>
                        <div className="product-card-info">
                          <div>
                            <span className="product-category">{item.category.split(">").pop()?.trim()}</span>
                            <button className="product-card-title" onClick={() => openProduct(item)}>{item.title}</button>
                            <div className="product-swatches" aria-label={`${item.options.colors.length} colours`}>
                              {item.options.colors.slice(0, 7).map((entry) => (
                                <span key={entry.name} title={entry.name} style={{ backgroundColor: entry.hex }} />
                              ))}
                              {item.options.colors.length > 7 && <small>+{item.options.colors.length - 7}</small>}
                            </div>
                          </div>
                          <div className="card-prices">
                            <strong>{formatPrice(item.basePrice)}</strong>
                            <del>{formatPrice(item.compareAtPrice)}</del>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {products.length === 0 && !error && <div className="loading-state"><span className="spinner" />Setting the scene…</div>}
                  {products.length > 0 && filteredProducts.length === 0 && (
                    <div className="empty-state"><span className="eyebrow">No pieces found</span><h3>Try a different search.</h3><button className="text-button" onClick={() => { setQuery(""); setColorFilter(""); setSizeFilter(""); setMinPrice(""); setMaxPrice(""); }}>Clear your filters</button></div>
                  )}
                </div>
              </div>
            </section>

            <section className="promise-strip page-width">
              <div><span className="promise-icon">✳</span><span><strong>Thoughtful by design</strong><small>Little details, made to last.</small></span></div>
              <div><span className="promise-icon">⌂</span><span><strong>Made for real homes</strong><small>Comfort that feels like yours.</small></span></div>
              <div><span className="promise-icon">♡</span><span><strong>Here when you need us</strong><small>Friendly help, every step.</small></span></div>
            </section>
          </>
        )}

        {view === "detail" && product && selected && color && (
          <section className="product-detail page-width">
            <button className="back-link" onClick={() => navigate("shop")}>← Back to the bedroom edit</button>
            <div className="detail-grid">
              <div className="gallery-column">
                <div className="gallery-track" ref={galleryTrack} onScroll={(event) => {
                  const width = event.currentTarget.clientWidth;
                  if (width) setGalleryIndex(Math.round(event.currentTarget.scrollLeft / width));
                }}>
                  {product.images.map((image, index) => (
                    <button className="gallery-slide" key={`${image}-${index}`} onClick={() => setZoomOpen(true)} aria-label={`Enlarge product image ${index + 1}`}>
                      <ProductPicture src={image} color={color.hex} view={index} />
                      <span className="zoom-hint">Click to enlarge</span>
                    </button>
                  ))}
                </div>
                <div className="gallery-thumbnails" aria-label="Product image thumbnails">
                  {product.images.map((image, index) => (
                    <button className={`gallery-thumb${galleryIndex === index ? " is-active" : ""}`} key={`${image}-thumb-${index}`} onClick={() => {
                      setGalleryIndex(index);
                      galleryTrack.current?.scrollTo({ left: index * galleryTrack.current.clientWidth, behavior: "smooth" });
                    }} aria-label={`Show product image ${index + 1}`} aria-pressed={galleryIndex === index}>
                      <ProductPicture src={image} color={color.hex} view={index} />
                    </button>
                  ))}
                </div>
                <p className="gallery-caption"><span>01 — 05</span> A closer look at your next favourite place.</p>
              </div>

              <div className="product-options-panel">
                <div className="breadcrumb">Furniture <span>/</span> Divan Beds</div>
                <div className="detail-title-row">
                  <h1>{title}</h1>
                  <span className="sale-badge">50% off</span>
                </div>
                <div className="detail-price-row">
                  <span className="detail-price">{formatPrice(productPrice)}</span>
                  <del>{formatPrice(product.compareAtPrice)}</del>
                  <span className="saving-copy">You save {formatPrice(Math.max(0, product.compareAtPrice - productPrice))}</span>
                </div>
                <div className="review-line"><span className="stars">★★★★★</span><span>Thoughtfully made, lovingly lived in</span></div>
                <p className="detail-description">{product.description}</p>

                <div className="option-block">
                  <div className="option-heading"><strong>Colour:</strong> <span>{color.name}</span></div>
                  <div className="colour-swatches">
                    {product.options.colors.map((entry) => (
                      <button
                        key={entry.name}
                        className={`colour-swatch${selected.color === entry.name ? " selected" : ""}`}
                        style={{ backgroundColor: entry.hex }}
                        onClick={() => changeOption("color", entry.name)}
                        aria-label={entry.name}
                        aria-pressed={selected.color === entry.name}
                        title={entry.name}
                      />
                    ))}
                  </div>
                </div>

                <OptionPicker label="Size" selected={selected.size} options={product.options.sizes} onChange={(value) => changeOption("size", value)} />
                <OptionPicker label="Storage" selected={selected.storage} options={product.options.storage} onChange={(value) => changeOption("storage", value)} />
                <OptionPicker label="Headboard" selected={selected.headboard} options={product.options.headboards} onChange={(value) => changeOption("headboard", value)} />
                <OptionPicker label="Base" selected={selected.base} options={product.options.bases} onChange={(value) => changeOption("base", value)} />

                <label className="assembly-choice">
                  <input type="checkbox" checked={selected.assembly} onChange={(event) => changeOption("assembly", event.target.checked)} />
                  <span className="custom-check" />
                  <span className="assembly-copy"><strong>Professional assembly</strong><small>Let us do the heavy lifting.</small></span>
                  <span className="assembly-price">+{formatPrice(product.options.assemblyPrice)}</span>
                </label>

                <button className="button button-dark add-to-basket" onClick={addToCart}>
                  Add to basket <span>{formatPrice(productPrice)}</span>
                </button>
                <div className="delivery-note"><span className="delivery-dot" /> In stock · Complimentary delivery</div>
                <div className="detail-accordion">
                  <details><summary>Delivery &amp; returns</summary><p>Your order is carefully prepared for complimentary home delivery. Orders can be returned within 30 days.</p></details>
                  <details><summary>Care &amp; materials</summary><p>Soft-touch upholstery and a supportive, made-to-order divan base. Keep looking lovely with gentle spot cleaning.</p></details>
                </div>
              </div>
            </div>
            <div className="mobile-sticky-add">
              <div><small>{color.name}</small><strong>{formatPrice(productPrice)}</strong></div>
              <button className="button button-dark" onClick={addToCart}>Add to basket</button>
            </div>
          </section>
        )}

        {view === "detail" && !product && (
          <div className="page-width empty-state"><h2>This piece is no longer available.</h2><button className="button button-dark" onClick={() => navigate("shop")}>Back to the shop</button></div>
        )}

        {view === "cart" && (
          <section className="cart-page page-width">
            <div className="page-heading">
              <span className="eyebrow">A little comfort is on its way</span>
              <h1>{checkoutComplete ? "Thank you for your order." : "Your basket."}</h1>
              {checkoutComplete && <p>Your order has been placed. You can follow its journey from your orders page.</p>}
            </div>
            {checkoutComplete ? (
              <div className="checkout-success">
                <div className="success-check">✓</div>
                <h2>All tucked in.</h2>
                <p>Your order is confirmed. We’ll take it from here.</p>
                <button className="button button-dark" onClick={() => navigate(user?.role === "buyer" ? "orders" : "shop")}>{user?.role === "buyer" ? "View your orders" : "Back to the shop"}</button>
              </div>
            ) : cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-bag"><Icon name="bag" size={27} /></div>
                <h2>Your basket is taking a little breather.</h2>
                <p>Find something lovely for your home.</p>
                <button className="button button-dark" onClick={() => navigate("shop")}>Explore the edit <Icon name="arrow" size={17} /></button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-items">
                  {cart.map((item) => (
                    <article className="cart-line" key={item.key}>
                      <div className="cart-line-image"><ProductPicture src={item.image} color={products.find((entry) => entry.id === item.productId)?.options.colors.find((entry) => entry.name === item.color)?.hex ?? "#e9e2d4"} view={0} /></div>
                      <div className="cart-line-details">
                        <span className="product-category">Divan bed</span>
                        <h2>{item.productTitle}</h2>
                        <p>{selectedSummary(item)}</p>
                        <div className="quantity-control">
                          <button onClick={() => changeQuantity(item.key, -1)} aria-label={`Remove one ${item.productTitle}`}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => changeQuantity(item.key, 1)} aria-label={`Add one ${item.productTitle}`}>+</button>
                        </div>
                      </div>
                      <div className="cart-line-end">
                        <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                        <button className="remove-link" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))}>Remove</button>
                      </div>
                    </article>
                  ))}
                  <button className="text-button continue-shopping" onClick={() => navigate("shop")}>← Keep looking</button>
                </div>
                <form className="order-summary" onSubmit={(event) => void placeOrder(event)}>
                  <h2>A little summary</h2>
                  <div className="summary-row"><span>Subtotal</span><span>{formatPrice(cartTotal)}</span></div>
                  <div className="summary-row"><span>Delivery</span><span className="free-copy">On us</span></div>
                  <div className="summary-total"><span>Total</span><strong>{formatPrice(cartTotal)}</strong></div>
                  <label className="form-label" htmlFor="delivery-address">Delivery address</label>
                  <textarea id="delivery-address" value={checkoutAddress} onChange={(event) => setCheckoutAddress(event.target.value)} placeholder="Your full delivery address" required minLength={8} rows={3} />
                  {!user && <p className="checkout-hint">You’ll sign in with a buyer account to place your order.</p>}
                  {user && user.role !== "buyer" && <p className="checkout-hint">Please use a buyer account to place an order.</p>}
                  <button className="button button-dark checkout-button" type="submit" disabled={busy}>
                    {busy ? "One moment…" : "Continue to checkout"} <Icon name="arrow" size={18} />
                  </button>
                  <p className="fake-payment-note">A safe demo checkout — no payment is taken.</p>
                </form>
              </div>
            )}
          </section>
        )}

        {view === "seller" && (
          <section className="seller-page page-width">
            <div className="page-heading">
              <span className="eyebrow">Your little corner of the shop</span>
              <h1>Seller studio.</h1>
              <p>Make your listing feel like you. Every price and option is saved as product data.</p>
            </div>
            {!user ? (
              <div className="access-card"><h2>Made something lovely?</h2><p>Sign in or create a seller account to add and manage your products.</p><button className="button button-dark" onClick={() => { setAuthMode("signup"); setAuthRole("seller"); setAuthOpen(true); }}>Create a seller account</button></div>
            ) : user.role !== "seller" ? (
              <div className="access-card"><h2>This space is for sellers.</h2><p>You’re signed in as a {user.role}. Switch accounts to manage a listing.</p><button className="button button-dark" onClick={() => void signOut()}>Switch account</button></div>
            ) : user.status !== "approved" ? (
              <div className="access-card pending-card"><span className="status-pill status-pending">Seller approval needed</span><h2>We’ll get you set up soon.</h2><p>Your seller account is with our admin team for approval. You can prepare a listing once your account is approved.</p><button className="button button-outline" onClick={() => void openSellerPanel()}>Refresh status</button></div>
            ) : sellerDraft ? (
              <form className="seller-form" onSubmit={(event) => void saveListing(event)}>
                <div className="seller-form-heading"><div><span className="eyebrow">The Prague collection</span><h2>Product details</h2></div><span className={`status-pill status-${sellerDraft.status}`}>{sellerDraft.status}</span></div>
                <p className="seller-status-copy">{sellerStatus}</p>
                <div className="seller-basic-grid">
                  <label className="form-label">Product title<input required minLength={3} maxLength={120} value={sellerDraft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
                  <label className="form-label">Category<input value={DIVAN_CATEGORY} readOnly /></label>
                  <label className="form-label">Base price (£)<input type="number" required min="0" step="0.01" value={sellerDraft.basePrice} onChange={(event) => updateDraft("basePrice", Number(event.target.value))} /></label>
                  <label className="form-label">Compare-at price (£)<input type="number" required min={sellerDraft.basePrice} step="0.01" value={sellerDraft.compareAtPrice} onChange={(event) => updateDraft("compareAtPrice", Number(event.target.value))} /></label>
                </div>
                <label className="form-label">Description<textarea rows={4} maxLength={4000} value={sellerDraft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="What makes your piece special?" /></label>
                <button type="button" className="button button-soft assist-button" onClick={() => updateDraft("description", makeDescriptionDraft(sellerDraft))}><Icon name="sparkle" size={17} /> Draft a description from your product details</button>

                <div className="seller-editor-section">
                  <div className="seller-section-heading"><div><h3>Photos</h3><p>Upload up to 8 of your own product photos. We keep them with your listing.</p></div><label className="button button-outline upload-button">Add photos<input type="file" accept="image/*" multiple onChange={(event) => void addProductPhotos(event)} disabled={busy || sellerDraft.images.length >= 8} /></label></div>
                  <div className="seller-image-list">
                    {sellerDraft.images.map((image, index) => (
                      <div className="seller-image-thumb" key={`${image.slice(0, 30)}-${index}`}>
                        <ProductPicture src={image} color={sellerDraft.options.colors[0]?.hex ?? "#e9e2d4"} view={index % 5} />
                        <button type="button" onClick={() => updateDraft("images", sellerDraft.images.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove photo ${index + 1}`}><Icon name="close" size={15} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="seller-editor-section">
                  <div className="seller-section-heading"><div><h3>Colours</h3><p>Give each fabric swatch a name and a colour.</p></div><button type="button" className="text-button" onClick={() => updateDraft("options", { ...sellerDraft.options, colors: [...sellerDraft.options.colors, { name: "New colour", hex: "#cfc8bd" }] })}>+ Add colour</button></div>
                  <div className="color-editor-list">
                    {sellerDraft.options.colors.map((entry, index) => (
                      <div className="color-editor-row" key={`${entry.name}-${index}`}><span className="editor-swatch" style={{ backgroundColor: entry.hex }} /><input aria-label={`Colour ${index + 1} name`} value={entry.name} onChange={(event) => updateColor(index, "name", event.target.value)} /><input aria-label={`Colour ${index + 1} hex`} type="color" value={entry.hex} onChange={(event) => updateColor(index, "hex", event.target.value)} /><button type="button" className="remove-option" onClick={() => updateDraft("options", { ...sellerDraft.options, colors: sellerDraft.options.colors.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove ${entry.name}`}>×</button></div>
                    ))}
                  </div>
                </div>

                <div className="seller-options-grid">
                  <SellerOptionEditor title="Sizes" options={sellerDraft.options.sizes} onUpdate={(index, field, value) => updateOptionList("sizes", index, field, value)} onAdd={() => addPriceOption("sizes")} onRemove={(index) => removePriceOption("sizes", index)} />
                  <SellerOptionEditor title="Storage" options={sellerDraft.options.storage} onUpdate={(index, field, value) => updateOptionList("storage", index, field, value)} onAdd={() => addPriceOption("storage")} onRemove={(index) => removePriceOption("storage", index)} />
                  <SellerOptionEditor title="Headboards" options={sellerDraft.options.headboards} onUpdate={(index, field, value) => updateOptionList("headboards", index, field, value)} onAdd={() => addPriceOption("headboards")} onRemove={(index) => removePriceOption("headboards", index)} />
                  <SellerOptionEditor title="Bases" options={sellerDraft.options.bases} onUpdate={(index, field, value) => updateOptionList("bases", index, field, value)} onAdd={() => addPriceOption("bases")} onRemove={(index) => removePriceOption("bases", index)} />
                </div>
                <label className="form-label assembly-editor">Professional assembly (£)<input type="number" min="0" step="0.01" value={sellerDraft.options.assemblyPrice} onChange={(event) => setSellerDraft((current) => current ? { ...current, options: { ...current.options, assemblyPrice: Number(event.target.value) || 0 } } : current)} /></label>
                <div className="seller-save-row"><span>{sellerStatus}</span><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save product"}</button></div>
              </form>
            ) : (
              <div className="access-card"><h2>One more moment.</h2><p>{sellerStatus}</p></div>
            )}
          </section>
        )}

        {view === "orders" && (
          <section className="orders-page page-width">
            <div className="page-heading"><span className="eyebrow">Good things are on their way</span><h1>{user?.role === "seller" ? "Incoming orders." : "Your orders."}</h1><p>Every order, neatly in one place.</p></div>
            {!user ? <div className="access-card"><h2>Sign in to see your orders.</h2><button className="button button-dark" onClick={() => { setAuthRole("buyer"); setAuthMode("login"); setAuthOpen(true); }}>Sign in</button></div> : orders.length === 0 ? <div className="empty-state"><h2>Nothing on its way just yet.</h2><p>Your next favourite thing could be just around the corner.</p><button className="button button-dark" onClick={() => navigate("shop")}>Explore the edit</button></div> : (
              <div className="orders-list">{orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-top"><div><span className="product-category">Order #{order.id.slice(0, 8).toUpperCase()}</span><strong>{new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong></div><span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status}</span></div>
                  <div className="order-products">{order.items.map((item, index) => <div key={`${item.productId}-${index}`}><span>{item.quantity} × {item.productTitle}</span><small>{selectedSummary(item)}</small><strong>{formatPrice(item.unitPrice * item.quantity)}</strong></div>)}</div>
                  <div className="order-card-bottom"><span>Delivery to {order.address}</span><strong>Total {formatPrice(order.total)}</strong></div>
                  {user.role === "seller" && <label className="order-status-control">Update status<select value={order.status} onChange={(event) => void updateOrder(order.id, event.target.value as OrderStatus)}>{(["New", "Confirmed", "Shipped", "Delivered"] as OrderStatus[]).map((status) => <option key={status}>{status}</option>)}</select></label>}
                </article>
              ))}</div>
            )}
          </section>
        )}

        {view === "admin" && (
          <section className="admin-page page-width">
            <div className="page-heading"><span className="eyebrow">A considered marketplace</span><h1>Admin desk.</h1><p>Review sellers and keep the shop feeling just right.</p></div>
            {user?.role !== "admin" ? <div className="access-card"><h2>This page is for admins.</h2><p>Admin access is protected and configured by the marketplace owner.</p></div> : (
              <div className="admin-columns">
                <div className="admin-list"><div className="admin-list-heading"><h2>Sellers</h2><span>{adminUsers.filter((item) => item.role === "seller").length}</span></div>{adminUsers.filter((item) => item.role === "seller").map((seller) => <div className="moderation-row" key={seller.id}><div><strong>{seller.name}</strong><small>{seller.email}</small><span className={`status-pill status-${seller.status}`}>{seller.status}</span></div><select aria-label={`Seller status for ${seller.name}`} value={seller.status} onChange={(event) => void moderate("seller", seller.id, event.target.value as "pending" | "approved" | "hidden")}><option value="pending">Pending</option><option value="approved">Approved</option><option value="hidden">Hidden</option></select></div>)}</div>
                <div className="admin-list"><div className="admin-list-heading"><h2>Listings</h2><span>{adminProducts.length}</span></div>{adminProducts.map((entry) => <div className="moderation-row" key={entry.id}><div><strong>{entry.title}</strong><small>{entry.sellerName} · {formatPrice(entry.basePrice)}</small><span className={`status-pill status-${entry.status}`}>{entry.status}</span></div><select aria-label={`Listing status for ${entry.title}`} value={entry.status} onChange={(event) => void moderate("product", entry.id, event.target.value as "pending" | "approved" | "hidden")}><option value="pending">Pending</option><option value="approved">Approved</option><option value="hidden">Hidden</option></select></div>)}</div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-main page-width"><div><button className="wordmark wordmark-button footer-wordmark" onClick={() => navigate("shop")}><span className="wordmark-mark">d</span><span>demo seller<span className="wordmark-period">.</span></span></button><p>A little more room to feel at home.</p></div><div className="footer-links"><button onClick={() => navigate("shop")}>Shop the edit</button><button onClick={() => navigate("seller")}>Sell with us</button><button onClick={() => navigate("orders")}>Your orders</button></div><span className="footer-signoff">MADE FOR SLOWER DAYS · © 2026</span></div>
      </footer>

      {view === "detail" && product && selected && (
        <div className="mobile-sticky-spacer" aria-hidden="true" />
      )}

      {authOpen && (
        <Modal title={authMode === "login" ? "Welcome back." : "Come on in."} onClose={() => setAuthOpen(false)}>
          <p className="modal-intro">{authMode === "login" ? "A familiar face. Sign in to pick up where you left off." : "A little space for your next chapter."}</p>
          <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
            {authMode === "signup" && <label className="form-label">Your name<input name="name" autoComplete="name" required minLength={2} /></label>}
            <label className="form-label">Email address<input name="email" type="email" autoComplete="email" required /></label>
            <label className="form-label">Password<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required minLength={8} /></label>
            {authMode === "signup" && <label className="form-label">I’m here as<select value={authRole} onChange={(event) => setAuthRole(event.target.value as "buyer" | "seller")}><option value="buyer">A buyer</option><option value="seller">A seller</option></select></label>}
            <button className="button button-dark auth-submit" disabled={busy}>{busy ? "One moment…" : authMode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="auth-switch">{authMode === "login" ? "New to our little shop?" : "Already have an account?"} <button onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(""); }}>{authMode === "login" ? "Create an account" : "Sign in"}</button></p>
        </Modal>
      )}

      {zoomOpen && product && color && (
        <Modal title={`${title} · Image ${galleryIndex + 1} of ${product.images.length}`} onClose={() => setZoomOpen(false)} wide>
          <div className="zoom-image"><ProductPicture src={product.images[galleryIndex]} color={color.hex} view={galleryIndex} /></div>
          <div className="zoom-controls"><button className="button button-outline" onClick={() => setGalleryIndex((galleryIndex + product.images.length - 1) % product.images.length)}>← Previous</button><span>{galleryIndex + 1} / {product.images.length}</span><button className="button button-outline" onClick={() => setGalleryIndex((galleryIndex + 1) % product.images.length)}>Next →</button></div>
        </Modal>
      )}
    </div>
  );
}

function OptionPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: PriceOption[];
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="option-block">
      <div className="option-heading"><strong>{label}</strong><span>{options.find((option) => option.label === selected)?.label}</span></div>
      <div className="option-choice-list">
        {options.map((option) => (
          <button
            className={`option-choice${selected === option.label ? " selected" : ""}`}
            key={option.label}
            onClick={() => onChange(option.label)}
            aria-pressed={selected === option.label}
          >
            <span>{option.label}</span>
            <span className="choice-price">{option.extraPrice > 0 ? `+${formatPrice(option.extraPrice)}` : "Included"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SellerOptionEditor({
  title,
  options,
  onUpdate,
  onAdd,
  onRemove,
}: {
  title: string;
  options: PriceOption[];
  onUpdate: (index: number, field: keyof PriceOption, value: string | number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="seller-option-editor">
      <div className="seller-option-heading"><h3>{title}</h3><button type="button" className="text-button" onClick={onAdd}>+ Add</button></div>
      {options.map((option, index) => (
        <div className="seller-option-row" key={`${option.label}-${index}`}>
          <input aria-label={`${title} option ${index + 1} name`} value={option.label} onChange={(event) => onUpdate(index, "label", event.target.value)} />
          <label><span>+£</span><input aria-label={`${title} option ${index + 1} extra price`} type="number" min="0" step="0.01" value={option.extraPrice} onChange={(event) => onUpdate(index, "extraPrice", Number(event.target.value))} /></label>
          <button type="button" className="remove-option" onClick={() => onRemove(index)} aria-label={`Remove ${option.label}`}>×</button>
        </div>
      ))}
    </section>
  );
}

function makeDescriptionDraft(product: Product): string {
  const colors = product.options.colors.slice(0, 3).map((option) => option.name.replace(" Naples", "").toLowerCase());
  const size = product.options.sizes[0]?.label.toLowerCase() ?? "a range of sizes";
  const shades = colors.length ? `Choose from ${colors.join(", ")}${colors.length > 1 ? " and more" : ""}.` : "";
  return `${product.title} brings a softer, more considered feel to the bedroom. Thoughtfully upholstered for everyday comfort, it is available in ${size} and a choice of fabric colours. ${shades} Make it your own with flexible storage, a choice of headboard and an optional professional assembly service.`;
}

async function resizePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      image.src = source;
    });
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(source);
  }
}
