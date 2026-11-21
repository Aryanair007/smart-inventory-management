import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Truck,
  Warehouse,
  X,
  Zap,
} from 'lucide-react';
import { supabase, type InventoryItem, type WarehouseActivity } from '@/lib/supabase';
import { AuthPage, type AuthUser } from './Auth';
import { Chatbot } from './Chatbot';

type View = 'overview' | 'inventory' | 'copilot' | 'products' | 'more';
type Modal = 'receive' | 'dispatch' | null;

const fallbackItems: InventoryItem[] = [
  { id: '1', sku: 'FUR-8831', name: 'Pro Ergonomic Chair', category: 'Furniture', location: 'Rack B-04', quantity: 4, reorder_level: 20, unit_price: 249, status: 'low_stock', image_url: null, created_at: '', updated_at: '' },
  { id: '2', sku: 'ACC-1092', name: 'Mechanical Keyboard RGB', category: 'Accessories', location: 'Zone C-12', quantity: 0, reorder_level: 12, unit_price: 129, status: 'out_of_stock', image_url: null, created_at: '', updated_at: '' },
  { id: '3', sku: 'ELE-4401', name: 'USB-C Multiport Dock 12-in-1', category: 'Electronics', location: 'Secondary Depot', quantity: 7, reorder_level: 10, unit_price: 89, status: 'low_stock', image_url: null, created_at: '', updated_at: '' },
  { id: '4', sku: 'MON-2210', name: 'Ultra-Wide Monitor 34 inch', category: 'Displays', location: 'Bin A-14', quantity: 56, reorder_level: 18, unit_price: 499, status: 'in_stock', image_url: null, created_at: '', updated_at: '' },
  { id: '5', sku: 'AUD-0918', name: 'Wireless Headset Pro', category: 'Audio', location: 'Dock 3', quantity: 32, reorder_level: 15, unit_price: 179, status: 'in_stock', image_url: null, created_at: '', updated_at: '' },
  { id: '6', sku: 'MAT-7740', name: 'Ergonomic Desk Mat', category: 'Workspace', location: 'Bin C-02', quantity: 18, reorder_level: 10, unit_price: 39, status: 'in_stock', image_url: null, created_at: '', updated_at: '' },
];

