import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { cartLineKey, calculatePrice, formatPrice, type CartLine, type Order, type Product, type SelectedOptions, type User } from '@/marketplace';

const API_URL = (process.env.EXPO_PUBLIC_MARKETPLACE_API_URL ?? '').replace(/\/$/, '');
const paper = '#faf9f7';
const ink = '#27312c';
const muted = '#777a72';
const green = '#2d493c';
type Tab = 'Shop' | 'Detail' | 'Cart' | 'Orders' | 'Account';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.text();
  let result: { error?: string } & T | null = null;
  if (body) {
    try { result = JSON.parse(body) as { error?: string } & T; }
    catch { if (response.ok) throw new Error('The marketplace returned an unreadable response.'); }
  }
  if (!response.ok) throw new Error(result?.error ?? `Marketplace request failed (${response.status}). Check the web app server logs.`);
  if (!result) throw new Error('The marketplace returned an empty response.');
  return result as T;
}

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('Shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('prague-divan-bed');
  const [selected, setSelected] = useState<SelectedOptions | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [auth, setAuth] = useState({ email: '', password: '', name: '', role: 'buyer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api<{ products: Product[] }>('/api/products'), api<{ user: User | null }>('/api/auth')])
      .then(([p, u]) => { if (!active) return; setProducts(p.products); setUser(u.user); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not connect to the marketplace.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web') {
      try { const saved = window.localStorage.getItem('demo-marketplace-cart'); if (saved) setCart(JSON.parse(saved) as CartLine[]); } catch { /* ignore malformed local sample cart */ }
    }
    setCartReady(true);
  }, []);
  useEffect(() => { if (cartReady && Platform.OS === 'web') { try { window.localStorage.setItem('demo-marketplace-cart', JSON.stringify(cart)); } catch { /* storage may be unavailable */ } } }, [cart, cartReady]);

  const product = products.find((item) => item.id === productId) ?? products[0] ?? null;
  const filtered = useMemo(() => products.filter((item) => `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const price = product && selected ? calculatePrice(product, selected) : 0;
  const cartTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const change = (key: keyof SelectedOptions, value: string | boolean) => setSelected((current) => current ? { ...current, [key]: value } : current);
  const openProduct = (item: Product) => {
    setProductId(item.id);
    setSelected({ color: item.options.colors[0]?.name ?? '', size: item.options.sizes[0]?.label ?? '', storage: item.options.storage[0]?.label ?? '', headboard: item.options.headboards[0]?.label ?? '', base: item.options.bases[0]?.label ?? '', assembly: false });
    setTab('Detail');
  };
  const addToCart = () => {
    if (!product || !selected) return;
    const key = cartLineKey(product.id, selected);
    const line: CartLine = { ...selected, key, productId: product.id, productTitle: product.title, image: product.images[0] ?? '', quantity: 1, unitPrice: price };
    setCart((current) => current.find((item) => item.key === key) ? current.map((item) => item.key === key ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item) : [...current, line]);
    setTab('Cart');
  };
  const signIn = async () => {
    setBusy(true); setError('');
    try { const result = await api<{ user: User }>('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: auth.email, password: auth.password }) }); setUser(result.user); setTab('Account'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed.'); }
    finally { setBusy(false); }
  };
  const signUp = async () => {
    setBusy(true); setError('');
    try { const result = await api<{ user: User; message?: string }>('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'signup', name: auth.name, email: auth.email, password: auth.password, role: auth.role }) }); setUser(result.user); setTab(result.user.role === 'buyer' ? 'Shop' : 'Account'); setError(result.message ?? 'Account created.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Account creation failed.'); }
    finally { setBusy(false); }
  };
  const loadOrders = async () => { setTab('Orders'); setError(''); try { const result = await api<{ orders: Order[] }>('/api/orders'); setOrders(result.orders); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load orders.'); } };
  const checkout = async () => {
    if (!user || user.role !== 'buyer') { setTab('Account'); setError('Sign in with a buyer account before placing an order.'); return; }
    setBusy(true); setError('');
    try {
      const result = await api<{ order: Order }>('/api/orders', { method: 'POST', body: JSON.stringify({ address, items: cart.map(({ productId: id, color, size, storage, headboard, base, assembly, quantity }) => ({ productId: id, color, size, storage, headboard, base, assembly, quantity })) }) });
      setOrders((current) => [result.order, ...current]); setCart([]); setAddress(''); setTab('Orders');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not place your order.'); }
    finally { setBusy(false); }
  };
  const signOut = async () => { try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }); } catch { /* clear local view even when offline */ } setUser(null); setOrders([]); };

  return <SafeAreaView style={s.safe}>
    <View style={s.header}><Pressable onPress={() => setTab('Shop')}><Text style={s.logo}><Text style={s.logoMark}>d</Text> demo seller<Text style={s.period}>.</Text></Text></Pressable><Pressable onPress={() => setTab('Cart')} style={s.bag}><Text style={s.bagText}>BAG · {cart.length}</Text></Pressable></View>
    <View style={s.tabs}>{(['Shop', 'Cart', 'Orders', 'Account'] as const).map((item) => <Pressable key={item} onPress={() => item === 'Orders' ? void loadOrders() : setTab(item)} style={[s.tab, (tab === item || (tab === 'Detail' && item === 'Shop')) && s.tabOn]}><Text style={[s.tabLabel, (tab === item || (tab === 'Detail' && item === 'Shop')) && s.tabLabelOn]}>{item}</Text></Pressable>)}</View>
    {!!error && <Pressable onPress={() => setError('')} style={s.errorBox}><Text style={s.errorText}>{error}  ×</Text></Pressable>}

    {tab === 'Shop' && <ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>A CONSIDERED MARKETPLACE</Text><Text style={s.heroTitle}>A little more room{ '\n' }to feel at home.</Text><Text style={s.copy}>Thoughtful pieces for slower days.</Text><View style={s.search}><Text style={s.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search the edit…" placeholderTextColor="#85877f" style={s.searchInput}/></View><View style={s.listHeading}><Text style={s.sectionTitle}>The bedroom edit</Text><Text style={s.count}>{filtered.length} PIECES</Text></View>{filtered.map((item) => <Pressable key={item.id} onPress={() => openProduct(item)} style={s.productCard}><View style={s.productImageBox}>{item.images[0] ? <Image source={{ uri: item.images[0].startsWith('/') ? `${API_URL}${item.images[0]}` : item.images[0] }} style={s.productImage}/> : <View style={s.imagePlaceholder}><Text style={s.placeholderText}>DEMO SELLER · BEDROOM</Text></View>}<Text style={s.badge}>{item.category.split('>').at(-1)?.trim().toUpperCase()}</Text></View><View style={s.productMeta}><View style={{ flex: 1 }}><Text style={s.productName}>{item.title}</Text><Text style={s.copySmall}>{formatPrice(item.basePrice)} · {item.sellerName}</Text></View><Text style={s.roundArrow}>↗</Text></View></Pressable>)}{!products.length && <View style={s.empty}><Text style={s.sectionTitle}>Connecting to the marketplace…</Text><Text style={s.copySmall}>Set the web app URL and make sure it is running.</Text></View>}</ScrollView>}

    {tab === 'Detail' && product && selected && <ScrollView contentContainerStyle={s.content}><Pressable onPress={() => setTab('Shop')}><Text style={s.back}>←  SHOP THE EDIT</Text></Pressable><View style={s.detailHero}>{product.images[0] ? <Image source={{ uri: product.images[0].startsWith('/') ? `${API_URL}${product.images[0]}` : product.images[0] }} style={s.detailImage}/> : <View style={s.imagePlaceholder}/>}</View><Text style={s.eyebrow}>{product.category.toUpperCase()}</Text><Text style={s.detailTitle}>{product.title}</Text><Text style={s.price}>{formatPrice(price)}  <Text style={s.copySmall}>·  {product.sellerName}</Text></Text><Text style={s.description}>{product.description}</Text>
      <Text style={s.optionHeading}>COLOUR · {selected.color}</Text><View style={s.swatches}>{product.options.colors.map((color) => <Pressable accessibilityLabel={color.name} key={color.name} onPress={() => change('color', color.name)} style={[s.swatch, { backgroundColor: color.hex }, selected.color === color.name && s.swatchSelected]}/>)}</View>
      <OptionPicker title="Size" options={product.options.sizes} selected={selected.size} onSelect={(value) => change('size', value)}/><OptionPicker title="Storage" options={product.options.storage} selected={selected.storage} onSelect={(value) => change('storage', value)}/><OptionPicker title="Headboard" options={product.options.headboards} selected={selected.headboard} onSelect={(value) => change('headboard', value)}/><OptionPicker title="Base" options={product.options.bases} selected={selected.base} onSelect={(value) => change('base', value)}/><Pressable onPress={() => change('assembly', !selected.assembly)} style={s.assembly}><View style={[s.checkbox, selected.assembly && s.checkboxOn]}><Text style={s.checkText}>{selected.assembly ? '✓' : ''}</Text></View><View style={{ flex: 1 }}><Text style={s.itemTitle}>Professional assembly</Text><Text style={s.copySmall}>Delivered and set up in your room</Text></View><Text style={s.optionPrice}>{formatPrice(product.options.assemblyPrice)}</Text></Pressable><Pressable onPress={addToCart} style={s.primary}><Text style={s.primaryLabel}>ADD TO BASKET · {formatPrice(price)}</Text><Text style={s.primaryArrow}>↗</Text></Pressable></ScrollView>}

    {tab === 'Cart' && <ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>YOUR BASKET</Text><Text style={s.detailTitle}>The good things.</Text>{!cart.length ? <View style={s.empty}><Text style={s.sectionTitle}>Nothing in your basket just yet.</Text><Text style={s.copy}>Your next favourite thing is just around the corner.</Text><Pressable style={s.secondary} onPress={() => setTab('Shop')}><Text style={s.secondaryLabel}>EXPLORE THE EDIT  ↗</Text></Pressable></View> : <>{cart.map((item) => <View style={s.cartLine} key={item.key}><View style={s.cartImage}>{item.image ? <Image source={{ uri: item.image.startsWith('/') ? `${API_URL}${item.image}` : item.image }} style={s.productImage}/> : null}</View><View style={{ flex: 1 }}><Text style={s.itemTitle}>{item.productTitle}</Text><Text style={s.copySmall}>{item.color} · {item.size}</Text><Text style={s.copySmall}>{item.storage} · {item.headboard}</Text><View style={s.qtyRow}><Pressable onPress={() => setCart((current) => current.map((line) => line.key === item.key ? { ...line, quantity: line.quantity - 1 } : line).filter((line) => line.quantity > 0))}><Text style={s.qtyButton}>−</Text></Pressable><Text style={s.copySmall}>{item.quantity}</Text><Pressable onPress={() => setCart((current) => current.map((line) => line.key === item.key ? { ...line, quantity: Math.min(10, line.quantity + 1) } : line))}><Text style={s.qtyButton}>+</Text></Pressable></View></View><Text style={s.itemTitle}>{formatPrice(item.unitPrice * item.quantity)}</Text></View>)}<View style={s.totalRow}><Text style={s.itemTitle}>Subtotal</Text><Text style={s.detailTitle}>{formatPrice(cartTotal)}</Text></View><Text style={s.copySmall}>Delivery included. No payment is collected in this demo.</Text>{!user && <Text style={s.copySmall}>Sign in with a buyer account to continue.</Text>}<TextInput value={address} onChangeText={setAddress} placeholder="Delivery address (required)" placeholderTextColor="#85877f" style={s.input}/><Pressable disabled={busy || address.trim().length < 8} onPress={() => void checkout()} style={[s.primary, (busy || address.trim().length < 8) && s.disabled]}><Text style={s.primaryLabel}>{busy ? 'PLACING ORDER…' : 'PLACE ORDER'}</Text><Text style={s.primaryArrow}>↗</Text></Pressable></>}</ScrollView>}

    {tab === 'Orders' && <ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>YOUR MARKETPLACE ORDERS</Text><Text style={s.detailTitle}>Good things are on their way.</Text>{!user ? <View style={s.empty}><Text style={s.sectionTitle}>Sign in to see your orders.</Text><Pressable onPress={() => setTab('Account')} style={s.secondary}><Text style={s.secondaryLabel}>SIGN IN  ↗</Text></Pressable></View> : orders.length === 0 ? <View style={s.empty}><Text style={s.sectionTitle}>Nothing on its way just yet.</Text><Text style={s.copy}>Your next favourite thing could be just around the corner.</Text></View> : orders.map((order) => <View style={s.orderCard} key={order.id}><View style={s.listHeading}><Text style={s.copySmall}>ORDER #{order.id.slice(0, 8).toUpperCase()}</Text><Text style={s.status}>{order.status.toUpperCase()}</Text></View><View style={s.rule}/>{order.items.map((item, index) => <View key={`${item.productId}-${index}`} style={s.orderItem}><Text style={s.itemTitle}>{item.quantity} × {item.productTitle}</Text><Text style={s.copySmall}>{item.color} · {item.size} · {item.storage}</Text><Text style={s.copySmall}>{formatPrice(item.unitPrice * item.quantity)}</Text></View>)}<View style={s.totalRow}><Text style={s.copySmall}>Delivery to {order.address}</Text><Text style={s.itemTitle}>{formatPrice(order.total)}</Text></View><Text style={s.copySmall}>Placed {new Date(order.createdAt).toLocaleDateString('en-GB')}</Text></View>)}</ScrollView>}

    {tab === 'Account' && <ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>YOUR SPACE</Text><Text style={s.detailTitle}>{user ? `Hello, ${user.name}.` : 'Welcome back.'}</Text>{user ? <View style={s.authCard}><Text style={s.itemTitle}>{user.email}</Text><Text style={s.copySmall}>{user.role.toUpperCase()} · {user.status}</Text><Pressable onPress={() => void signOut()} style={s.secondary}><Text style={s.secondaryLabel}>SIGN OUT</Text></Pressable></View> : <View style={s.authCard}><Text style={s.sectionTitle}>Sign in to your account</Text><TextInput value={auth.email} onChangeText={(email) => setAuth({ ...auth, email })} placeholder="Email address" autoCapitalize="none" keyboardType="email-address" style={s.input}/><TextInput value={auth.password} onChangeText={(password) => setAuth({ ...auth, password })} placeholder="Password" secureTextEntry style={s.input}/><Pressable onPress={() => void signIn()} disabled={busy} style={s.primary}><Text style={s.primaryLabel}>{busy ? 'PLEASE WAIT…' : 'SIGN IN'}</Text></Pressable><View style={s.rule}/><Text style={s.sectionTitle}>New here? Create an account.</Text><TextInput value={auth.name} onChangeText={(name) => setAuth({ ...auth, name })} placeholder="Your name" style={s.input}/><View style={s.roleRow}>{(['buyer', 'seller'] as const).map((role) => <Pressable key={role} onPress={() => setAuth({ ...auth, role })} style={[s.roleChoice, auth.role === role && s.roleSelected]}><Text style={[s.roleText, auth.role === role && s.roleTextSelected]}>{role.toUpperCase()}</Text></Pressable>)}</View><Pressable onPress={() => void signUp()} disabled={busy} style={s.secondary}><Text style={s.secondaryLabel}>CREATE {auth.role.toUpperCase()} ACCOUNT</Text></Pressable></View>}<Text style={s.copySmall}>Sign-in and account details are handled by the shared marketplace API.</Text></ScrollView>}
  </SafeAreaView>;
}

function OptionPicker({ title, options, selected, onSelect }: { title: string; options: { label: string; extraPrice: number }[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={s.optionBlock}><View style={s.listHeading}><Text style={s.optionHeading}>{title.toUpperCase()}</Text><Text style={s.copySmall}>{selected}</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionChoices}>{options.map((option) => <Pressable key={option.label} onPress={() => onSelect(option.label)} style={[s.optionChoice, selected === option.label && s.optionChoiceSelected]}><Text numberOfLines={2} style={[s.optionName, selected === option.label && s.optionNameSelected]}>{option.label}</Text><Text style={s.optionPrice}>{option.extraPrice ? `+${formatPrice(option.extraPrice)}` : 'Included'}</Text></Pressable>)}</ScrollView></View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: paper }, header: { height: 59, borderBottomWidth: 1, borderBottomColor: '#e6e2dc', paddingHorizontal: 19, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }, logo: { color: green, fontFamily: 'Georgia', fontSize: 17 }, logoMark: { width: 25, height: 25, overflow: 'hidden', backgroundColor: green, color: paper, textAlign: 'center', textAlignVertical: 'center', fontStyle: 'italic', fontSize: 20 }, period: { color: '#bc725c' }, bag: { paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e1ddd6' }, bagText: { color: ink, letterSpacing: 1, fontSize: 9 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e6e2dc', paddingHorizontal: 12 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabOn: { borderBottomColor: green }, tabLabel: { color: muted, fontSize: 11 }, tabLabelOn: { color: green }, content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 42 }, errorBox: { backgroundColor: '#f4e8e3', padding: 10 }, errorText: { color: '#873f2d', fontSize: 11 }, eyebrow: { color: '#777a72', fontSize: 9, letterSpacing: 1.8, marginBottom: 12 }, heroTitle: { color: ink, fontFamily: 'Georgia', fontSize: 36, lineHeight: 40, letterSpacing: -1 }, detailTitle: { color: ink, fontFamily: 'Georgia', fontSize: 31, lineHeight: 37 }, copy: { color: muted, fontSize: 13, lineHeight: 20, marginTop: 9 }, copySmall: { color: muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  search: { height: 46, borderWidth: 1, borderColor: '#e1ddd6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 21, marginBottom: 25 }, searchIcon: { fontSize: 22, color: muted, marginRight: 8 }, searchInput: { flex: 1, color: ink, fontSize: 12, outlineStyle: 'none' as never }, listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { color: ink, fontFamily: 'Georgia', fontSize: 19 }, count: { fontSize: 8, color: muted, letterSpacing: 1.4 }, productCard: { marginTop: 17 }, productImageBox: { height: 231, position: 'relative', backgroundColor: '#e8e5de' }, productImage: { width: '100%', height: '100%' }, imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8e5de' }, placeholderText: { color: green, fontSize: 10, letterSpacing: 2 }, badge: { position: 'absolute', top: 11, left: 11, backgroundColor: paper, paddingHorizontal: 9, paddingVertical: 6, color: green, fontSize: 8, letterSpacing: 1 }, productMeta: { flexDirection: 'row', alignItems: 'center', paddingTop: 11 }, productName: { color: ink, fontSize: 15 }, roundArrow: { color: green, borderWidth: 1, borderColor: '#e1ddd6', width: 29, height: 29, textAlign: 'center', textAlignVertical: 'center', borderRadius: 18 }, empty: { paddingVertical: 55, alignItems: 'center' },
  back: { color: green, fontSize: 9, letterSpacing: 1.5, marginBottom: 15 }, detailHero: { height: 258, marginBottom: 20, backgroundColor: '#e8e5de' }, detailImage: { width: '100%', height: '100%' }, price: { color: ink, fontSize: 18, marginTop: 10 }, description: { color: muted, fontSize: 12, lineHeight: 19, marginVertical: 12 }, optionHeading: { color: ink, fontSize: 9, letterSpacing: 1.2 }, swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 12 }, swatch: { width: 29, height: 29, borderRadius: 18, borderWidth: 1, borderColor: '#d2cec7' }, swatchSelected: { borderWidth: 2, borderColor: green, transform: [{ scale: 1.12 }] }, optionBlock: { borderTopWidth: 1, borderTopColor: '#e6e2dc', paddingTop: 14, marginTop: 9 }, optionChoices: { gap: 8, paddingVertical: 11 }, optionChoice: { width: 139, minHeight: 61, justifyContent: 'space-between', padding: 10, borderWidth: 1, borderColor: '#e1ddd6', backgroundColor: '#fff' }, optionChoiceSelected: { borderColor: green, backgroundColor: '#e6ece6' }, optionName: { color: ink, fontSize: 10 }, optionNameSelected: { color: green }, optionPrice: { color: muted, fontSize: 9, marginTop: 6 }, assembly: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#e6e2dc', marginTop: 8, gap: 10 }, checkbox: { width: 19, height: 19, borderWidth: 1, borderColor: '#b9b7af' }, checkboxOn: { backgroundColor: green, borderColor: green }, checkText: { color: '#fff', textAlign: 'center', fontSize: 13 }, itemTitle: { color: ink, fontSize: 12 }, primary: { backgroundColor: green, height: 49, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }, primaryLabel: { color: '#fff', fontSize: 9, letterSpacing: 1 }, primaryArrow: { color: '#fff', fontSize: 17 }, disabled: { opacity: 0.45 },
  secondary: { alignItems: 'center', borderWidth: 1, borderColor: green, paddingVertical: 13, paddingHorizontal: 14, marginTop: 17 }, secondaryLabel: { color: green, fontSize: 9, letterSpacing: 1 }, cartLine: { flexDirection: 'row', gap: 11, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e6e2dc' }, cartImage: { width: 66, height: 75, backgroundColor: '#e8e5de' }, qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 8 }, qtyButton: { fontSize: 18, color: green }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#e6e2dc', marginTop: 14 }, input: { color: ink, fontSize: 12, height: 46, borderBottomWidth: 1, borderBottomColor: '#dedad3', marginTop: 10 }, orderCard: { borderWidth: 1, borderColor: '#e6e2dc', backgroundColor: '#fff', padding: 14, marginTop: 17 }, status: { color: green, fontSize: 9, letterSpacing: 1 }, rule: { height: 1, backgroundColor: '#e6e2dc', marginVertical: 12 }, orderItem: { paddingBottom: 10 }, authCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e2dc', padding: 16, marginTop: 22 }, roleRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, roleChoice: { flex: 1, borderWidth: 1, borderColor: '#e1ddd6', padding: 12, alignItems: 'center' }, roleSelected: { borderColor: green, backgroundColor: '#e6ece6' }, roleText: { fontSize: 9, color: muted, letterSpacing: 1 }, roleTextSelected: { color: green },
});
