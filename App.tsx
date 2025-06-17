

import React, { useState, ReactNode, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, LoginPage, AuthGuard, useAuth } from './Auth';
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
import { UserManagementPage } from './features/UserManagementFeature';
import MonthlyTablePage from './features/MonthlyTableFeature';
import { PageTitle, Card, Tabs, Tab, ResponsiveTable, Spinner, Button, Modal, Select as SharedSelect, Alert, Input as SharedInput, Textarea as SharedTextarea } from './components/SharedComponents';
import RemindersWidget from './components/RemindersWidget';
import PendingOrdersWidget from './components/PendingOrdersWidget';
import { 
    APP_NAME, 
    getDashboardStatistics, formatCurrencyBRL, getTodaysTasks, formatDateBR, getOrderById, 
    getOrders, // Correctly use getOrders which points to backend
    addOrderCostItem, COST_TYPE_OPTIONS_SELECT, parseBRLCurrencyStringToNumber, 
    formatNumberToBRLCurrencyInput, getDashboardAlerts, getClientById as getClientByIdService, 
    addClientPayment,
} from './services/AppService';
import { NavItem, TodayTask, Order, OrderCostItem, CostType, OrderStatus, DashboardAlert, ClientPayment, PaymentMethod } from './types';
import { v4 as uuidv4 } from 'uuid';
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
} from 'lucide-react';


export const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.096.573.394 1.086.806 1.466l1.135.978c.47.404.821.976.975 1.621l.246 1.024c.082.341-.056.702-.358.908l-1.135.777c-.412.282-.71.795-.806 1.368l-.213 1.281c-.09.543-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.096-.573-.394-1.086-.806-1.466l-1.135-.978c-.47-.404-.821.976-.975-1.621l-.246-1.024a.75.75 0 01.358-.908l1.135-.777c.412.282.71-.795.806-1.368l.213-1.281z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> );
const ChartPieIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /> </svg> );
const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> );
export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> </svg> );
export const EyeSlashIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}> <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /> </svg> );