const fallbackActivity: WarehouseActivity[] = [
  { id: '1', action: 'received', title: 'Stock Count Checked!', detail: 'Maria from Floor 2 • Verified', quantity: 150, created_at: '' },
  { id: '2', action: 'audit', title: 'PO #PO-9402 Approved!', detail: 'David from Procurement • 2 suppliers', quantity: 0, created_at: '' },
  { id: '3', action: 'alert', title: 'Low Stock Alert!', detail: 'Shelf Bot • Needs attention', quantity: 12, created_at: '' },
];

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [view, setView] = useState<View>('overview');
  const [items, setItems] = useState<InventoryItem[]>(fallbackItems);
  const [activity, setActivity] = useState<WarehouseActivity[]>(fallbackActivity);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState('');

  // Check initial authentication state (saved local session or Supabase session)
  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check local session
      const savedUser =
        localStorage.getItem('smartstock_current_user') ||
        localStorage.getItem('smartstock_demo_user');

      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
          setAuthLoading(false);
          return;
        } catch {
          localStorage.removeItem('smartstock_current_user');
          localStorage.removeItem('smartstock_demo_user');
        }
      }

      // 2. Check Supabase session
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const u = data.session.user;
          const authUser: AuthUser = {
            email: u.email || 'alex.admin@smartstock.io',
            name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Alex Rivera',
            role: 'Super Admin',
          };
          localStorage.setItem('smartstock_current_user', JSON.stringify(authUser));
          setCurrentUser(authUser);
          setAuthLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Session check warning:', err);
      }

      setAuthLoading(false);
    };

    void checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Warehouse Admin',
          role: 'Super Admin',
        };
        localStorage.setItem('smartstock_current_user', JSON.stringify(authUser));
        setCurrentUser(authUser);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeMenu = () => setProfileMenuOpen(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [profileMenuOpen]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    localStorage.removeItem('smartstock_current_user');
    localStorage.removeItem('smartstock_demo_user');
    setCurrentUser(null);
    setProfileMenuOpen(false);
    setNotice('You have signed out successfully.');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsResult, activityResult] = await Promise.all([
        supabase.from('inventory_items').select('*').order('quantity', { ascending: true }),
        supabase.from('warehouse_activity').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      if (!itemsResult.error && itemsResult.data?.length) setItems(itemsResult.data as InventoryItem[]);
      if (!activityResult.error && activityResult.data?.length) setActivity(activityResult.data as WarehouseActivity[]);
    } catch (err) {
      console.warn('Error loading data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      void loadData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => ({
    units: items.reduce((sum, item) => sum + item.quantity, 0),
    value: items.reduce((sum, item) => sum + item.quantity * Number(item.unit_price), 0),
    low: items.filter((item) => item.status !== 'in_stock').length,
  }), [items]);

  const filteredItems = items.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase()));

  const addMovement = async (type: 'received' | 'dispatched', quantity: number) => {
    const firstItem = items[0];
    if (!firstItem) return;
    const nextQuantity = type === 'received' ? firstItem.quantity + quantity : Math.max(0, firstItem.quantity - quantity);
    const nextStatus: InventoryItem['status'] = nextQuantity === 0 ? 'out_of_stock' : nextQuantity <= firstItem.reorder_level ? 'low_stock' : 'in_stock';
    
    try {
      const { error } = await supabase.from('inventory_items').update({ quantity: nextQuantity, status: nextStatus, updated_at: new Date().toISOString() }).eq('id', firstItem.id);
      if (error) {
        setNotice('Notice: Saved locally (cloud update pending).');
      } else {
        await supabase.from('warehouse_activity').insert({ action: type, title: type === 'received' ? 'Stock received' : 'Stock dispatched', detail: `${quantity} units • ${firstItem.name}`, quantity });
      }
    } catch (err) {
      console.warn('Error saving movement to Supabase:', err);
    }

    setItems((prev) => prev.map((item, idx) => idx === 0 ? { ...item, quantity: nextQuantity, status: nextStatus } : item));
    setModal(null);
    setNotice(type === 'received' ? `Received ${quantity} units into ${firstItem.name}.` : `Dispatched ${quantity} units from ${firstItem.name}.`);
  };

  const handleQuickMovement = async (item: InventoryItem, type: 'received' | 'dispatched', quantity: number) => {
    const nextQuantity = type === 'received' ? item.quantity + quantity : Math.max(0, item.quantity - quantity);
    const nextStatus: InventoryItem['status'] =
      nextQuantity === 0 ? 'out_of_stock' : nextQuantity <= item.reorder_level ? 'low_stock' : 'in_stock';

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity: nextQuantity, status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (!error) {
        await supabase.from('warehouse_activity').insert({
          action: type,
          title: type === 'received' ? 'Stock received via Pip AI' : 'Stock dispatched via Pip AI',
          detail: `${quantity} units • ${item.name}`,
          quantity,
        });
      }
    } catch (err) {
      console.warn('Error saving movement to Supabase:', err);
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQuantity, status: nextStatus } : i))
    );
    setActivity((prev) => [
      {
        id: String(Date.now()),
        action: type,
        title: type === 'received' ? 'Stock received via Pip AI' : 'Stock dispatched via Pip AI',
        detail: `${quantity} units • ${item.name}`,
        quantity,
        created_at: new Date().toISOString(),
      },
      ...prev.slice(0, 4),
    ]);
    setNotice(
      type === 'received'
        ? `Pip restocked +${quantity} units into ${item.name}.`
        : `Pip dispatched ${quantity} units from ${item.name}.`
    );
  };

  if (authLoading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="brand-mark" style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}>
            <Boxes size={28} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontFamily: 'Space Grotesk', margin: '0 0 6px', fontSize: '20px' }}>SmartStock Workspace</h2>
          <p style={{ color: '#777180', fontSize: '12px', margin: 0 }}>Connecting to secure warehouse session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('overview')} aria-label="Go to overview">
          <span className="brand-mark"><Boxes size={24} strokeWidth={2.5} /></span>
          <span><strong>SmartStock</strong><small>Workspace</small></span>
          <b className="version">v3.0 <span>▰</span></b>
        </button>
        <div className="top-actions">
          <button className="icon-button" aria-label="Notifications"><Bell size={20} /><i /></button>
          <div className="profile-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              className="avatar-button"
              aria-label="Open profile"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              title={`${currentUser.name} (${currentUser.email})`}
            >
              <span>{currentUser.name.slice(0, 3).toUpperCase()}</span>
            </button>
            {profileMenuOpen && (
              <div className="profile-popover">
                <div className="profile-header">
                  <div className="profile-badge-avatar">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="profile-details">
                    <strong>{currentUser.name}</strong>
                    <small>{currentUser.email}</small>
                  </div>
                </div>
                <div className="profile-role-tag">
                  {currentUser.role} {currentUser.isDemo ? '• Demo Mode' : '• Verified'}
                </div>
                <button className="profile-logout-btn" onClick={handleSignOut}>
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {notice && <div className="toast"><Check size={16} /> {notice}<button onClick={() => setNotice('')}><X size={15} /></button></div>}
        {view === 'overview' && <Overview userName={currentUser.name.split(' ')[0]} items={items} activity={activity} stats={stats} loading={loading} onView={setView} onAction={setModal} />}
        {view === 'inventory' && <Inventory items={filteredItems} search={search} onSearch={setSearch} onRefresh={loadData} onAction={setModal} onNotice={setNotice} />}
        {view === 'copilot' && <Copilot items={items} activity={activity} onAction={setModal} onQuickMovement={handleQuickMovement} onNavigateTab={setView} />}
        {view === 'products' && <Products items={items} onNotice={setNotice} />}
        {view === 'more' && <More onNotice={setNotice} onSignOut={handleSignOut} />}
      </main>

      <nav className="bottom-nav">
        <NavItem icon={<LayoutDashboard size={19} />} label="Overview" active={view === 'overview'} onClick={() => setView('overview')} />
        <NavItem icon={<Package size={19} />} label="Products" active={view === 'products'} onClick={() => setView('products')} />
        <NavItem icon={<Warehouse size={19} />} label="Inventory" active={view === 'inventory'} onClick={() => setView('inventory')} />
        <NavItem icon={<Sparkles size={19} />} label="Copilot" active={view === 'copilot'} onClick={() => setView('copilot')} />
        <NavItem icon={<Menu size={19} />} label="More" active={view === 'more'} onClick={() => setView('more')} />
      </nav>

      {modal && <MovementModal type={modal} onClose={() => setModal(null)} onConfirm={addMovement} />}
    </div>
  );
}

