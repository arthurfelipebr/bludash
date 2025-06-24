import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Auth';
import {
  getDashboardStatistics,
  getDashboardAlerts,
  formatCurrencyBRL,
  getTodaysTasks,
  formatDateBR,
  getOrders,
} from '../../services/AppService';
import { DashboardAlert, TodayTask } from '../../types';
import {
  PageTitle,
  Card,
  Tabs,
  Tab,
  Spinner,
  Button,
  Alert,
} from '../../components/SharedComponents';
import RemindersWidget from '../../components/RemindersWidget';
import PendingOrdersWidget from '../../components/PendingOrdersWidget';
import StatCard from '../../components/StatCard';
import { AddOrderCostModal } from '../../App';

const TodayTasksDisplay: React.FC = () => {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        setTasks(await getTodaysTasks());
      } catch (e) {
        console.error("Failed to fetch today's tasks", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (isLoading)
    return (
      <div className="flex justify-center items-center p-6">
        <Spinner /> <span className="ml-2">Carregando tarefas...</span>
      </div>
    );
  if (tasks.length === 0)
    return (
      <Card>
        <p className="text-center text-gray-500 py-4">Nenhuma tarefa prioritária para hoje.</p>
      </Card>
    );
  const handleViewOrder = (orderId: string) => navigate(`/orders/${orderId}`);

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className={`border-l-4 ${task.priority === 1 ? 'border-red-500' : 'border-yellow-500'}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-800">{task.type}</p>
              <p className="text-sm text-gray-600">{task.description}</p>
              <p className="text-xs text-gray-500">
                {task.type === 'Prazo de Entrega' || task.type === 'Chegou Hoje'
                  ? `Data: ${formatDateBR(task.relevantDate)}`
                  : `Status: ${task.relatedOrder.status}`}
              </p>
            </div>
            <Button variant="link" size="sm" onClick={() => handleViewOrder(task.relatedOrder.id)}>
              Ver Encomenda
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

const DolarHojeWidget: React.FC = () => {
  useEffect(() => {
    const scriptId = 'dolar-hoje-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://dolarhoje.com/widgets/button/v1.js';
      script.async = true;
      document.body.appendChild(script);
    } else {
      if (typeof (window as any).DollarMorennoModule?.init === 'function') {
        (window as any).DollarMorennoModule.init();
      }
    }
  }, []);
  return (
    <Card className="shadow-md mb-6">
      <div className="flex items-center justify-between p-4">
        <span className="text-xl font-semibold text-gray-700">💵 Dólar Hoje</span>
        <a
          href="https://dolarhoje.com/"
          className="dolar-hoje-button"
          data-currency="dolar"
          target="_blank"
          rel="noopener noreferrer"
          title="Cotação do Dólar Hoje"
        >
          Dólar Hoje
        </a>
      </div>
    </Card>
  );
};

const DashboardHomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalActiveOrders: 0,
    totalOpenBluFacilita: 0,
    overdueBluFacilitaContracts: 0,
    productsDeliveredThisMonth: 0,
    totalClients: 0,
    totalSuppliers: 0,
  });
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'today'>('today');
  const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      setStats(await getDashboardStatistics());
      const fetchedAlerts = await getDashboardAlerts();
      const orders = await getOrders();
      const missingInvoice = orders.filter(
        (o) => !(o.documents?.some((d) => /nota\s*fiscal|invoice/i.test(d.name || '')))
      );
      let allAlerts = Array.isArray(fetchedAlerts) ? fetchedAlerts : [];
      if (missingInvoice.length > 0) {
        allAlerts = [
          ...allAlerts,
          {
            id: 'missing-invoice',
            type: 'warning',
            title: 'Pedidos sem Nota Fiscal',
            message: 'Existem pedidos sem nota fiscal anexada.',
            action: { label: 'Ver pedidos', path: '/orders' },
          },
        ];
      }
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser !== null) {
      refreshData();
    }
  }, [currentUser, refreshData]);

  const handleAlertAction = (alert: DashboardAlert) => {
    if (alert.action?.onClick) {
      alert.action.onClick();
    } else if (alert.action?.path) {
      if (alert.action.orderId) {
        navigate(`${alert.action.path}/${alert.action.orderId}`);
      } else {
        navigate(alert.action.path);
      }
    }
  };

  return (
    <div>
      <PageTitle
        title="Painel Principal"
        subtitle={`Bem-vindo, ${currentUser?.email || 'Usuário'}!`}
        actions={
          <Button onClick={() => setIsAddCostModalOpen(true)} leftIcon={<span className="h-5 w-5">+</span>}>
            Registrar Custo
          </Button>
        }
      />
      <DolarHojeWidget />
      <RemindersWidget />
      <PendingOrdersWidget />
      <Tabs className="mb-6">
        <Tab label="Para Hoje" isActive={activeTab === 'today'} onClick={() => setActiveTab('today')} />
        <Tab label="Visão Geral" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
      </Tabs>
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
                    {alerts.map((alert) => (
                      <Alert
                        key={alert.id}
                        type={alert.type}
                        message={alert.title}
                        details={alert.message}
                        className="shadow-sm"
                      >
                        {alert.action && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleAlertAction(alert)}
                            className="mt-1 text-sm"
                          >
                            {alert.action.label}
                          </Button>
                        )}
                      </Alert>
                    ))}
                  </div>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <StatCard
                  title="Clientes"
                  iconClass="heroicons-outline-user-group"
                  value={stats.totalClients}
                  colorClass="text-indigo-600"
                  description="Total de clientes na base."
                />
                <StatCard
                  title="Fornecedores"
                  iconClass="heroicons-outline-chat-bubble-left-right"
                  value={stats.totalSuppliers}
                  colorClass="text-purple-600"
                  description="Total de fornecedores cadastrados."
                />
                <StatCard
                  title="Encomendas Ativas"
                  iconClass="heroicons-outline-archive-box-arrow-down"
                  value={stats.totalActiveOrders}
                  colorClass="text-blue-600"
                  description="Pedidos em andamento."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Entregas no Mês"
                  iconClass="heroicons-outline-archive-box-arrow-down"
                  value={stats.productsDeliveredThisMonth}
                  colorClass="text-green-600"
                  description="Produtos entregues este mês."
                />
                <StatCard
                  title="BluFacilita Aberto"
                  iconClass="heroicons-outline-currency-dollar"
                  value={formatCurrencyBRL(stats.totalOpenBluFacilita)}
                  colorClass="text-amber-600"
                  description="Valor de contratos não quitados."
                />
                <StatCard
                  title="BluFacilita Atrasados"
                  iconClass="heroicons-outline-exclamation-triangle"
                  value={stats.overdueBluFacilitaContracts}
                  colorClass="text-red-600"
                  description="Contratos com status 'Atrasado'."
                />
              </div>
              <Card className="mt-8 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Avisos e Atalhos</h3>
                <p className="text-gray-600 mt-2">Use o menu lateral para navegar pelas seções do painel.</p>
                <div className="mt-4 space-x-0 space-y-2 sm:space-x-2 sm:space-y-0 flex flex-col sm:flex-row">
                  <Link
                    to="/clients"
                    className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-center"
                  >
                    Gerenciar Clientes
                  </Link>
                  <Link
                    to="/orders"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center"
                  >
                    Ver Encomendas
                  </Link>
                  <Link
                    to="/suppliers"
                    className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-center"
                  >
                    Fornecedores
                  </Link>
                  <Link
                    to="/financial-reports"
                    className="inline-block px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-center"
                  >
                    Relatórios
                  </Link>
                </div>
              </Card>
            </>
          )}
        </>
      )}
      {activeTab === 'today' && <TodayTasksDisplay />}
      <AddOrderCostModal
        isOpen={isAddCostModalOpen}
        onClose={() => setIsAddCostModalOpen(false)}
        onSave={(item) => {
          console.log('Custo salvo (Home):', item);
          if (currentUser) refreshData();
        }}
      />
    </div>
  );
};

export default DashboardHomePage;
