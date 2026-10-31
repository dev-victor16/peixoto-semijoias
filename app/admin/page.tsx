'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  products: { total: number; published: number; lowStock: number; outOfStock: number };
  orders: { total: number; awaitingContact: number; inService: number; confirmed: number; completed: number; cancelled: number };
  financial: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    netMargin: number;
    pendingValue: number;
    inventory: { total_units: number; retail_value: number; cost_value: number };
  };
  topProducts: Array<{
    product_name: string;
    product_sku: string;
    total_sold: number;
    total_revenue: number;
    image_url?: string;
  }>;
  recentOrders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    total: number;
    status: string;
    created_at: string;
  }>;
}

interface ProductItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  published: number;
  category_name?: string;
  materials?: string;
  image?: string;
  primary_image?: string;
  first_image?: string;
}

interface ExpenseItem {
  id: number;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

interface OrderItem {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  created_at: string;
}

type TabType = 'dashboard' | 'financeiro' | 'produtos' | 'gastos' | 'pedidos' | 'configuracoes';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);

  // Dados
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Modais e formulários
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Novo/Edição de produto de Semijoia
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    category_id: '1',
    stock_quantity: '1',
    materials: 'Banho a Prata 925 (Antialérgica)',
    image_url: '',
    description: '',
    published: true,
  });

  // Nova despesa
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Geral',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Configurações
  const [settingsForm, setSettingsForm] = useState({
    whatsapp_number: '',
    instagram: '',
    store_name: '',
    store_description: '',
    shipping_info: '',
    warranty_info: ''
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          router.push('/admin/login');
          throw new Error('Não autenticado');
        }
        return res.json();
      })
      .then(data => {
        setUser(data.user);
        loadAllData();
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, []);

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dashRes, prodRes, expRes, ordRes, setRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/products?limit=100'),
        fetch('/api/expenses'),
        fetch('/api/orders?limit=100'),
        fetch('/api/settings')
      ]);

      if (dashRes.ok) setDashData(await dashRes.json());
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData.expenses || []);
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      }
      if (setRes.ok) {
        const sData = await setRes.json();
        setSettings(sData);
        setSettingsForm({
          whatsapp_number: sData.whatsapp_number || '',
          instagram: sData.instagram || '',
          store_name: sData.store_name || '',
          store_description: sData.store_description || '',
          shipping_info: sData.shipping_info || '',
          warranty_info: sData.warranty_info || ''
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const [isUploading, setIsUploading] = useState(false);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      sku: `PX-${Date.now().toString().slice(-4)}`,
      price: '',
      cost_price: '',
      category_id: '1',
      stock_quantity: '1',
      materials: 'Banho a Prata 925 (Antialérgica)',
      image_url: '',
      description: '',
      published: true
    });
    setShowProductModal(true);
  };

  const openEditProduct = (prod: ProductItem) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name,
      sku: prod.sku,
      price: prod.price?.toString() || '',
      cost_price: prod.cost_price?.toString() || '',
      category_id: '1',
      stock_quantity: prod.stock_quantity?.toString() || '0',
      materials: prod.materials || 'Banho a Prata 925 (Antialérgica)',
      image_url: prod.image || prod.primary_image || prod.first_image || '',
      description: '',
      published: prod.published === 1
    });
    setShowProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 5MB.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao enviar imagem');
      }

      const data = await res.json();
      setProdForm(prev => ({ ...prev, image_url: data.url }));
      showToast('Foto da semijoia carregada com sucesso!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro no envio da foto', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const bodyData: Record<string, unknown> = {
        name: prodForm.name,
        sku: prodForm.sku || `PX-${Date.now().toString().slice(-4)}`,
        price: parseFloat(prodForm.price) || 0,
        cost_price: parseFloat(prodForm.cost_price) || 0,
        category_id: parseInt(prodForm.category_id) || 1,
        stock_quantity: parseInt(prodForm.stock_quantity) || 0,
        materials: prodForm.materials,
        description: prodForm.description,
        published: prodForm.published ? 1 : 0
      };

      if (prodForm.image_url.trim()) {
        bodyData.images = [{ url: prodForm.image_url.trim(), alt: prodForm.name }];
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao salvar semijoia');
      }

      showToast(isEdit ? 'Semijoia atualizada com sucesso!' : 'Semijoia cadastrada com sucesso!');
      setShowProductModal(false);
      setEditingProduct(null);
      loadAllData(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir/arquivar a peça "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        showToast('Peça removida com sucesso!');
        loadAllData(true);
      } else {
        throw new Error('Falha ao remover produto');
      }
    } catch {
      showToast('Erro ao excluir semijoia', 'error');
    }
  };

  const togglePublish = async (id: number, current: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: current === 1 ? 0 : 1 })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, published: current === 1 ? 0 : 1 } : p));
        showToast('Status atualizado!');
      }
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      if (!res.ok) throw new Error('Erro ao salvar gasto');

      showToast('Gasto registrado com sucesso!');
      setShowExpenseModal(false);
      setExpenseForm({
        description: '',
        category: 'Geral',
        amount: '',
        expense_date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      loadAllData(true);
    } catch {
      showToast('Erro ao registrar', 'error');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Deseja excluir esta despesa?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses(prev => prev.filter(e => e.id !== id));
        showToast('Despesa excluída!');
        loadAllData(true);
      }
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  const handleUpdateOrderStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast('Status do pedido atualizado!');
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        loadAllData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Erro ao atualizar status', 'error');
      }
    } catch {
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const handleUpdateOrderPayment = async (id: number, field: 'payment_method' | 'payment_status', value: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        showToast(field === 'payment_method' ? 'Forma de pagamento atualizada!' : 'Situação do pagamento atualizada!');
        setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
        loadAllData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Erro ao atualizar pagamento', 'error');
      }
    } catch {
      showToast('Erro ao atualizar pagamento', 'error');
    }
  };

  const handleUpdateOrderCustomer = async (id: number, customer_name: string, customer_phone: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name, customer_phone })
      });
      if (res.ok) {
        showToast('Dados do cliente salvos!');
        setOrders(prev => prev.map(o => o.id === id ? { ...o, customer_name, customer_phone } : o));
        loadAllData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Erro ao salvar cliente', 'error');
      }
    } catch {
      showToast('Erro ao salvar cliente', 'error');
    }
  };

  const handleDeleteOrder = async (id: number, orderNumber: string) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido ${orderNumber}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== id));
        showToast(`Pedido ${orderNumber} excluído com sucesso!`);
        loadAllData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Erro ao excluir pedido', 'error');
      }
    } catch {
      showToast('Erro ao conectar ao servidor para excluir', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) showToast('Configurações salvas!');
    } catch {
      showToast('Erro ao salvar', 'error');
    }
  };

  const fmtCurrency = (val?: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="admin-shell">
      {/* Toast Alert */}
      {feedbackMsg && (
        <div className={`admin-toast admin-toast-${feedbackMsg.type}`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Overlay Backdrop Mobile */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* SIDEBAR NAVEGAÇÃO FIXA À ESQUERDA (ESTILO ZOM MULTIMARCAS) */}
      {/* ========================================================= */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div>
          {/* Logo & Marca Oficial Use Peixoto */}
          <div className="admin-sidebar-brand">
            <div className="admin-sidebar-badge">
              <img
                src="/logo.png"
                alt="Logo Use Peixoto"
                style={{ height: '26px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="admin-sidebar-title">Use Peixoto</span>
              <span className="admin-sidebar-subtitle">Painel de Semijoias</span>
            </div>
            {/* Fechar no mobile */}
            <button
              type="button"
              className="admin-mobile-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Menus Verticais */}
          <nav className="admin-sidebar-nav">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`admin-sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('financeiro'); setMobileMenuOpen(false); }}
              className={`admin-sidebar-link ${activeTab === 'financeiro' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">payments</span>
              <span>Lucros & DRE</span>
            </button>

            <button
              onClick={() => { setActiveTab('produtos'); setMobileMenuOpen(false); }}
              className={`admin-sidebar-link ${activeTab === 'produtos' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">diamond</span>
              <span>Produtos & Estoque</span>
            </button>

            <button
              onClick={() => { setActiveTab('gastos'); setMobileMenuOpen(false); }}
              className={`admin-sidebar-link ${activeTab === 'gastos' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">trending_down</span>
              <span>Controle de Gastos</span>
            </button>

            <button
              onClick={() => { setActiveTab('pedidos'); setMobileMenuOpen(false); }}
              className={`admin-sidebar-link ${activeTab === 'pedidos' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">shopping_bag</span>
              <span>Pedidos WhatsApp</span>
            </button>

            <button
              onClick={() => { setActiveTab('configuracoes'); setMobileMenuOpen(false); }}
              className={`admin-sidebar-link ${activeTab === 'configuracoes' ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* Rodapé do Usuário na Sidebar */}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-userinfo">
            <div className="admin-user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <span className="admin-user-name">{user?.name || 'Administrador'}</span>
              <span className="admin-user-role">Super Admin</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="admin-sidebar-logout"
            title="Encerrar sessão"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* ÁREA DE CONTEÚDO PRINCIPAL (DIREITA COM TOPBAR)           */}
      {/* ========================================================= */}
      <div className="admin-main-container">
        {/* Topbar Superior */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              type="button"
              className="admin-mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <h1 className="admin-topbar-title">
                {activeTab === 'dashboard' && 'Dashboard de Performance'}
                {activeTab === 'financeiro' && 'Demonstrativo de Lucros (DRE)'}
                {activeTab === 'produtos' && 'Gestão de Joias & Estoque'}
                {activeTab === 'gastos' && 'Controle de Custos & Despesas'}
                {activeTab === 'pedidos' && 'Atendimento de Pedidos WhatsApp'}
                {activeTab === 'configuracoes' && 'Configurações da Loja'}
              </h1>
              <p className="admin-topbar-subtitle">
                {activeTab === 'dashboard' && 'Visão executiva em tempo real de faturamento, margem e estoque'}
                {activeTab === 'financeiro' && 'Estrutura detalhada de receita bruta, CMV, despesas e lucro líquido'}
                {activeTab === 'produtos' && 'Catálogo, preços de custo/venda e movimentações de inventário'}
                {activeTab === 'gastos' && 'Lançamento e controle de despesas operacionais da marca'}
                {activeTab === 'pedidos' && 'Acompanhamento do funil de conversão de sacolas via WhatsApp'}
                {activeTab === 'configuracoes' && 'Controle total dos canais de atendimento e dados da marca'}
              </p>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button onClick={() => loadAllData()} className="admin-topbar-btn" title="Atualizar dados">
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
              <span className="btn-label-desktop">Atualizar</span>
            </button>
            <a href="/" target="_blank" className="admin-topbar-btn" title="Ver catálogo público">
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>storefront</span>
              <span className="btn-label-desktop">Ver Loja ↗</span>
            </a>
          </div>
        </header>

        {/* Corpo da Página */}
        <main className="admin-content">
          {loading ? (
            <div className="admin-loading">Carregando painel master...</div>
          ) : (
            <>
              {/* ------------------------------------------------------------- */}
              {/* 1. ABA DASHBOARD (ESTILO ZOM COM CARDS ARREDONDADOS 24px)     */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'dashboard' && (
                <div>
                  {/* Grid de 4 KPIs */}
                  <div className="admin-kpi-grid">
                    {/* Lucro Líquido */}
                    <div className="admin-kpi-card kpi-profit-net">
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-label">Lucro Líquido Real</span>
                        <div className="admin-kpi-icon-box">
                          <span className="material-symbols-outlined">verified</span>
                        </div>
                      </div>
                      <div className="admin-kpi-value">
                        {fmtCurrency(dashData?.financial.netProfit)}
                      </div>
                      <div className="admin-kpi-footer">
                        <span>Margem líquida de</span>
                        <strong style={{ color: '#059669' }}>
                          {(dashData?.financial.netMargin || 0).toFixed(1)}%
                        </strong>
                      </div>
                    </div>

                    {/* Lucro Bruto */}
                    <div className="admin-kpi-card kpi-profit-gross">
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-label">Lucro Bruto</span>
                        <div className="admin-kpi-icon-box">
                          <span className="material-symbols-outlined">trending_up</span>
                        </div>
                      </div>
                      <div className="admin-kpi-value">
                        {fmtCurrency(dashData?.financial.grossProfit)}
                      </div>
                      <div className="admin-kpi-footer">
                        <span>Faturamento menos custo de peças</span>
                      </div>
                    </div>

                    {/* Faturamento Concluído */}
                    <div className="admin-kpi-card kpi-revenue">
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-label">Faturamento Pago</span>
                        <div className="admin-kpi-icon-box">
                          <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                      </div>
                      <div className="admin-kpi-value">
                        {fmtCurrency(dashData?.financial.revenue)}
                      </div>
                      <div className="admin-kpi-footer">
                        <span>{dashData?.orders.completed || 0} pedidos concluídos</span>
                      </div>
                    </div>

                    {/* Gastos / Despesas */}
                    <div className="admin-kpi-card kpi-expenses">
                      <div className="admin-kpi-header">
                        <span className="admin-kpi-label">Despesas Operacionais</span>
                        <div className="admin-kpi-icon-box">
                          <span className="material-symbols-outlined">receipt_long</span>
                        </div>
                      </div>
                      <div className="admin-kpi-value">
                        {fmtCurrency(dashData?.financial.totalExpenses)}
                      </div>
                      <div className="admin-kpi-footer">
                        <span>Gastos de operação registrados</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumos de Estoque & Pedidos */}
                  <div className="admin-two-cols-grid">
                    <div className="admin-card-section" style={{ margin: 0 }}>
                      <div className="admin-card-section-header">
                        <h3 className="admin-card-section-title">Controle de Estoque & Inventário</h3>
                        <button onClick={() => setActiveTab('produtos')} className="admin-topbar-btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.68rem' }}>
                          Gerenciar →
                        </button>
                      </div>
                      <div className="admin-stat-row">
                        <span>Total de peças cadastradas:</span>
                        <strong>{dashData?.products.total} itens</strong>
                      </div>
                      <div className="admin-stat-row">
                        <span>Itens ativos na vitrine:</span>
                        <strong>{dashData?.products.published} peças</strong>
                      </div>
                      <div className="admin-stat-row stat-warning">
                        <span>Alerta de estoque baixo (≤3 un):</span>
                        <span className="zom-badge zom-badge-yellow">{dashData?.products.lowStock} peças</span>
                      </div>
                      <div className="admin-stat-row">
                        <span>Capital em estoque (preço de custo):</span>
                        <strong>{fmtCurrency(dashData?.financial.inventory.cost_value)}</strong>
                      </div>
                      <div className="admin-stat-row">
                        <span>Potencial de faturamento em estoque:</span>
                        <strong style={{ color: '#059669' }}>{fmtCurrency(dashData?.financial.inventory.retail_value)}</strong>
                      </div>
                    </div>

                    <div className="admin-card-section" style={{ margin: 0 }}>
                      <div className="admin-card-section-header">
                        <h3 className="admin-card-section-title">Funil de Pedidos (WhatsApp)</h3>
                        <button onClick={() => setActiveTab('pedidos')} className="admin-topbar-btn" style={{ padding: '0.35rem 0.75rem', fontSize: '0.68rem' }}>
                          Ver todos →
                        </button>
                      </div>
                      <div className="admin-stat-row">
                        <span>Aguardando atendimento:</span>
                        <span className="zom-badge zom-badge-yellow">{dashData?.orders.awaitingContact}</span>
                      </div>
                      <div className="admin-stat-row">
                        <span>Em atendimento no WhatsApp:</span>
                        <span className="zom-badge zom-badge-blue">{dashData?.orders.inService}</span>
                      </div>
                      <div className="admin-stat-row">
                        <span>Confirmados / Pagos:</span>
                        <span className="zom-badge zom-badge-green">{dashData?.orders.confirmed}</span>
                      </div>
                      <div className="admin-stat-row">
                        <span>Vendas concluídas (entregues):</span>
                        <strong style={{ color: '#059669' }}>{dashData?.orders.completed}</strong>
                      </div>
                      <div className="admin-stat-row">
                        <span>Valor em negociação (pendente):</span>
                        <strong>{fmtCurrency(dashData?.financial.pendingValue)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Top Vendas */}
                  <div className="admin-card-section">
                    <div className="admin-card-section-header">
                      <h3 className="admin-card-section-title">Semijoias Mais Vendidas</h3>
                    </div>
                    {dashData?.topProducts && dashData.topProducts.length > 0 ? (
                      <table className="admin-zom-table">
                        <thead>
                          <tr>
                            <th>Produto</th>
                            <th>SKU</th>
                            <th>Unidades Vendidas</th>
                            <th>Faturamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashData.topProducts.map((tp, idx) => (
                            <tr key={idx}>
                              <td><strong>{tp.product_name}</strong></td>
                              <td><code>{tp.product_sku}</code></td>
                              <td><span className="zom-badge zom-badge-gray">{tp.total_sold} un</span></td>
                              <td><strong>{fmtCurrency(tp.total_revenue)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty">Nenhuma venda concluída registrada ainda.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 2. ABA FINANCEIRO / DRE DE LUCRO                              */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'financeiro' && (
                <div>
                  <div className="zom-dre-box">
                    <div className="zom-dre-item" style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>Descrição Contábil</span>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>Valor Total</span>
                    </div>

                    <div className="zom-dre-item">
                      <span style={{ color: '#10b981', fontWeight: 700 }}>(+) Faturamento Bruto (Pedidos Concluídos)</span>
                      <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{fmtCurrency(dashData?.financial.revenue)}</strong>
                    </div>

                    <div className="zom-dre-item">
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>(-) Custo das Semijoias Vendidas (CMV)</span>
                      <strong style={{ color: '#f43f5e' }}>- {fmtCurrency(dashData?.financial.costOfGoodsSold)}</strong>
                    </div>

                    <div className="zom-dre-item zom-dre-highlight">
                      <span>(=) LUCRO BRUTO DA MARCA</span>
                      <strong style={{ fontSize: '1.2rem', color: '#1a2234' }}>{fmtCurrency(dashData?.financial.grossProfit)}</strong>
                    </div>

                    <div className="zom-dre-item">
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>(-) Despesas e Gastos Operacionais</span>
                      <strong style={{ color: '#f43f5e' }}>- {fmtCurrency(dashData?.financial.totalExpenses)}</strong>
                    </div>

                    <div className="zom-dre-item zom-dre-result">
                      <div>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#065f46', textTransform: 'uppercase' }}>
                          (=) LUCRO LÍQUIDO REAL
                        </span>
                        <small style={{ display: 'block', color: '#047857', fontWeight: 600 }}>
                          Dinheiro livre que sobra no bolso após todos os custos e despesas
                        </small>
                      </div>
                      <div className="zom-dre-result-val">
                        {fmtCurrency(dashData?.financial.netProfit)}
                      </div>
                    </div>
                  </div>

                  <div className="admin-two-cols-grid" style={{ marginTop: '1.5rem' }}>
                    <div className="admin-card-section" style={{ margin: 0 }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Margem Líquida da Operação
                      </h4>
                      <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#5B6E9A', margin: '0.3rem 0' }}>
                        {(dashData?.financial.netMargin || 0).toFixed(1)}%
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Para cada R$ 100 vendidos, {(dashData?.financial.netMargin || 0).toFixed(1)} reais são lucro líquido limpo.
                      </p>
                    </div>

                    <div className="admin-card-section" style={{ margin: 0 }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Patrimônio em Peças Físicas
                      </h4>
                      <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a2234', margin: '0.3rem 0' }}>
                        {fmtCurrency(dashData?.financial.inventory.cost_value)}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Valor investido no estoque atual a preço de custo de atacado/fornecedor.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 3. ABA PRODUTOS & CONTROLE DE ESTOQUE (SEMIJOIAS USE PEIXOTO)  */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'produtos' && (() => {
                const filteredProducts = products.filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                    (p.materials && p.materials.toLowerCase().includes(productSearch.toLowerCase()));
                  const matchesCat = selectedCategoryFilter === 'all' || p.category_name?.toLowerCase() === selectedCategoryFilter.toLowerCase();
                  return matchesSearch && matchesCat;
                });

                return (
                  <div>
                    <div className="admin-card-section">
                      <div className="admin-card-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 className="admin-card-section-title">Estoque de Semijoias ({products.length} peças cadastradas)</h3>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Gerencie peças, estoques mínimos e precificação.
                          </p>
                        </div>
                        <button onClick={openCreateProduct} className="zom-btn-primary">
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>diamond</span>
                          Nova Semijoia
                        </button>
                      </div>

                      {/* Barra de Filtros e Busca Rápida */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.4rem', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 240px', position: 'relative' }}>
                          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.15rem' }}>
                            search
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar por nome ou SKU..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            className="zom-input"
                            style={{ paddingLeft: '2.5rem', width: '100%' }}
                          />
                        </div>
                        <div style={{ flex: '0 0 auto' }}>
                          <select
                            value={selectedCategoryFilter}
                            onChange={e => setSelectedCategoryFilter(e.target.value)}
                            className="zom-input"
                            style={{ width: 'auto', padding: '0.85rem 1rem' }}
                          >
                            <option value="all">Todas as Categorias</option>
                            <option value="brincos">Brincos</option>
                            <option value="colares">Colares</option>
                            <option value="aneis">Anéis</option>
                            <option value="pulseiras">Pulseiras</option>
                            <option value="conjuntos">Conjuntos</option>
                          </select>
                        </div>
                      </div>

                      <div className="admin-table-responsive">
                        <table className="admin-zom-table">
                          <thead>
                            <tr>
                              <th>Semijoia</th>
                              <th>SKU</th>
                              <th>Preço Venda</th>
                              <th>Preço Custo</th>
                              <th>Lucro Unitário</th>
                              <th>Estoque</th>
                              <th>Vitrine</th>
                              <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map(p => {
                              const thumb = p.image || p.primary_image || p.first_image || '/images/products/brinco-gota.jpg';
                              const profitUnit = (p.price || 0) - (p.cost_price || 0);
                              const isGold = (p.materials || '').toLowerCase().includes('ouro');
                              const isSilver = (p.materials || '').toLowerCase().includes('prata');
                              const isRose = (p.materials || '').toLowerCase().includes('ros');

                              return (
                                <tr key={p.id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                      <img
                                        src={thumb}
                                        alt={p.name}
                                        className="admin-thumb"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = '/logo.png';
                                        }}
                                      />
                                      <div>
                                        <strong style={{ display: 'block', color: '#1a2234', fontSize: '0.85rem' }}>
                                          {p.name}
                                        </strong>
                                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', alignItems: 'center' }}>
                                          <span className="zom-badge zom-badge-silver" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                                            Prata 925
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td><code>{p.sku}</code></td>
                                  <td><strong style={{ color: '#1a2234' }}>{fmtCurrency(p.price)}</strong></td>
                                  <td><span style={{ color: '#64748b' }}>{fmtCurrency(p.cost_price)}</span></td>
                                  <td>
                                    <strong style={{ color: profitUnit > 0 ? '#059669' : '#e11d48', fontSize: '0.8rem' }}>
                                      {profitUnit > 0 ? `+ ${fmtCurrency(profitUnit)}` : fmtCurrency(profitUnit)}
                                    </strong>
                                  </td>
                                  <td>
                                    <span className={`zom-badge ${p.stock_quantity <= 2 ? 'zom-badge-red' : 'zom-badge-green'}`}>
                                      {p.stock_quantity} un
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => togglePublish(p.id, p.published)}
                                      className={`zom-badge ${p.published ? 'zom-badge-green' : 'zom-badge-gray'}`}
                                      style={{ border: 'none', cursor: 'pointer' }}
                                      title="Clique para alternar visibilidade no site"
                                    >
                                      {p.published ? '✓ Visível' : 'Oculto'}
                                    </button>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                      <a
                                        href={`/produtos/${p.id}`}
                                        target="_blank"
                                        className="admin-btn-sm admin-btn-action-view"
                                        title="Ver produto na loja"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>visibility</span>
                                      </a>
                                      <button
                                        onClick={() => openEditProduct(p)}
                                        className="admin-btn-sm admin-btn-action-edit"
                                        title="Editar semijoia"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProduct(p.id, p.name)}
                                        className="admin-btn-sm admin-btn-action-delete"
                                        title="Remover semijoia"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ------------------------------------------------------------- */}
              {/* 4. ABA CONTROLE DE GASTOS                                     */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'gastos' && (
                <div>
                  <div className="admin-card-section">
                    <div className="admin-card-section-header">
                      <h3 className="admin-card-section-title">Despesas e Gastos da Loja</h3>
                      <button onClick={() => setShowExpenseModal(true)} className="zom-btn-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
                        Registrar Gasto
                      </button>
                    </div>

                    {expenses.length > 0 ? (
                      <table className="admin-zom-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                            <th>Observações</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map(exp => (
                            <tr key={exp.id}>
                              <td>{exp.expense_date}</td>
                              <td><strong>{exp.description}</strong></td>
                              <td><span className="zom-badge zom-badge-blue">{exp.category}</span></td>
                              <td><strong style={{ color: '#e11d48' }}>- {fmtCurrency(exp.amount)}</strong></td>
                              <td><span style={{ color: '#64748b' }}>{exp.notes || '—'}</span></td>
                              <td>
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="admin-btn-danger-sm"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty">Nenhum gasto registrado ainda.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 5. ABA PEDIDOS RECEBIDOS                                      */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'pedidos' && (
                <div>
                  <div className="admin-card-section">
                    <div className="admin-card-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 className="admin-card-section-title">Pedidos Recebidos ({orders.length})</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                          Gerencie status, forma de pagamento, confirmação e exclusão de pedidos via WhatsApp.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadAllData(true)}
                        className="admin-topbar-btn"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
                        Atualizar
                      </button>
                    </div>

                    {orders.length > 0 ? (
                      <div className="admin-table-responsive" style={{ overflowX: 'auto' }}>
                        <table className="admin-zom-table">
                          <thead>
                            <tr>
                              <th>Nº Pedido</th>
                              <th>Data</th>
                              <th>Cliente & WhatsApp</th>
                              <th>Total</th>
                              <th>Status Atendimento</th>
                              <th>Forma Pagamento</th>
                              <th>Situação Pagamento</th>
                              <th style={{ textAlign: 'center' }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(o => {
                              const payMethod = o.payment_method || 'pendente';
                              const payStatus = o.payment_status || (o.status === 'concluido' || o.status === 'confirmado' ? 'pago' : 'pendente');

                              return (
                                <tr key={o.id}>
                                  <td><strong>{o.order_number}</strong></td>
                                  <td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                                  
                                  {/* Cliente & WhatsApp editáveis diretamente */}
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '170px' }}>
                                      <input
                                        type="text"
                                        defaultValue={o.customer_name || ''}
                                        placeholder="Nome do cliente..."
                                        onBlur={e => {
                                          if (e.target.value !== (o.customer_name || '')) {
                                            handleUpdateOrderCustomer(o.id, e.target.value, o.customer_phone || '');
                                          }
                                        }}
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          fontSize: '0.8rem',
                                          borderRadius: '6px',
                                          border: '1px solid #cbd5e1',
                                          width: '100%'
                                        }}
                                        title="Clique para editar o nome e saia do campo para salvar"
                                      />
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <input
                                          type="text"
                                          defaultValue={o.customer_phone || ''}
                                          placeholder="(31) 99999-9999"
                                          onBlur={e => {
                                            if (e.target.value !== (o.customer_phone || '')) {
                                              handleUpdateOrderCustomer(o.id, o.customer_name || '', e.target.value);
                                            }
                                          }}
                                          style={{
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.78rem',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            flex: 1
                                          }}
                                          title="Clique para adicionar/editar o WhatsApp"
                                        />
                                        {o.customer_phone && o.customer_phone !== '—' && (
                                          <a
                                            href={`https://wa.me/${o.customer_phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              color: '#059669',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              background: '#ecfdf5',
                                              border: '1px solid #a7f3d0',
                                              borderRadius: '6px',
                                              padding: '0.25rem 0.45rem',
                                              textDecoration: 'none',
                                              fontSize: '0.85rem'
                                            }}
                                            title="Abrir WhatsApp"
                                          >
                                            💬
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td><strong style={{ color: '#1a2234' }}>{fmtCurrency(o.total)}</strong></td>
                                  
                                  {/* Status do Pedido no Funil */}
                                  <td>
                                    <select
                                      value={o.status}
                                      onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                                      className="admin-select-sm"
                                      style={{
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.55rem',
                                        fontWeight: 600,
                                        fontSize: '0.78rem',
                                        border: '1px solid #cbd5e1',
                                        background: o.status === 'concluido' ? '#ecfdf5' : o.status === 'cancelado' ? '#fef2f2' : o.status === 'confirmado' ? '#eff6ff' : '#fffbeb'
                                      }}
                                    >
                                      <option value="aguardando_contato">Aguardando Contato</option>
                                      <option value="em_atendimento">Em Atendimento</option>
                                      <option value="confirmado">Confirmado</option>
                                      <option value="concluido">Concluído (Entregue)</option>
                                      <option value="cancelado">Cancelado</option>
                                    </select>
                                  </td>

                                  {/* Forma de Pagamento */}
                                  <td>
                                    <select
                                      value={payMethod}
                                      onChange={e => handleUpdateOrderPayment(o.id, 'payment_method', e.target.value)}
                                      className="admin-select-sm"
                                      style={{ borderRadius: '8px', padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                                    >
                                      <option value="pendente">A Combinar</option>
                                      <option value="pix">PIX</option>
                                      <option value="credito">Cartão de Crédito</option>
                                      <option value="debito">Cartão de Débito</option>
                                      <option value="dinheiro">Dinheiro</option>
                                      <option value="link">Link de Pagamento</option>
                                    </select>
                                  </td>

                                  {/* Situação do Pagamento */}
                                  <td>
                                    <select
                                      value={payStatus}
                                      onChange={e => handleUpdateOrderPayment(o.id, 'payment_status', e.target.value)}
                                      className="admin-select-sm"
                                      style={{
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.55rem',
                                        fontWeight: 700,
                                        fontSize: '0.78rem',
                                        color: payStatus === 'pago' ? '#059669' : payStatus === 'estornado' ? '#dc2626' : '#d97706',
                                        background: payStatus === 'pago' ? '#dcfce7' : payStatus === 'estornado' ? '#fee2e2' : '#fef3c7'
                                      }}
                                    >
                                      <option value="pendente">⏳ Pendente</option>
                                      <option value="pago">✅ Pago</option>
                                      <option value="estornado">❌ Estornado</option>
                                    </select>
                                  </td>

                                  {/* Botão de Excluir */}
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(o.id, o.order_number)}
                                      className="admin-btn-danger-sm"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.35rem 0.65rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px'
                                      }}
                                      title="Excluir este pedido"
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }}>delete</span>
                                      Excluir
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="admin-empty">Ainda não há pedidos registrados.</div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* 6. ABA CONFIGURAÇÕES GERAIS                                  */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'configuracoes' && (
                <div>
                  <div className="admin-card-section" style={{ maxWidth: '680px' }}>
                    <div className="admin-card-section-header">
                      <h3 className="admin-card-section-title">Controle Geral da Loja</h3>
                    </div>

                    <form onSubmit={handleSaveSettings} className="admin-form">
                      <div className="zom-input-group">
                        <label className="zom-input-label">Nome Oficial da Marca</label>
                        <input
                          type="text"
                          value={settingsForm.store_name}
                          onChange={e => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
                          className="zom-input"
                        />
                      </div>

                      <div className="zom-input-group">
                        <label className="zom-input-label">WhatsApp de Atendimento</label>
                        <input
                          type="text"
                          value={settingsForm.whatsapp_number}
                          onChange={e => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })}
                          placeholder="(11) 99999-9999"
                          className="zom-input"
                        />
                      </div>

                      <div className="zom-input-group">
                        <label className="zom-input-label">Instagram Oficial</label>
                        <input
                          type="text"
                          value={settingsForm.instagram}
                          onChange={e => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                          placeholder="@usepeixoto"
                          className="zom-input"
                        />
                      </div>

                      <div className="zom-input-group">
                        <label className="zom-input-label">Política de Envio</label>
                        <textarea
                          rows={3}
                          value={settingsForm.shipping_info}
                          onChange={e => setSettingsForm({ ...settingsForm, shipping_info: e.target.value })}
                          className="zom-input"
                        />
                      </div>

                      <div className="zom-input-group">
                        <label className="zom-input-label">Garantia das Semijoias</label>
                        <textarea
                          rows={3}
                          value={settingsForm.warranty_info}
                          onChange={e => setSettingsForm({ ...settingsForm, warranty_info: e.target.value })}
                          className="zom-input"
                        />
                      </div>

                      <button type="submit" className="zom-btn-primary" style={{ padding: '0.85rem' }}>
                        Salvar Todas as Configurações
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL: NOVO / EDITAR PRODUTO (USE PEIXOTO SEMIJOIAS) */}
      {showProductModal && (
        <div className="admin-modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>{editingProduct ? 'Editar Semijoia' : 'Cadastrar Nova Semijoia'}</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {editingProduct ? `Editando código ${editingProduct.sku}` : 'Adicione uma nova peça ao catálogo oficial'}
                </span>
              </div>
              <button onClick={() => setShowProductModal(false)} className="admin-modal-close" title="Fechar">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="admin-modal-body">
                {/* 1. Identificação Básica */}
                <div className="zom-input-group">
                  <label className="zom-input-label">Nome da Semijoia *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Colar Elo Português Prata 925"
                    value={prodForm.name}
                    onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                    className="zom-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div className="zom-input-group">
                    <label className="zom-input-label">Banho / Acabamento</label>
                    <input
                      type="text"
                      readOnly
                      value="Banho a Prata 925 (Antialérgica)"
                      className="zom-input"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'not-allowed' }}
                      title="Trabalhamos exclusivamente com Banho a Prata 925"
                    />
                  </div>

                  <div className="zom-input-group">
                    <label className="zom-input-label">Categoria</label>
                    <select
                      value={prodForm.category_id}
                      onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}
                      className="zom-input"
                    >
                      <option value="1">Brincos</option>
                      <option value="2">Colares</option>
                      <option value="3">Anéis</option>
                      <option value="4">Pulseiras</option>
                      <option value="5">Conjuntos</option>
                    </select>
                  </div>

                  <div className="zom-input-group">
                    <label className="zom-input-label">SKU / Código Referência</label>
                    <input
                      type="text"
                      placeholder="PX-0001"
                      value={prodForm.sku}
                      onChange={e => setProdForm({ ...prodForm, sku: e.target.value })}
                      className="zom-input"
                    />
                  </div>
                </div>

                {/* 2. Precificação & Estoque */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.85rem',
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                  marginBottom: '1.2rem'
                }}>
                  <div className="zom-input-group" style={{ margin: 0 }}>
                    <label className="zom-input-label">Preço Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="149.90"
                      value={prodForm.price}
                      onChange={e => setProdForm({ ...prodForm, price: e.target.value })}
                      className="zom-input"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div className="zom-input-group" style={{ margin: 0 }}>
                    <label className="zom-input-label">Preço Custo (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="45.00"
                      value={prodForm.cost_price}
                      onChange={e => setProdForm({ ...prodForm, cost_price: e.target.value })}
                      className="zom-input"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div className="zom-input-group" style={{ margin: 0 }}>
                    <label className="zom-input-label">Estoque (Qtd)</label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.stock_quantity}
                      onChange={e => setProdForm({ ...prodForm, stock_quantity: e.target.value })}
                      className="zom-input"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>

                {/* 3. Foto da Peça */}
                <div className="zom-input-group">
                  <label className="zom-input-label">Foto da Semijoia</label>
                  
                  {/* Card de Upload Direto */}
                  <div style={{
                    border: '2px dashed rgba(91, 110, 154, 0.3)',
                    backgroundColor: '#FAF7F3',
                    borderRadius: '16px',
                    padding: '1.2rem',
                    textAlign: 'center',
                    marginBottom: '0.8rem',
                    position: 'relative',
                    transition: 'border-color 0.2s ease'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="admin-product-file-upload"
                      onChange={handleImageUpload}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                        zIndex: 10
                      }}
                      disabled={isUploading}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', pointerEvents: 'none' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        color: '#5B6E9A'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.4rem' }}>
                          {isUploading ? 'hourglass_top' : 'add_photo_alternate'}
                        </span>
                      </div>
                      <strong style={{ fontSize: '0.82rem', color: '#1a2234' }}>
                        {isUploading ? 'Enviando foto...' : 'Escolher foto do celular ou computador'}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Formatos JPG, PNG ou WEBP até 5MB
                      </span>
                    </div>
                  </div>

                  {/* Input Alternativo de URL & Miniatura */}
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Ou cole o link da foto (opcional)"
                      value={prodForm.image_url}
                      onChange={e => setProdForm({ ...prodForm, image_url: e.target.value })}
                      className="zom-input"
                      style={{ flex: 1 }}
                    />
                    {prodForm.image_url.trim() ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                          src={prodForm.image_url}
                          alt="Prévia"
                          className="admin-thumb"
                          style={{ width: '48px', height: '48px' }}
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setProdForm({ ...prodForm, image_url: '' })}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#e11d48',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 4. Descrição */}
                <div className="zom-input-group" style={{ marginBottom: 0 }}>
                  <label className="zom-input-label">Descrição & Cuidados</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Peça hipoalergênica com verniz antialérgico e garantia de 6 meses..."
                    value={prodForm.description}
                    onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                    className="zom-input"
                  />
                </div>
              </div>

              {/* Ações Fixas no Rodapé do Modal */}
              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowProductModal(false)} className="admin-topbar-btn">
                  Cancelar
                </button>
                <button type="submit" className="zom-btn-primary">
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Semijoia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO GASTO */}
      {showExpenseModal && (
        <div className="admin-modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3>Registrar Despesa / Gasto</h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Custos de fornecedor, embalagens, fotos e marketing da loja
                </span>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="admin-modal-close" title="Fechar">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="admin-modal-body">
                <div className="zom-input-group">
                  <label className="zom-input-label">Descrição do Gasto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Embalagens personalizadas com logo e fita de cetim"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="zom-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  <div className="zom-input-group">
                    <label className="zom-input-label">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="120.00"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="zom-input"
                    />
                  </div>
                  <div className="zom-input-group">
                    <label className="zom-input-label">Categoria</label>
                    <select
                      value={expenseForm.category}
                      onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="zom-input"
                    >
                      <option value="Galvânica & Banho de Ouro">Galvânica & Banho de Ouro (Fornecedor)</option>
                      <option value="Pedrarias & Zircônias">Pedrarias & Zircônias</option>
                      <option value="Embalagens & Sacolas">Embalagens, Caixas & Sacolas de Luxo</option>
                      <option value="Fotos & Produção">Fotos, Modelos & Conteúdo</option>
                      <option value="Marketing & Tráfego">Marketing & Anúncios (Instagram/Google)</option>
                      <option value="Fretes & Entregas">Fretes & Taxas de Envio</option>
                      <option value="Sistemas & Taxas">Sistemas, Maquininha & Taxas</option>
                      <option value="Outros">Outros / Gastos Gerais</option>
                    </select>
                  </div>
                </div>

                <div className="zom-input-group">
                  <label className="zom-input-label">Data do Pagamento</label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="zom-input"
                  />
                </div>

                <div className="zom-input-group" style={{ marginBottom: 0 }}>
                  <label className="zom-input-label">Observações / Detalhes (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Pago via PIX para o fornecedor do banho..."
                    value={expenseForm.notes}
                    onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="zom-input"
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="admin-topbar-btn">
                  Cancelar
                </button>
                <button type="submit" className="zom-btn-primary">
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