function Overview({ userName, items, activity, stats, loading, onView, onAction }: { userName: string; items: InventoryItem[]; activity: WarehouseActivity[]; stats: { units: number; value: number; low: number }; loading: boolean; onView: (view: View) => void; onAction: (modal: Modal) => void }) {
  return <div className="page-grid">
    <section className="hero-card">
      <div className="hero-copy"><div className="eyebrows"><span>● Live &amp; Buzzing</span><span>♛ Super Admin</span></div><h1>Welcome back, {userName}!</h1><p>Your warehouses are vibing at <strong>98%</strong> efficiency today.</p></div>
      <div className="hero-box"><div className="box-art">▦</div><span>Boxie <b>AI</b></span></div><Sparkles className="hero-spark" size={18} />
    </section>
    <section className="section-heading"><div><Zap size={15} /> SPEEDY HUMAN ACTIONS</div><button onClick={() => onView('inventory')}>Slide for more <ArrowRight size={14} /></button></section>
    <section className="action-row"><button className="action purple" onClick={() => onView('products')}><Plus size={16} /> New Goodie <span>◆</span></button><button className="action yellow" onClick={() => onAction('receive')}><Truck size={16} /> Receive Stock <span>▰</span></button><button className="action white" onClick={() => onAction('dispatch')}><ArrowUpFromLine size={16} /> Dispatch</button></section>
    <section className="alert-card"><div className="alert-icon"><PackageCheck size={24} /></div><div><div className="card-title">Whizzy Radar Alert! <span>♟ 🌬</span></div><label>URGENT</label><p><strong>3 fast-moving SKUs</strong> will run dry in <b className="pink-text">4 days</b>! Replenish 350 units right now.</p><button className="small-yellow" onClick={() => onView('inventory')}>↗ Auto-Reorder for Me <span>🛒</span></button><small>♧ Estimated: $4,850</small></div></section>
    <section className="metrics"><Metric label="ALL GOODIES" value={stats.units.toLocaleString()} detail="+12% this mo 🚀" icon={<Boxes size={18} />} /><Metric label="TOTAL STACKS" value="48,290" detail="98% capacity 📦" icon={<BarChart3 size={18} />} purple /><Metric label="LOW STOCK 🚨" value={`${stats.low} items`} detail="Feed the shelves!" icon={<AlertTriangle size={18} />} pink /><Metric label="WAREHOUSE LOOT" value={`$${Math.round(stats.value / 1000)}k`} detail="+8.4% cha-ching!" icon={<Package size={18} />} yellow /></section>
    <section className="chart-card"><div className="section-title"><div><h2>Box Flow Velocity 🚀</h2><p>Past 7 Days (Inflow vs Outflow)</p></div><span className="chart-pill">Net: +530 📦</span></div><div className="legend"><span><i className="dot yellow-dot" /> Inflow (Stock in)</span><span><i className="dot purple-dot" /> Outflow (Shipped)</span></div><div className="bar-chart">{[42, 24, 12, 58, 66, 82, 96].map((height, index) => <div className="bar-group" key={index}><div className="bars"><i style={{ height: `${height}%` }} /><b style={{ height: `${Math.max(25, height - 18)}%` }} /></div><small>{['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Today'][index]}</small></div>)}</div></section>
    <section><div className="section-title feed-title"><h2>Recent Warehouse Buzz</h2><span className="new-pill">3 new</span><button onClick={() => onView('inventory')}>View Log <ChevronRight size={14} /></button></div><div className="activity-list">{(loading ? activity.slice(0, 3) : activity).map((entry) => <ActivityRow key={entry.id} entry={entry} />)}</div></section>
    <section className="copilot-promo"><div><h2>Got Boxie Questions?</h2><p>Whizzy Copilot is trained on your exact bin location map.</p><button onClick={() => onView('copilot')}>Ask Copilot <Sparkles size={14} /></button></div><div className="map-art">⌁<br /><span>⌗</span></div></section>
    <div className="uptime"><span /> ERP Database Connection 100% Happy &amp; Humming • v3.4.1</div>
  </div>;
}