interface NavItemWithExact extends NavItem { exact?: boolean; adminOnly?: boolean; }
const NAV_ITEMS: NavItemWithExact[] = [
  { name: 'Painel Principal', path: '/', icon: Home, exact: true },
  { name: 'Clientes', path: '/clients', icon: Users },
  { name: 'Encomendas', path: '/orders', icon: ShoppingBag },
  { name: 'Calendário', path: '/calendar', icon: Calendar },
  { name: 'BluFacilita', path: '/blufacilita', icon: BadgeDollarSign },
  { name: 'Fornecedores', path: '/suppliers', icon: Handshake },
  { name: 'Análise de Mercado', path: '/market-analysis', icon: LineChartIcon },
  { name: 'Relatórios', path: '/financial-reports', icon: PieChart },
  { name: 'Tabela do Mês', path: '/monthly-table', icon: Table },
  { name: 'Calculadora Cartão', path: '/card-calculator', icon: Calculator },
  { name: 'Calculadora Venda', path: '/sale-calculator', icon: Calculator },
  { name: 'Avaliação de Troca', path: '/trade-in-evaluation', icon: Calculator },
  { name: 'Usuários', path: '/user-management', icon: Users, adminOnly: true },
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
        try {
            const savedCostItem = await addOrderCostItem(costItemData); 
            onSave(savedCostItem); 
            onClose(); 
        } catch (err) {
            setError("Falha ao salvar custo: " + (err instanceof Error ? err.message : String(err)));
        }
    };
    const orderOptions: Array<{ value: string | number; label: string }> = [
        { value: '', label: 'Selecione uma Encomenda Ativa...' },
        ...allOrders.map(o => ({
            value: o.id,
            label: `${o.productName} ${o.model} (${o.customerName || 'Cliente não especificado'}) - Pedido: ${formatDateBR(o.orderDate)}`
        }))
    ];
    return ( <Modal isOpen={isOpen} onClose={onClose} title="Registrar Novo Custo de Encomenda" size="lg"> <div className="space-y-4"> {error && <Alert type="error" message={error} onClose={() => setError(null)} />} {isLoadingOrders ? <Spinner/> : <SharedSelect label="Encomenda Ativa" id="costOrderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} options={orderOptions} required />} <SharedSelect label="Tipo de Custo" id="costType" value={type} onChange={(e) => setType(e.target.value as CostType)} options={COST_TYPE_OPTIONS_SELECT} required /> <SharedInput label="Valor do Custo (R$)" id="costAmount" value={amountInput} onChange={handleAmountChange} onBlur={handleAmountBlur} required /> <SharedTextarea label="Descrição do Custo" id="costDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={type !== CostType.OUTROS_CUSTOS ? "Opcional" : "Detalhe o custo"} /> <SharedInput label="Data do Custo" id="costDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /> <div className="flex justify-end space-x-2"> <Button variant="secondary" onClick={onClose}>Cancelar</Button> <Button onClick={handleSubmit}>Salvar Custo</Button> </div> </div> </Modal> );
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


const Sidebar: React.FC<{isOpen: boolean; setIsOpen: (isOpen: boolean) => void;}> = ({isOpen, setIsOpen}) => {
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const NavLink: React.FC<{item: NavItemWithExact; onClick?: () => void}> = ({ item, onClick }) => { const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path) && (location.pathname === item.path || location.pathname.startsWith(item.path + '/')); const IconComponent = item.icon; return ( <Link to={item.path} onClick={onClick} className={`flex items-center px-3 py-3 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blu-accent text-blu-primary' : 'text-white hover:bg-white/10'}`} > <IconComponent className="h-6 w-6 mr-3 flex-shrink-0" /> {item.name} </Link> ); };
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-blu-primary text-white shadow-lg border-r border-blu-accent transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-20 border-b border-blu-accent/50 px-4">
          <img
            src="https://bluimports.com.br/blu-branco.svg"
            alt="Blu Imports Logo"
            className="h-10 object-contain"
          />
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {NAV_ITEMS.filter(i => !i.adminOnly || currentUser?.role === 'admin').map((item) => (
            <NavLink key={item.name} item={item} onClick={() => setIsOpen(false)} />
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-blu-accent/50">
          <button
            onClick={async () => {
              await logout();
              setIsOpen(false);
            }}
            className="flex items-center w-full px-3 py-3 rounded-md text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-6 w-6 mr-3 flex-shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

const Header: React.FC<{onMenuButtonClick: () => void; onAddCostClick: () => void;}> = ({onMenuButtonClick, onAddCostClick}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 bg-white shadow-md lg:hidden">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        <button onClick={onMenuButtonClick} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden" >
          <span className="sr-only">Abrir menu</span>
          <MenuIcon className="h-6 w-6" />
        </button>
        <div className="text-lg font-semibold text-blue-700">{APP_NAME}</div>
        <div className="relative">
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

const TodayTasksDisplay: React.FC = () => {
    const [tasks, setTasks] = useState<TodayTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => { const fetchTasks = async () => { setIsLoading(true); try { setTasks(await getTodaysTasks()); } catch(e) { console.error("Failed to fetch today's tasks", e); } finally { setIsLoading(false); }}; fetchTasks(); }, []);
    if (isLoading) return <div className="flex justify-center items-center p-6"><Spinner /> <span className="ml-2">Carregando tarefas...</span></div>;
    if (tasks.length === 0) return <Card><p className="text-center text-gray-500 py-4">Nenhuma tarefa prioritária para hoje.</p></Card>;
    const handleViewOrder = (orderId: string) => navigate(`/orders/${orderId}`);
    return ( <div className="space-y-4"> {tasks.map(task => ( <Card key={task.id} className={`border-l-4 ${task.priority === 1 ? 'border-red-500' : 'border-yellow-500'}`}> <div className="flex justify-between items-start"> <div> <p className="font-semibold text-gray-800">{task.type}</p> <p className="text-sm text-gray-600">{task.description}</p> <p className="text-xs text-gray-500"> {task.type === 'Prazo de Entrega' || task.type === 'Chegou Hoje' ? `Data: ${formatDateBR(task.relevantDate)}` : `Status: ${task.relatedOrder.status}`} </p> </div> <Button variant="link" size="sm" onClick={() => handleViewOrder(task.relatedOrder.id)}> Ver Encomenda </Button> </div> </Card> ))} </div> );
};

const DolarHojeWidget: React.FC = () => { useEffect(() => { const scriptId = 'dolar-hoje-script'; let script = document.getElementById(scriptId) as HTMLScriptElement | null; if (!script) { script = document.createElement('script'); script.id = scriptId; script.src = 'https://dolarhoje.com/widgets/button/v1.js'; script.async = true; document.body.appendChild(script); } else { if (typeof (window as any).DollarMorennoModule?.init === 'function') (window as any).DollarMorennoModule.init(); } }, []); return ( <Card className="shadow-md mb-6"> <div className="flex items-center justify-between p-4"> <span className="text-xl font-semibold text-gray-700">💵 Dólar Hoje</span> <a href="https://dolarhoje.com/" className="dolar-hoje-button" data-currency="dolar" target="_blank" rel="noopener noreferrer" title="Cotação do Dólar Hoje" >Dólar Hoje</a> </div> </Card> ); };

const DashboardHomePage: React.FC<{}> = () => {
    const { currentUser } = useAuth(); 
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalActiveOrders: 0, totalOpenBluFacilita: 0, overdueBluFacilitaContracts: 0, productsDeliveredThisMonth: 0, totalClients: 0, totalSuppliers: 0, });
    const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'today'>('overview');
    const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false);
    
    const refreshData = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            setStats(await getDashboardStatistics());
            const fetchedAlerts = await getDashboardAlerts();
            setAlerts(Array.isArray(fetchedAlerts) ? fetchedAlerts : []);
        } catch (error) {
            console.error("Error refreshing dashboard data:", error);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);
    useEffect(() => { if(currentUser) refreshData(); }, [currentUser, refreshData]);
    
    const handleAlertAction = (alert: DashboardAlert) => { if (alert.action?.onClick) { alert.action.onClick(); } else if (alert.action?.path) { if (alert.action.orderId) { navigate(`${alert.action.path}/${alert.action.orderId}`); } else { navigate(alert.action.path); } } };
    interface StatCardProps { title: string; value: string | number; colorClass: string; description: string; iconClass?: string; }
    const StatCard: React.FC<StatCardProps> = ({title, value, colorClass, description, iconClass}) => (
        <Card className="shadow-lg text-center">
            <div className="flex items-center justify-center mb-1">
                {iconClass && <i className={`h-6 w-6 mr-2 ${iconClass}`}></i>}
                <h3 className="text-lg font-semibold text-gray-700">{title.toLocaleUpperCase()}</h3>
            </div>
            <p className={`text-4xl font-bold my-2 ${colorClass}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
        </Card>
    );
    
    return ( <div> <PageTitle title="Painel Principal" subtitle={`Bem-vindo, ${currentUser?.email || 'Usuário'}!`} actions={<Button onClick={() => setIsAddCostModalOpen(true)} leftIcon={<PlusCircleIcon className="h-5 w-5"/>}>Registrar Custo</Button>} /> 
        <DolarHojeWidget />
        <RemindersWidget />
        <PendingOrdersWidget />
        <Tabs className="mb-6"> <Tab label="Visão Geral" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} /> <Tab label="Para Hoje" isActive={activeTab === 'today'} onClick={() => setActiveTab('today')} /> </Tabs>
        {activeTab === 'overview' && (
            <>
                {isLoadingStats ? (
                    <div className="text-center p-10">
                        <Spinner size="lg" />
                        <p>Carregando dados...</p>
                    </div>
                ) : (
                    <>
                        {alerts.length > 0 && (
                            <Card title="Alertas Importantes" className="mb-6 bg-blu-accent text-blu-primary">
                                <div className="space-y-3">
                                    {alerts.map(alert => (
                                        <Alert key={alert.id} type={alert.type} message={alert.title} details={alert.message} className="shadow-sm">
                                            {alert.action && (
                                                <Button variant="link" size="sm" onClick={() => handleAlertAction(alert)} className="mt-1 text-sm">
                                                    {alert.action.label}
                                                </Button>
                                            )}
                                        </Alert>
                                    ))}
                                </div>
                            </Card>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            <StatCard title="Clientes" iconClass="heroicons-outline-user-group" value={stats.totalClients} colorClass="text-indigo-600" description="Total de clientes na base." />
                            <StatCard title="Fornecedores" iconClass="heroicons-outline-chat-bubble-left-right" value={stats.totalSuppliers} colorClass="text-purple-600" description="Total de fornecedores cadastrados." />
                            <StatCard title="Encomendas Ativas" iconClass="heroicons-outline-archive-box-arrow-down" value={stats.totalActiveOrders} colorClass="text-blue-600" description="Pedidos em andamento." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Entregas no Mês" iconClass="heroicons-outline-archive-box-arrow-down" value={stats.productsDeliveredThisMonth} colorClass="text-green-600" description="Produtos entregues este mês." />
                            <StatCard title="BluFacilita Aberto" iconClass="heroicons-outline-currency-dollar" value={formatCurrencyBRL(stats.totalOpenBluFacilita)} colorClass="text-amber-600" description="Valor de contratos não quitados." />
                            <StatCard title="BluFacilita Atrasados" iconClass="heroicons-outline-exclamation-triangle" value={stats.overdueBluFacilitaContracts} colorClass="text-red-600" description="Contratos com status 'Atrasado'." />
                        </div>
                        <Card className="mt-8 shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Avisos e Atalhos</h3>
                            <p className="text-gray-600 mt-2">Use o menu lateral para navegar pelas seções do painel.</p>
                            <div className="mt-4 space-x-0 space-y-2 sm:space-x-2 sm:space-y-0 flex flex-col sm:flex-row">
                                <Link to="/clients" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-center">Gerenciar Clientes</Link>
                                <Link to="/orders" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center">Ver Encomendas</Link>
                                <Link to="/suppliers" className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-center">Fornecedores</Link>
                                <Link to="/financial-reports" className="inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-center">Relatórios</Link>
                            </div>
                        </Card>
                    </>
                )}
            </>
        )}
        {activeTab === 'today' && <TodayTasksDisplay />}
        <AddOrderCostModal isOpen={isAddCostModalOpen} onClose={() => setIsAddCostModalOpen(false)} onSave={(item) => { console.log("Custo salvo (Home):", item); if(currentUser) refreshData(); }} />
    </div> );
};

const App: React.FC<{}> = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
                    <Route path="/monthly-table" element={<MonthlyTablePage />} />
                    <Route path="/financial-reports" element={<FinancialReportsPageContainer />} />
                    <Route path="/user-management" element={<UserManagementPage />} />
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
