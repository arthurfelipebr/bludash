

import React, { useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { AuthProvider, LoginPage, AdminLoginPage, AuthGuard, AdminGuard, useAuth } from './Auth';
import { OrdersPage } from './features/OrdersFeature';
import OrderDetailsPage from './features/OrderDetailsPage';
import OrderEditPage from './features/OrderEditPage';
import OrderOccurrencesPage from './features/OrderOccurrencesFeature';
import { CalendarPage } from './features/CalendarFeature';
import { SuppliersPage } from './features/SuppliersFeature';
import MarketAnalysisPage from './features/MarketAnalysisFeature';
import { BluFacilitaPage } from './features/BluFacilitaFeature';
import { ClientsPage } from './features/ClientsFeature'; 
import { CardFeeCalculatorPage } from './features/CardFeeCalculatorFeature';
import { SaleCalculatorPage } from './features/SaleCalculatorFeature';
import { TradeInEvaluationPage } from './features/TradeInEvaluationFeature';
import { FinancialReportsPageContainer } from './features/FinancialReportsFeature';
import AdminCompanyUsersPage from './features/AdminCompanyUsersFeature';
import ProductPricingDashboardPage from './features/ProductPricingDashboard';
import AdminHomePage from './features/AdminHomeFeature';
import AdminBillingPage from './features/AdminBillingFeature';
import AdminOrdersPage from './features/AdminOrdersFeature';
import AdminProductsPage from './features/AdminProductsFeature';
import AdminReportsPage from './features/AdminReportsFeature';
import AdminAIPage from './features/AdminAIFeature';
import AdminBluLabsPage from './features/AdminBluLabsFeature';
import AdminSettingsPage from './features/AdminAdvancedSettingsFeature';
import AdminAuditLogsPage from './features/AdminAuditLogsFeature';
import SaaSClientsAdminPage from './features/SaaSClientsAdminFeature';
import OrganizationEmailSettingsPage from './features/OrganizationEmailSettingsFeature';
import { PageTitle, Card, Tabs, Tab, ResponsiveTable, Spinner, Button, Modal, Select as SharedSelect, Alert, Input as SharedInput, Textarea as SharedTextarea } from './components/SharedComponents';

import DashboardHomePage from './features/Dashboard/Home';
import SidebarLayout, { SidebarItem } from './components/SidebarLayout';
import { 
    APP_NAME,
    ADMIN_APP_NAME,
    getOrderById,
    getOrders, // Correctly use getOrders which points to backend
    addOrderCostItem, COST_TYPE_OPTIONS_SELECT, parseBRLCurrencyStringToNumber,
    formatNumberToBRLCurrencyInput, formatDateBR, getClientById as getClientByIdService,
    addClientPayment,
} from './services/AppService';
import { NavItem, Order, OrderCostItem, CostType, OrderStatus, ClientPayment, PaymentMethod } from './types';
import {
  Home,
  Users,
  ShoppingBag,
  Calendar,
  BadgeDollarSign,
  Handshake,
  PieChart,
  Calculator,
  LineChart as LineChartIcon,
  Menu as MenuIcon,
  LogOut,
  Table,
  Package,
  BrainCog,
  Beaker,
  Settings,
  FileText,
  Mail,
} from 'lucide-react';


export const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.096.573.394 1.086.806 1.466l1.135.978c.47.404.821.976.975 1.621l.246 1.024c.082.341-.056.702-.358.908l-1.135.777c-.412.282-.71.795-.806 1.368l-.213 1.281c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.096-.573-.394-1.086-.806-1.466l-1.135-.978c-.47-.404-.821.976-.975-1.621l-.246-1.024a.75.75 0 01.358-.908l1.135-.777c.412.282.71-.795.806-1.368l.213-1.281z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> );
const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /> </svg> );
const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> );
export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> );
export const EyeSlashIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /> </svg> );


interface NavItemWithExact extends NavItem { exact?: boolean; }
const NAV_ITEMS: NavItemWithExact[] = [
  { name: 'Painel Principal', path: '/', icon: Home, exact: true },
  { name: 'Clientes', path: '/clients', icon: Users },
  { name: 'Encomendas', path: '/orders', icon: ShoppingBag },
  { name: 'Calendário', path: '/calendar', icon: Calendar },
  { name: 'BluFacilita', path: '/blufacilita', icon: BadgeDollarSign },
  { name: 'Fornecedores', path: '/suppliers', icon: Handshake },
  { name: 'Análise de Mercado', path: '/market-analysis', icon: LineChartIcon },
  { name: 'Relatórios', path: '/financial-reports', icon: PieChart },
  { name: 'Precificação', path: '/product-pricing', icon: Table },
  { name: 'Calculadora Cartão', path: '/card-calculator', icon: Calculator },
  { name: 'Calculadora Venda', path: '/sale-calculator', icon: Calculator },
  { name: 'Avaliação de Troca', path: '/trade-in-evaluation', icon: Calculator },
  { name: 'Configurações de E-mail', path: '/smtp-settings', icon: Mail },
];