function Inventory({ items, search, onSearch, onRefresh, onAction, onNotice }: { items: InventoryItem[]; search: string; onSearch: (value: string) => void; onRefresh: () => Promise<void>; onAction: (modal: Modal) => void; onNotice: (message: string) => void }) {
  return <div className="page-grid inventory-page"><div className="page-heading"><div><p className="eyebrow">LIVE TELEMETRY <span>●</span></p><h1>Inventory Hub <Sparkles size={19} /></h1></div><button className="refresh" onClick={() => void onRefresh()}><RefreshCw size={16} /> Refresh</button></div><section className="capacity-card"><div><small>BAY 1-4 TOTAL CAPACITY</small><strong>42,850 <em>Units</em></strong><p>Storage Occupancy <b>92%</b></p><div className="capacity-bar"><span /></div></div><div className="package-illustration">▰</div></section><section className="in-out"><div><small>STOCK IN</small><strong>+680</strong><span>Units received</span><b>◆ 8 manifests</b></div><div><small>STOCK OUT</small><strong>-420</strong><span>Units dispatched</span><b>◆ 19 outbound vans</b></div></section><section><div className="quick-heading"><h2>Quick Operations</h2><span>STAMP &amp; GO ✦</span></div><div className="operation-list"><button className="operation yellow" onClick={() => onAction('receive')}><ArrowDownToLine /><span><b>Stock In</b><small>Receive Cargo &amp; Scan Bins</small></span><ArrowRight /></button><button className="operation purple" onClick={() => onAction('dispatch')}><Truck /><span><b>Stock Out</b><small>Dispatch Order Manifest</small></span><ArrowRight /></button><button className="operation white" onClick={() => onNotice('Audit mode is ready for your next barcode cycle.')}><ClipboardCheck /><span><b>Stock Audit &amp; Adjustment</b><small>Barcode cycle count</small></span><ArrowRight /></button></div></section><div className="filter-pills"><button>All Stacks ({items.length})</button><button>Low Stock ({items.filter((item) => item.status !== 'in_stock').length}) ⚠</button><button>Empty Rack</button></div><section><div className="section-title"><h2>Urgent Items <i className="red-dot" /></h2><span className="urgent-count">3 Actionable</span></div><div className="urgent-list">{items.filter((item) => item.status !== 'in_stock').map((item) => <UrgentItem key={item.id} item={item} onNotice={onNotice} />)}</div></section><section className="bounce-card"><div className="section-title"><h2>↔ Recent Bounces</h2><span className="realtime">Realtime</span></div>{['+120 Ultra-Wide Monitors', '-45 Wireless Headsets', '-18 Ergonomic Mats'].map((text, index) => <div className="bounce-row" key={text}><span className={`bounce-icon b${index}`}>{index === 0 ? '+' : '−'}</span><div><b>{text}</b><small>{['Bin A-14 • Received by Alex V.', 'Dock 3 Dispatch • Elena K.', 'Bin C-02 • Marcus T.'][index]}</small></div><time>{['Just now', '14m ago', '42m ago'][index]}</time></div>)}</section></div>;
}

