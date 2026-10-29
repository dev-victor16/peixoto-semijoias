'use client';
import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
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
  category_name?: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  published: number;
  image_url?: string;
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
  created_at: string;
}

type TabType = 'dashboard' | 'financeiro' | 'produtos' | 'gastos' | 'pedidos' | 'configuracoes';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);

  // Dados
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Modais e formulários
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Novo produto
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost_price: '',
    category_id: '1',
    stock_quantity: '1',
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

  // Configurações form
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

  // Carregar dados iniciais e verificar autenticação
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

  const loadAllData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  // Criar Produto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodForm.name,
          sku: prodForm.sku || `PX-${Date.now().toString().slice(-4)}`,
          price: parseFloat(prodForm.price) || 0,
          cost_price: parseFloat(prodForm.cost_price) || 0,
          category_id: parseInt(prodForm.category_id) || 1,
          stock_quantity: parseInt(prodForm.stock_quantity) || 0,
          description: prodForm.description,
          published: prodForm.published ? 1 : 0
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar produto');
      }

      showToast('Produto cadastrado com sucesso!');
      setShowProductModal(false);
      setProdForm({
        name: '',
        sku: '',
        price: '',
        cost_price: '',
        category_id: '1',
        stock_quantity: '1',
        description: '',
        published: true
      });
      loadAllData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
    }
  };

  // Alternar Publicação de Produto
  const togglePublish = async (id: number, current: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: current === 1 ? 0 : 1 })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, published: current === 1 ? 0 : 1 } : p));
        showToast('Status do produto atualizado!');
      }
    } catch (err) {
      showToast('Erro ao atualizar produto', 'error');
    }
  };

  // Adicionar Despesa
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      if (!res.ok) throw new Error('Erro ao salvar despesa');

      showToast('Despesa registrada com sucesso!');
      setShowExpenseModal(false);
      setExpenseForm({
        description: '',
        category: 'Geral',
        amount: '',
        expense_date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      loadAllData();
    } catch (err) {
      showToast('Erro ao registrar despesa', 'error');
    }
  };

  // Excluir Despesa
  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Deseja excluir este registro de despesa?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Despesa excluída com sucesso');
        loadAllData();
      }
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  // Atualizar Status do Pedido
  const handleUpdateOrderStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast('Status do pedido atualizado!');
        loadAllData();
      }
    } catch {
      showToast('Erro ao atualizar pedido', 'error');
    }
  };

  // Salvar Configurações
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        showToast('Configurações da loja salvas com sucesso!');
      }
    } catch {
      showToast('Erro ao salvar configurações', 'error');
    }
  };

  const fmtCurrency = (val?: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="admin-app">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className={`admin-toast admin-toast-${feedbackMsg.type}`}>
          {feedbackMsg.text}
        </div>
      )}

      {/* Barra de Navegação Superior do Admin */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <img src="/logo.png" alt="Logo" className="admin-brand-icon" />
          <div>
            <h1 className="admin-brand-title">Use Peixoto</h1>
            <span className="admin-brand-subtitle">Painel de Gestão Oficial</span>
          </div>
        </div>

        <nav className="admin-nav-tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`admin-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            📊 Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('financeiro')}
            className={`admin-tab-btn ${activeTab === 'financeiro' ? 'active' : ''}`}
          >
            💰 DRE / Lucros
          </button>
          <button
            onClick={() => setActiveTab('produtos')}
            className={`admin-tab-btn ${activeTab === 'produtos' ? 'active' : ''}`}
          >
            💎 Produtos & Estoque
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={`admin-tab-btn ${activeTab === 'gastos' ? 'active' : ''}`}
          >
            📉 Controle de Gastos
          </button>
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`admin-tab-btn ${activeTab === 'pedidos' ? 'active' : ''}`}
          >
            🛍️ Pedidos WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`admin-tab-btn ${activeTab === 'configuracoes' ? 'active' : ''}`}
          >
            ⚙️ Configurações
          </button>
        </nav>

        <div className="admin-user-action">
          <a href="/" target="_blank" className="admin-btn-secondary" title="Abrir site do cliente">
            Ver Loja ↗
          </a>
          <button onClick={handleLogout} className="admin-logout-btn" title="Encerrar sessão">
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="admin-main">
        {loading ? (
          <div className="admin-loading">Carregando informações do painel...</div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* 1. ABA DASHBOARD / VISÃO GERAL */}
            {/* ============================================================== */}
            {activeTab === 'dashboard' && (
              <div className="admin-view">
                <div className="admin-view-header">
                  <div>
                    <h2>Painel de Resultados</h2>
                    <p>Métricas vitais de vendas, lucros e estoque em tempo real</p>
                  </div>
                  <button onClick={loadAllData} className="admin-btn-secondary">
                    ↻ Atualizar Dados
                  </button>
                </div>

                {/* Cards de Lucro e Faturamento */}
                <div className="admin-metrics-grid">
                  <div className="admin-card metric-card metric-net-profit">
                    <span className="metric-label">Lucro Líquido Real</span>
                    <strong className="metric-value">
                      {fmtCurrency(dashData?.financial.netProfit)}
                    </strong>
                    <span className="metric-hint">
                      Margem líquida: {(dashData?.financial.netMargin || 0).toFixed(1)}% das vendas
                    </span>
                  </div>

                  <div className="admin-card metric-card">
                    <span className="metric-label">Lucro Bruto</span>
                    <strong className="metric-value">
                      {fmtCurrency(dashData?.financial.grossProfit)}
                    </strong>
                    <span className="metric-hint">
                      Faturamento menos custo das peças vendidas
                    </span>
                  </div>

                  <div className="admin-card metric-card">
                    <span className="metric-label">Faturamento Concluído</span>
                    <strong className="metric-value">
                      {fmtCurrency(dashData?.financial.revenue)}
                    </strong>
                    <span className="metric-hint">
                      {dashData?.orders.completed || 0} pedidos entregues/pagos
                    </span>
                  </div>

                  <div className="admin-card metric-card metric-expenses">
                    <span className="metric-label">Gastos & Despesas</span>
                    <strong className="metric-value">
                      {fmtCurrency(dashData?.financial.totalExpenses)}
                    </strong>
                    <span className="metric-hint">
                      Despesas operacionais registradas
                    </span>
                  </div>
                </div>

                {/* Linha Secundária: Estoque & Pedidos */}
                <div className="admin-metrics-grid admin-metrics-secondary">
                  <div className="admin-card">
                    <div className="metric-header-row">
                      <h4>Estoque e Patrimônio</h4>
                      <button onClick={() => setActiveTab('produtos')} className="admin-link-btn">
                        Ver detalhes →
                      </button>
                    </div>
                    <div className="admin-stat-row">
                      <span>Total de peças cadastradas:</span>
                      <strong>{dashData?.products.total}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Peças no ar (publicadas):</span>
                      <strong>{dashData?.products.published}</strong>
                    </div>
                    <div className="admin-stat-row stat-warning">
                      <span>Alerta de estoque baixo:</span>
                      <strong>{dashData?.products.lowStock}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Valor em estoque (a preço de custo):</span>
                      <strong>{fmtCurrency(dashData?.financial.inventory.cost_value)}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Potencial de venda (em estoque):</span>
                      <strong>{fmtCurrency(dashData?.financial.inventory.retail_value)}</strong>
                    </div>
                  </div>

                  <div className="admin-card">
                    <div className="metric-header-row">
                      <h4>Fluxo de Pedidos</h4>
                      <button onClick={() => setActiveTab('pedidos')} className="admin-link-btn">
                        Ver pedidos →
                      </button>
                    </div>
                    <div className="admin-stat-row">
                      <span>Aguardando atendimento:</span>
                      <strong className="badge-warning">{dashData?.orders.awaitingContact}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Em atendimento no WhatsApp:</span>
                      <strong>{dashData?.orders.inService}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Confirmados / Em rota:</span>
                      <strong>{dashData?.orders.confirmed}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Pedidos finalizados com sucesso:</span>
                      <strong className="badge-success">{dashData?.orders.completed}</strong>
                    </div>
                    <div className="admin-stat-row">
                      <span>Valor em negociação (pendente):</span>
                      <strong>{fmtCurrency(dashData?.financial.pendingValue)}</strong>
                    </div>
                  </div>
                </div>

                {/* Produtos Mais Vendidos */}
                <div className="admin-card admin-table-card">
                  <h3>Peças Mais Vendidas</h3>
                  {dashData?.topProducts && dashData.topProducts.length > 0 ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>SKU</th>
                          <th>Qtd. Vendida</th>
                          <th>Faturamento Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashData.topProducts.map((tp, idx) => (
                          <tr key={idx}>
                            <td className="admin-cell-prod">
                              <strong>{tp.product_name}</strong>
                            </td>
                            <td><code>{tp.product_sku}</code></td>
                            <td>{tp.total_sold} un</td>
                            <td><strong>{fmtCurrency(tp.total_revenue)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="admin-empty">Ainda não há vendas concluídas registradas.</div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. ABA FINANCEIRO / DRE DE LUCRO */}
            {/* ============================================================== */}
            {activeTab === 'financeiro' && (
              <div className="admin-view">
                <div className="admin-view-header">
                  <div>
                    <h2>Demonstrativo de Lucros (DRE)</h2>
                    <p>Entenda exatamente de onde vem e para onde vai o dinheiro da sua loja</p>
                  </div>
                </div>

                <div className="admin-dre-card">
                  <div className="admin-dre-row dre-revenue">
                    <span>(+) Faturamento Bruto (Vendas Concluídas)</span>
                    <strong>{fmtCurrency(dashData?.financial.revenue)}</strong>
                  </div>

                  <div className="admin-dre-row dre-minus">
                    <span>(-) Custo das Joias Vendidas (CMV)</span>
                    <strong>- {fmtCurrency(dashData?.financial.costOfGoodsSold)}</strong>
                  </div>

                  <div className="admin-dre-row dre-total-gross">
                    <span>(=) LUCRO BRUTO DA OPERAÇÃO</span>
                    <strong>{fmtCurrency(dashData?.financial.grossProfit)}</strong>
                  </div>

                  <div className="admin-dre-row dre-minus">
                    <span>(-) Despesas e Gastos Operacionais</span>
                    <strong>- {fmtCurrency(dashData?.financial.totalExpenses)}</strong>
                  </div>

                  <div className="admin-dre-row dre-total-net">
                    <div>
                      <span>(=) LUCRO LÍQUIDO FINAL</span>
                      <small>Sobra no caixa após custos e despesas</small>
                    </div>
                    <strong>{fmtCurrency(dashData?.financial.netProfit)}</strong>
                  </div>
                </div>

                <div className="admin-metrics-grid" style={{ marginTop: '1.5rem' }}>
                  <div className="admin-card">
                    <h4>Margem de Lucro</h4>
                    <p className="admin-big-stat">
                      {(dashData?.financial.netMargin || 0).toFixed(1)}%
                    </p>
                    <p className="admin-stat-desc">
                      Porcentagem de cada R$ 100 vendidos que se torna lucro líquido no seu bolso.
                    </p>
                  </div>

                  <div className="admin-card">
                    <h4>Capital Imobilizado em Semijoias</h4>
                    <p className="admin-big-stat">
                      {fmtCurrency(dashData?.financial.inventory.cost_value)}
                    </p>
                    <p className="admin-stat-desc">
                      Valor investido em peças físicas atualmente estocadas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. ABA PRODUTOS & CONTROLE DE ESTOQUE */}
            {/* ============================================================== */}
            {activeTab === 'produtos' && (
              <div className="admin-view">
                <div className="admin-view-header">
                  <div>
                    <h2>Controle de Produtos & Estoque</h2>
                    <p>Cadastre peças, ajuste preços, controle o estoque e ative na vitrine</p>
                  </div>
                  <button onClick={() => setShowProductModal(true)} className="admin-btn-primary">
                    + Nova Semijoia
                  </button>
                </div>

                <div className="admin-card admin-table-card">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Peça</th>
                        <th>SKU</th>
                        <th>Preço Venda</th>
                        <th>Custo</th>
                        <th>Estoque</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                          </td>
                          <td><code>{p.sku}</code></td>
                          <td><strong>{fmtCurrency(p.price)}</strong></td>
                          <td>{fmtCurrency(p.cost_price)}</td>
                          <td>
                            <span className={`stock-badge ${p.stock_quantity <= 2 ? 'low' : 'ok'}`}>
                              {p.stock_quantity} un
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => togglePublish(p.id, p.published)}
                              className={`status-pill ${p.published ? 'published' : 'draft'}`}
                            >
                              {p.published ? '✓ Na Loja' : 'Oculto'}
                            </button>
                          </td>
                          <td>
                            <a
                              href={`/produtos/${p.id}`}
                              target="_blank"
                              className="admin-link-btn"
                            >
                              Ver
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 4. ABA CONTROLE DE GASTOS */}
            {/* ============================================================== */}
            {activeTab === 'gastos' && (
              <div className="admin-view">
                <div className="admin-view-header">
                  <div>
                    <h2>Controle de Gastos & Despesas</h2>
                    <p>Registre custos com embalagens, fretes, anúncios, fotos e fornecedores</p>
                  </div>
                  <button onClick={() => setShowExpenseModal(true)} className="admin-btn-primary">
                    + Registrar Gasto
                  </button>
                </div>

                <div className="admin-card admin-table-card">
                  {expenses.length > 0 ? (
                    <table className="admin-table">
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
                            <td><span className="category-pill">{exp.category}</span></td>
                            <td><strong className="text-danger">- {fmtCurrency(exp.amount)}</strong></td>
                            <td>{exp.notes || '—'}</td>
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
                    <div className="admin-empty">Nenhum gasto cadastrado ainda.</div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 5. ABA PEDIDOS RECEBIDOS */}
            {/* ============================================================== */}
            {activeTab === 'pedidos' && (
              <div className="admin-view">
                <div className="admin-view-header">
                  <div>
                    <h2>Gestão de Pedidos (WhatsApp)</h2>
                    <p>Acompanhe clientes que montaram sacola e gerencie o status das vendas</p>
                  </div>
                </div>

                <div className="admin-card admin-table-card">
                  {orders.length > 0 ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nº Pedido</th>
                          <th>Data</th>
                          <th>Cliente</th>
                          <th>Telefone</th>
                          <th>Valor Total</th>
                          <th>Status</th>
                          <th>Alterar Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => (
                          <tr key={o.id}>
                            <td><strong>{o.order_number}</strong></td>
                            <td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                            <td>{o.customer_name || 'Cliente WhatsApp'}</td>
                            <td>{o.customer_phone || '—'}</td>
                            <td><strong>{fmtCurrency(o.total)}</strong></td>
                            <td>
                              <span className={`order-status-badge ${o.status}`}>
                                {o.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <select
                                value={o.status}
                                onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                                className="admin-select-sm"
                              >
                                <option value="aguardando_contato">Aguardando Contato</option>
                                <option value="em_atendimento">Em Atendimento</option>
                                <option value="confirmado">Confirmado / Pago</option>
                                <option value="concluido">Concluído (Entregue)</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="admin-empty">Ainda não há pedidos registrados.</div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 6. ABA CONFIGURAÇÕES GERAIS */}
            {/* ============================================================== */}
            {activeTab === 'configuracoes' && (
              <div className="admin-view">
                <div className="admin-view-header">
                  <div>
                    <h2>Configurações Gerais da Loja</h2>
                    <p>Altere os dados de atendimento, redes sociais e textos da loja</p>
                  </div>
                </div>

                <div className="admin-card" style={{ maxWidth: '650px' }}>
                  <form onSubmit={handleSaveSettings} className="admin-form">
                    <div className="admin-form-group">
                      <label>Nome Oficial da Marca</label>
                      <input
                        type="text"
                        value={settingsForm.store_name}
                        onChange={e => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
                        className="admin-input"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>WhatsApp de Atendimento (Com DDD)</label>
                      <input
                        type="text"
                        value={settingsForm.whatsapp_number}
                        onChange={e => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })}
                        placeholder="Ex: (11) 99999-9999"
                        className="admin-input"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Instagram Oficial</label>
                      <input
                        type="text"
                        value={settingsForm.instagram}
                        onChange={e => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                        placeholder="@usepeixoto"
                        className="admin-input"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Informações de Envio</label>
                      <textarea
                        rows={3}
                        value={settingsForm.shipping_info}
                        onChange={e => setSettingsForm({ ...settingsForm, shipping_info: e.target.value })}
                        className="admin-input"
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Informações de Garantia</label>
                      <textarea
                        rows={3}
                        value={settingsForm.warranty_info}
                        onChange={e => setSettingsForm({ ...settingsForm, warranty_info: e.target.value })}
                        className="admin-input"
                      />
                    </div>

                    <button type="submit" className="admin-btn-primary">
                      Salvar Alterações
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: NOVO PRODUTO */}
      {showProductModal && (
        <div className="admin-modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Cadastrar Nova Semijoia</h3>
              <button onClick={() => setShowProductModal(false)} className="admin-modal-close">✕</button>
            </div>
            <form onSubmit={handleSaveProduct} className="admin-form">
              <div className="admin-form-group">
                <label>Nome da Peça *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brinco Argola Orgânica Banhado a Ouro"
                  value={prodForm.name}
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="120.00"
                    value={prodForm.price}
                    onChange={e => setProdForm({ ...prodForm, price: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Preço de Custo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="35.00"
                    value={prodForm.cost_price}
                    onChange={e => setProdForm({ ...prodForm, cost_price: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Estoque Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={prodForm.stock_quantity}
                    onChange={e => setProdForm({ ...prodForm, stock_quantity: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Categoria</label>
                  <select
                    value={prodForm.category_id}
                    onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}
                    className="admin-input"
                  >
                    <option value="1">Brincos</option>
                    <option value="2">Colares</option>
                    <option value="3">Anéis</option>
                    <option value="4">Pulseiras</option>
                    <option value="5">Conjuntos</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes sobre o design e banho..."
                  value={prodForm.description}
                  onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prodForm.published}
                    onChange={e => setProdForm({ ...prodForm, published: e.target.checked })}
                  />
                  Publicar imediatamente na vitrine da loja
                </label>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowProductModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  Salvar Semijoia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO GASTO / DESPESA */}
      {showExpenseModal && (
        <div className="admin-modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Registrar Despesa / Gasto</h3>
              <button onClick={() => setShowExpenseModal(false)} className="admin-modal-close">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} className="admin-form">
              <div className="admin-form-group">
                <label>Descrição da Despesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compra de caixas personalizadas e fitas"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="150.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Categoria</label>
                  <select
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="admin-input"
                  >
                    <option value="Embalagens">Embalagens & Envio</option>
                    <option value="Marketing">Marketing / Anúncios</option>
                    <option value="Fornecedor">Fornecedor / Banho</option>
                    <option value="Ferramentas">Sistemas & Ferramentas</option>
                    <option value="Geral">Outros / Geral</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Data</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-form-group">
                <label>Observações</label>
                <input
                  type="text"
                  placeholder="Opcional..."
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="admin-btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary">
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