const ADMIN_NAV_ITEMS: NavItemWithExact[] = [
  { name: 'Dashboard', path: '/admin', icon: Home, exact: true },
  { name: 'Usuários/Clientes', path: '/admin/users', icon: Users },
  { name: 'Clientes SaaS', path: '/admin/clients', icon: Users },
  { name: 'Planos e Faturamento', path: '/admin/billing', icon: BadgeDollarSign },
  { name: 'Pedidos', path: '/admin/orders', icon: ShoppingBag },
  { name: 'Produtos/Modelos', path: '/admin/products', icon: Package },
  { name: 'Relatórios', path: '/admin/reports', icon: PieChart },
  { name: 'IA / Automatizações', path: '/admin/ai', icon: BrainCog },
  { name: 'Blu Labs', path: '/admin/labs', icon: Beaker },
  { name: 'Configurações', path: '/admin/settings', icon: Settings },
  { name: 'Auditoria & Logs', path: '/admin/audit', icon: FileText },
];

// --- Modals (AddOrderCostModal, RegisterPaymentModal) ---

// AddOrderCostModal
interface AddOrderCostModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (costItem: OrderCostItem) => void; 
}
export const AddOrderCostModal: React.FC<AddOrderCostModalProps> = ({ isOpen, onClose, onSave }) => {
    const [orderId, setOrderId] = useState('');
    const [type, setType] = useState<CostType>(CostType.FRETE_FORNECEDOR_BLU); 
    const [amountInput, setAmountInput] = useState('R$ 0,00');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { 
        if (isOpen) { 
            setIsLoadingOrders(true);
            getOrders() // Use the corrected getOrders
                .then(fetchedOrders => {
                    const activeOrders = fetchedOrders.filter( o => o.status !== OrderStatus.CANCELADO && o.status !== OrderStatus.ENVIADO ).sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
                    setAllOrders(activeOrders);
                    setIsLoadingOrders(false);
                })
                .catch(err => {
                    console.error("Error fetching orders for cost modal:", err);
                    setError("Falha ao carregar encomendas.");
                    setIsLoadingOrders(false);
                });
            setOrderId(''); setType(CostType.FRETE_FORNECEDOR_BLU); setAmountInput('R$ 0,00'); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setError(null); 
        } 
    }, [isOpen]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setAmountInput(e.target.value);
    const handleAmountBlur = () => setAmountInput(formatNumberToBRLCurrencyInput(parseBRLCurrencyStringToNumber(amountInput)));
    
    const handleSubmit = async () => {
        const amount = parseBRLCurrencyStringToNumber(amountInput);
        if (!orderId) { setError("Selecione uma encomenda."); return; }
        if (amount <= 0) { setError("O valor do custo deve ser maior que zero."); return; }
        if (!description.trim() && type === CostType.OUTROS_CUSTOS) { setError("Descrição é obrigatória para 'Outros Custos'."); return; }
        const costItemData: Omit<OrderCostItem, 'id' | 'userId'> = { orderId, type, amount, description: description.trim() || type, date, };
        setIsSubmitting(true);
        try {
            const savedCostItem = await addOrderCostItem(costItemData);
            onSave(savedCostItem);
            onClose();
        } catch (err) {
            setError("Falha ao salvar custo: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSubmitting(false);
        }
    };
    const orderOptions: Array<{ value: string | number; label: string }> = [
        { value: '', label: 'Selecione uma Encomenda Ativa...' },
        ...allOrders.map(o => ({
            value: o.id,
            label: `${o.productName} ${o.model} (${o.customerName || 'Cliente não especificado'}) - Pedido: ${formatDateBR(o.orderDate)}`
        }))
    ];
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Novo Custo de Encomenda" size="lg">
            <div className="space-y-4">
                {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
                {isLoadingOrders ? (
                    <Spinner />
                ) : (
                    <SharedSelect
                        label="Encomenda Ativa"
                        id="costOrderId"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        options={orderOptions}
                        required
                    />
                )}
                <SharedSelect
                    label="Tipo de Custo"
                    id="costType"
                    value={type}
                    onChange={(e) => setType(e.target.value as CostType)}
                    options={COST_TYPE_OPTIONS_SELECT}
                    required
                />
                <SharedInput
                    label="Valor do Custo (R$)"
                    id="costAmount"
                    value={amountInput}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    required
                />
                <SharedTextarea
                    label={`Descrição do Custo${type === CostType.OUTROS_CUSTOS ? ' *' : ''}`}
                    id="costDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder={type !== CostType.OUTROS_CUSTOS ? 'Opcional' : 'Detalhe o custo'}
                    required={type === CostType.OUTROS_CUSTOS}
                    aria-required={type === CostType.OUTROS_CUSTOS}
                />
                <SharedInput
                    label="Data do Custo"
                    id="costDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} isLoading={isSubmitting}>
                        Salvar Custo
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// RegisterPaymentModal
interface RegisterPaymentModalProps { order: Order | null; isOpen: boolean; onClose: () => void; onPaymentSaved: (payment: ClientPayment) => void;}
export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({ order, isOpen, onClose, onPaymentSaved }) => {
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountPaidInput, setAmountPaidInput] = useState('R$ 0,00');
    const [paymentMethodUsed, setPaymentMethodUsed] = useState<'PIX' | 'Transferência Bancária' | 'Dinheiro' | 'Cartão de Crédito' | 'Outro'>('PIX');
    const [installments, setInstallments] = useState(2);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [clientName, setClientName] = useState('');

    useEffect(() => {
        const fetchClientName = async () => {
            if (order?.clientId) {
                try {
                    const client = await getClientByIdService(order.clientId);
                    setClientName(client?.fullName || order.customerName);
                } catch {
                    setClientName(order.customerName);
                }
            } else if (order) {
                setClientName(order.customerName);
            }
        };

        if (isOpen && order) {
            fetchClientName();
            setPaymentDate(new Date().toISOString().split('T')[0]);
            if (order.paymentMethod === PaymentMethod.BLU_FACILITA && order.bluFacilitaInstallments) {
                const nextPendingInstallment = order.bluFacilitaInstallments.find( inst => inst.status === 'Pendente' || inst.status === 'Atrasado' || inst.status === 'Pago Parcialmente' );
                const suggestedAmount = nextPendingInstallment ? (nextPendingInstallment.amount - (nextPendingInstallment.amountPaid || 0)) : (order.installmentValue || 0);
                setAmountPaidInput(formatNumberToBRLCurrencyInput(suggestedAmount > 0 ? suggestedAmount : 0));
            } else { setAmountPaidInput(formatNumberToBRLCurrencyInput(order.sellingPrice || 0)); }
            setPaymentMethodUsed('PIX'); setInstallments(2); setNotes(''); setError(null);
        }
    }, [isOpen, order]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setAmountPaidInput(e.target.value);
    const handleAmountBlur = () => setAmountPaidInput(formatNumberToBRLCurrencyInput(parseBRLCurrencyStringToNumber(amountPaidInput)));
    const handleSubmit = async () => {
        if (!order) { setError("Encomenda não especificada."); return; }
        const amountPaid = parseBRLCurrencyStringToNumber(amountPaidInput);
        if (amountPaid <= 0) { setError("O valor pago deve ser maior que zero."); return; }
        setError(null);
        setIsLoading(true);
        try {
            const paymentData: Omit<ClientPayment, 'id'|'userId'> = {
                orderId: order.id,
                paymentDate,
                amountPaid,
                paymentMethodUsed,
                installments: paymentMethodUsed === 'Cartão de Crédito' ? installments : undefined,
                notes
            };
            const savedPayment = await addClientPayment(paymentData);
            onPaymentSaved(savedPayment);
            onClose();
        } catch (err) {
            setError("Falha ao registrar pagamento: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsLoading(false);
        }
    };
    const paymentMethodOptions = [
        { value: 'PIX', label: 'PIX' },
        { value: 'Transferência Bancária', label: 'Transferência Bancária' },
        { value: 'Dinheiro', label: 'Dinheiro' },
        { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
        { value: 'Outro', label: 'Outro' },
    ];
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Recebimento`} size="lg">
            <div className="space-y-4">
                {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
                <p><strong>Cliente:</strong> {clientName}</p>
                <p><strong>Produto:</strong> {order?.productName} {order?.model}</p>
                <SharedInput label="Data do Recebimento" id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                <SharedInput label="Valor Recebido (R$)" id="amountPaid" value={amountPaidInput} onChange={handleAmountChange} onBlur={handleAmountBlur} required />
                <SharedSelect label="Forma de Pagamento Usada" id="paymentMethodUsed" value={paymentMethodUsed} onChange={(e) => setPaymentMethodUsed(e.target.value as any)} options={paymentMethodOptions} required />
                {paymentMethodUsed === 'Cartão de Crédito' && (
                    <SharedSelect
                        label="Número de Parcelas"
                        id="installments"
                        value={String(installments)}
                        onChange={(e) => setInstallments(parseInt(e.target.value))}
                        options={Array.from({ length: 11 }, (_, i) => ({ value: i + 2, label: `${i + 2}x` }))}
                    />
                )}
                <SharedTextarea label="Observações (Opcional)" id="paymentNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading}>Salvar Recebimento</Button>
                </div>
            </div>
        </Modal>
    );
};


const Sidebar: React.FC<{isOpen: boolean; setIsOpen: (isOpen: boolean) => void;}> = ({ isOpen, setIsOpen }) => {
  const { logout, currentUser } = useAuth();
  const items: SidebarItem[] = currentUser?.role === 'admin' ? NAV_ITEMS : NAV_ITEMS.filter(i => i.path !== '/smtp-settings');
  return (
    <SidebarLayout
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      items={items}
      logo="https://bluimports.com.br/blu-branco.svg"
      logoutFn={logout}
    />
  );
};

const Header: React.FC<{onMenuButtonClick: () => void; onAddCostClick: () => void;}> = ({onMenuButtonClick, onAddCostClick}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);
  return (
    <header className="sticky top-0 z-20 bg-white shadow-md lg:hidden">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        <button onClick={onMenuButtonClick} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden" >
          <span className="sr-only">Abrir menu</span>
          <MenuIcon className="h-6 w-6" />
        </button>
        <div className="text-lg font-semibold text-blue-700">{APP_NAME}</div>
        <div className="relative" ref={menuRef}>
          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)} title="Ações Rápidas" className="lg:hidden">
            <PlusCircleIcon className="h-6 w-6 text-blue-600"/>
          </Button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
              <button onClick={() => {navigate('/orders', { state: { prefillOrderData: {} } }); setOpen(false);}} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Nova Encomenda</button>
              <button onClick={() => {navigate('/clients', { state: { openNewClientForm: true } }); setOpen(false);}} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Novo Cliente</button>
              <button onClick={() => {onAddCostClick(); setOpen(false);}} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Registrar Custo de Encomenda</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
const DashboardLayout: React.FC<{ children: ReactNode }> = ({ children }) => { const [sidebarOpen, setSidebarOpen] = useState(false); const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false); const handleCostSaved = (costItem: OrderCostItem) => { console.log("Custo salvo:", costItem); /* Potentially refresh relevant dashboard data if needed */ }; return ( <div className="min-h-screen flex"> <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} /> <div className="flex-1 flex flex-col lg:ml-64"> <Header onMenuButtonClick={() => setSidebarOpen(true)} onAddCostClick={() => setIsAddCostModalOpen(true)} /> <main className="flex-1 p-4 sm:p-6 bg-white overflow-y-auto"> {children} </main> </div> <AddOrderCostModal isOpen={isAddCostModalOpen} onClose={() => setIsAddCostModalOpen(false)} onSave={handleCostSaved} /> </div> ); };

const AdminSidebar: React.FC<{isOpen: boolean; setIsOpen: (o: boolean) => void;}> = ({ isOpen, setIsOpen }) => {
  const { logout } = useAuth();
  return (
    <SidebarLayout
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      items={ADMIN_NAV_ITEMS}
      logo="https://bluimports.com.br/blu-branco.svg"
      logoutFn={logout}
    />
  );
};

const AdminHeader: React.FC<{onMenuButtonClick: () => void;}> = ({onMenuButtonClick}) => (
  <header className="sticky top-0 z-20 bg-white shadow-md lg:hidden">
    <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <button onClick={onMenuButtonClick} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden">
        <span className="sr-only">Abrir menu</span>
        <MenuIcon className="h-6 w-6" />
      </button>
      <div className="text-lg font-semibold text-blue-700">{ADMIN_APP_NAME}</div>
    </div>
  </header>
);

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen flex">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <AdminHeader onMenuButtonClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 bg-white overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};


const App: React.FC<{}> = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminHomePage />} />
            <Route path="users" element={<AdminCompanyUsersPage />} />
            <Route path="clients" element={<SaaSClientsAdminPage />} />
            <Route path="billing" element={<AdminBillingPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="ai" element={<AdminAIPage />} />
            <Route path="labs" element={<AdminBluLabsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="audit" element={<AdminAuditLogsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route
            path="/*"
            element={
              <AuthGuard>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<DashboardHomePage />} />
                    <Route path="/clients/*" element={<ClientsPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
                    <Route path="/orders/:orderId/edit" element={<OrderEditPage />} />
                    <Route path="/orders/:orderId/occurrences" element={<OrderOccurrencesPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/market-analysis" element={<MarketAnalysisPage />} />
                    <Route path="/blufacilita" element={<BluFacilitaPage />} />
                    <Route path="/card-calculator" element={<CardFeeCalculatorPage />} />
                    <Route path="/sale-calculator" element={<SaleCalculatorPage />} />
                    <Route path="/trade-in-evaluation" element={<TradeInEvaluationPage />} />
                    <Route path="/product-pricing" element={<ProductPricingDashboardPage />} />
                    <Route path="/financial-reports" element={<FinancialReportsPageContainer />} />
                    <Route path="/smtp-settings" element={<OrganizationEmailSettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              </AuthGuard>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};
export default App;