function Copilot({ items, activity, onAction, onQuickMovement, onNavigateTab }: { items: InventoryItem[]; activity: WarehouseActivity[]; onAction: (modal: Modal) => void; onQuickMovement: (item: InventoryItem, type: 'received' | 'dispatched', qty: number) => Promise<void>; onNavigateTab: (view: View) => void }) {
  return (
    <div className="page-grid copilot-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SMART ASSISTANT</p>
          <h1>Pip &amp; Boxie AI <Sparkles size={19} /></h1>
        </div>
        <div className="copilot-orb">✦</div>
      </div>
      <Chatbot items={items} activity={activity} onAction={onAction} onQuickMovement={onQuickMovement} onNavigateTab={onNavigateTab} />
    </div>
  );
}

function Products({ items, onNotice }: { items: InventoryItem[]; onNotice: (message: string) => void }) { return <div className="page-grid products-page"><div className="page-heading"><div><p className="eyebrow">CATALOG MANAGEMENT</p><h1>Products</h1></div><button className="add-button" onClick={() => onNotice('Product creation is ready for your next catalog item.')}><Plus size={17} /> Add Product</button></div><div className="search-box"><Search size={17} /><input placeholder="Search your catalog" /><span>{items.length} items</span></div><div className="product-grid">{items.map((item) => <article className="product-card" key={item.id}><div className="product-art">{item.category === 'Furniture' ? '▱' : item.category === 'Electronics' ? '▣' : '▦'}</div><div><span className={`status ${item.status}`}>{item.status.replace('_', ' ')}</span><h2>{item.name}</h2><p>{item.sku} · {item.location}</p><strong>{item.quantity} <small>units</small></strong></div><button onClick={() => onNotice(`${item.name} selected.`)}><ChevronRight size={17} /></button></article>)}</div></div>; }

function More({ onNotice, onSignOut }: { onNotice: (message: string) => void; onSignOut: () => void }) {
  return (
    <div className="page-grid more-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE SETTINGS</p>
          <h1>More</h1>
        </div>
      </div>
      {[
        { label: 'Settings', icon: Settings },
        { label: 'Team members', icon: Boxes },
        { label: 'Help center', icon: CircleHelp },
        { label: 'Activity history', icon: Clock3 },
      ].map(({ label, icon: Icon }) => (
        <button className="more-row" key={label} onClick={() => onNotice(`${label} is ready to open.`)}>
          <Icon size={20} />
          <span>{label}</span>
          <ChevronRight size={18} />
        </button>
      ))}
      <button
        className="more-row"
        style={{ color: '#a31f2d', background: '#fff2f2', borderColor: '#a31f2d' }}
        onClick={onSignOut}
      >
        <LogOut size={20} />
        <span>Sign Out</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function Metric({ label, value, detail, icon, purple = false, pink = false, yellow = false }: { label: string; value: string; detail: string; icon: React.ReactNode; purple?: boolean; pink?: boolean; yellow?: boolean }) { return <div className={`metric ${purple ? 'metric-purple' : ''} ${pink ? 'metric-pink' : ''} ${yellow ? 'metric-yellow' : ''}`}><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>{icon}</div>; }
function ActivityRow({ entry }: { entry: WarehouseActivity }) { return <div className="activity-row"><span className={`activity-icon ${entry.action}`}>{entry.action === 'received' ? '◉' : entry.action === 'alert' ? '▣' : '▰'}</span><div><b>{entry.title}</b><small>{entry.detail}</small></div><time>{entry.action === 'received' ? '8m ago' : entry.action === 'audit' ? '42m ago' : '1h ago'}</time></div>; }
function UrgentItem({ item, onNotice }: { item: InventoryItem; onNotice: (message: string) => void }) { return <article className="urgent-item"><div><span className={`status ${item.status}`}>{item.status === 'out_of_stock' ? 'OUT OF STOCK' : 'OUT IN ~2 DAYS'}</span><small>{item.sku}</small><h3>{item.name}</h3><p>Available: <b>{item.quantity} units</b> • Threshold: {item.reorder_level}</p><footer>⌾ {item.location}</footer></div><button onClick={() => onNotice(`Restock request started for ${item.name}.`)}>{item.status === 'out_of_stock' ? 'Track Delivery' : 'Restock Now'}</button></article>; }
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>; }
function MovementModal({ type, onClose, onConfirm }: { type: 'receive' | 'dispatch'; onClose: () => void; onConfirm: (type: 'received' | 'dispatched', quantity: number) => Promise<void> }) { const [quantity, setQuantity] = useState(50); return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18} /></button><div className="modal-icon">{type === 'receive' ? <ArrowDownToLine /> : <ArrowUpFromLine />}</div><p className="eyebrow">QUICK OPERATION</p><h2>{type === 'receive' ? 'Receive Stock' : 'Dispatch Stock'}</h2><p>Update the live warehouse count with a new movement.</p><label>Units</label><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><button className="modal-submit" onClick={() => void onConfirm(type === 'receive' ? 'received' : 'dispatched', quantity)}>{type === 'receive' ? 'Add to warehouse' : 'Dispatch units'} <ArrowRight size={17} /></button></div></div>; }

export default App;
