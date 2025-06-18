import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrderById,
  formatCurrencyBRL,
  formatDateBR,
  getClientPaymentsByOrderId,
  getCorreiosAREvents,
  sendOrderContractToAutentique,
  DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE,
  ORDER_STATUS_OPTIONS,
  PRODUCT_CONDITION_OPTIONS,
  saveOrder,
  uploadArrivalPhoto,
} from '../services/AppService';
import {
  Order,
  PaymentMethod,
  BluFacilitaContractStatus,
  ClientPayment,
  OrderStatus,
  DocumentFile,
} from '../types';
import {
  Card,
  Button,
  Spinner,
  PageTitle,
  Tabs,
  Tab,
  Toast,
} from '../components/SharedComponents';
import { EyeIcon, EyeSlashIcon, RegisterPaymentModal } from '../App';
import { Pencil } from 'lucide-react';

interface ParsedThreeuTools {
  categories: Record<string, Record<string, string>>;
  data: {
    serialNumber?: string;
    iosVersion?: string;
    manufactureDate?: string;
    warrantyDate?: string;
    chargeTimes?: string;
    batteryLife?: string;
  };
}

const parseThreeuToolsReport = (report: string): ParsedThreeuTools => {
  const result: ParsedThreeuTools = { categories: {}, data: {} };
  const lines = report.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2];
    let category = 'Outros';
    if (/serial|imei|model|ios|udid/i.test(key)) {
      category = 'Identificação do aparelho';
    } else if (/camera|display|screen|battery/i.test(key)) {
      category = 'Câmeras, Tela e Bateria';
    } else if (/wifi|bluetooth|carrier|network|sim|modem/i.test(key)) {
      category = 'Rede e Conectividade';
    } else if (/warranty|activation|status|icloud|lock/i.test(key)) {
      category = 'Status e Ativação';
    }
    if (!result.categories[category]) result.categories[category] = {};
    result.categories[category][key] = value;
    const lower = key.toLowerCase();
    if (lower.includes('serial')) result.data.serialNumber = value;
    if (lower.includes('ios')) result.data.iosVersion = value;
    if (lower.includes('production') || lower.includes('manufacture')) result.data.manufactureDate = value;
    if (lower.includes('warranty')) result.data.warrantyDate = value;
    if (lower.includes('charge')) result.data.chargeTimes = value;
    if (lower.includes('battery') && (lower.includes('life') || lower.includes('health'))) result.data.batteryLife = value;
  }
  return result;
};

const ThreeuToolsFormatted: React.FC<{ report: string }> = ({ report }) => {
  const parsed = useMemo(() => parseThreeuToolsReport(report), [report]);
  return (
    <div className="grid gap-4 mt-1">
      {Object.entries(parsed.categories).map(([cat, entries]) => (
        <Card key={cat} className="p-2">
          <h4 className="font-semibold text-sm mb-1">{cat}</h4>
          <table className="min-w-full text-xs">
            <tbody>
              {Object.entries(entries).map(([k, v]) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="pr-2 font-medium whitespace-nowrap">{k}</td>
                  <td className="whitespace-nowrap">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
};


const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [supplierNameVisible, setSupplierNameVisible] = useState(false);
  const [purchasePriceVisible, setPurchasePriceVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'Resumo' | 'Financeiro' | 'Status' | 'Notas & Anexos'>('Resumo');
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [correiosEvents, setCorreiosEvents] = useState<any[]>([]);
  const [isLoadingCorreios, setIsLoadingCorreios] = useState(false);
  const [orderToRegisterPayment, setOrderToRegisterPayment] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [backupOrder, setBackupOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId).then(o => setOrder(o || null)).catch(console.error);
      getClientPaymentsByOrderId(orderId).then(setClientPayments).catch(() => setClientPayments([]));
    }
  }, [orderId]);

  const handleSendContract = async () => {
    if (!order) return;
    try {
      await sendOrderContractToAutentique(order.id);
      alert('Contrato enviado via Autentique.');
    } catch (err) {
      console.error('Erro ao enviar contrato', err);
      alert('Falha ao enviar contrato.');
    }
  };

  const startEditing = () => {
    if (order) {
      setBackupOrder(order);
      setIsEditing(true);
    }
  };

  const handleSaveInline = async () => {
    if (!order) return;
    setIsSaving(true);
    try {
      await saveOrder(order);
      setToastMsg('Pedido atualizado com sucesso.');
      setIsEditing(false);
      setBackupOrder(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (backupOrder) {
      setOrder(backupOrder);
    }
    setIsEditing(false);
    setBackupOrder(null);
  };

  const handleArrivalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order) return;
    const files = e.target.files;
    if (!files) return;
    const uploaded: DocumentFile[] = [];
    for (const file of Array.from(files)) {
      const doc = await uploadArrivalPhoto(order.id, file);
      uploaded.push(doc);
    }
    const updated = { ...order, arrivalPhotos: [...(order.arrivalPhotos || []), ...uploaded] };
    setOrder(updated);
    await saveOrder(updated);
    e.target.value = '';
  };

  const parsedReport = useMemo(() => {
    if (!order?.threeuToolsReport) return { categories: {}, data: {} } as ParsedThreeuTools;
    return parseThreeuToolsReport(order.threeuToolsReport);
  }, [order?.threeuToolsReport]);

  if (!order) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  const getDeliveryDate = (o: Order): string | undefined => {
    const entry = o.trackingHistory?.find(h => h.status === OrderStatus.ENTREGUE);
    return entry?.date;
  };

  const OrderStatusTimeline: React.FC<{ order: Order }> = ({ order }) => {
    const getStatusHistory = (status: OrderStatus) => order.trackingHistory?.find(h => h.status === status);
    const relevantStatuses = React.useMemo(() => {
      if ((order.status as OrderStatus) === OrderStatus.CANCELADO) {
        return [OrderStatus.PEDIDO_CRIADO, OrderStatus.CANCELADO];
      }
      const typicalPath: OrderStatus[] = [
        OrderStatus.PEDIDO_CRIADO,
        OrderStatus.PAGAMENTO_CONFIRMADO,
        OrderStatus.COMPRA_REALIZADA,
        OrderStatus.A_CAMINHO_DO_ESCRITORIO,
        OrderStatus.CHEGOU_NO_ESCRITORIO,
        OrderStatus.AGUARDANDO_RETIRADA,
        OrderStatus.ENVIADO,
        OrderStatus.ENTREGUE,
      ];
      let displayStatusesSet = new Set<OrderStatus>();
      order.trackingHistory?.forEach(h => displayStatusesSet.add(h.status));
      displayStatusesSet.add(order.status);
      const currentIdxInTypical = typicalPath.indexOf(order.status);
      typicalPath.slice(0, currentIdxInTypical !== -1 ? currentIdxInTypical + 2 : typicalPath.length).forEach(s => displayStatusesSet.add(s));
      if (!displayStatusesSet.has(OrderStatus.ENVIADO) && order.status !== OrderStatus.CANCELADO) {
        displayStatusesSet.add(OrderStatus.ENVIADO);
      }
      if (!displayStatusesSet.has(OrderStatus.ENTREGUE) && order.status !== OrderStatus.CANCELADO) {
        displayStatusesSet.add(OrderStatus.ENTREGUE);
      }
      let displayStatuses = Array.from(displayStatusesSet);
      displayStatuses.sort((a, b) => ORDER_STATUS_OPTIONS.indexOf(a) - ORDER_STATUS_OPTIONS.indexOf(b));
      return displayStatuses;
    }, [order.status, order.trackingHistory]);

    if (!order.trackingHistory || order.trackingHistory.length === 0) {
      return (
        <div>
          <p className="text-sm text-gray-600 mb-1">Status Atual:</p>
          <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">{order.status}</span>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {relevantStatuses.map((status, index) => {
          const historyEntry = getStatusHistory(status);
          const isCurrentActualStatus = order.status === status;
          const isPastStatus = historyEntry && ORDER_STATUS_OPTIONS.indexOf(status) < ORDER_STATUS_OPTIONS.indexOf(order.status);
          return (
            <div key={status} className="flex items-start">
              <div className="flex flex-col items-center mr-3">
                <div className={`w-3 h-3 rounded-full ${
                  isCurrentActualStatus ? 'bg-blue-500 animate-pulse' : (historyEntry || isPastStatus ? 'bg-green-500' : 'bg-gray-300')
                }`} />
                {index < relevantStatuses.length - 1 && <div className="w-px h-8 bg-gray-300" />}
              </div>
              <div>
                <p className={`text-sm ${
                  isCurrentActualStatus ? 'text-blue-700 font-semibold' : (historyEntry || isPastStatus ? 'text-green-700' : 'text-gray-500')
                }`}>{status}</p>
                {historyEntry && (
                  <p className="text-xs text-gray-500">{formatDateBR(historyEntry.date, true)}{historyEntry.notes ? ` - ${historyEntry.notes}` : ''}</p>
                )}
                {isCurrentActualStatus && !historyEntry && (<p className="text-xs text-gray-500">Status atual</p>)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <PageTitle
        title={`Encomenda: ${order.productName} ${order.model}`}
        subtitle={order.customerName}
        actions={
          <div className="flex space-x-2">
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={startEditing} title="Editar">
                <Pencil className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={handleSaveInline} disabled={isSaving}>
                  {isSaving ? <Spinner size="sm" /> : 'Salvar alterações'}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCancelEdit}>Cancelar</Button>
              </>
            )}
            <Button onClick={() => navigate('/orders')}>Voltar</Button>
          </div>
        }
      />
      <Tabs className="mb-4">
        <Tab label="Resumo" isActive={activeTab === 'Resumo'} onClick={() => setActiveTab('Resumo')} />
        <Tab label="Financeiro" isActive={activeTab === 'Financeiro'} onClick={() => setActiveTab('Financeiro')} />
        <Tab label="Status" isActive={activeTab === 'Status'} onClick={() => setActiveTab('Status')} />
        <Tab label="Notas & Anexos" isActive={activeTab === 'Notas & Anexos'} onClick={() => setActiveTab('Notas & Anexos')} />
      </Tabs>

      {activeTab === 'Resumo' && (
        <div className="space-y-4 text-sm">
          <Card>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">Informações Gerais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <span className="font-medium text-gray-800">Cliente</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.customerName} onChange={e => setOrder({ ...order, customerName: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.customerName}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Produto</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.productName} onChange={e => setOrder({ ...order, productName: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.productName}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Modelo</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.model} onChange={e => setOrder({ ...order, model: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.model}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Capacidade</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.capacity} onChange={e => setOrder({ ...order, capacity: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.capacity}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Tamanho</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.watchSize || ''} onChange={e => setOrder({ ...order, watchSize: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.watchSize || '-'}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Cor</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.color} onChange={e => setOrder({ ...order, color: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.color}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Condição</span>
                {isEditing ? (
                  <select className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.condition} onChange={e => setOrder({ ...order, condition: e.target.value as any })}>
                    {PRODUCT_CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <p className="text-gray-700 mt-1">{order.condition}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Fornecedor</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.supplierName || ''} onChange={e => setOrder({ ...order, supplierName: e.target.value })} />
                ) : (
                  <div className="flex items-center mt-1 text-gray-700">
                    {supplierNameVisible ? (<span>{order.supplierName || 'N/A'}</span>) : (<span className="blur-sm select-none">Fornecedor Protegido X</span>)}
                    <Button variant="ghost" size="sm" onClick={() => setSupplierNameVisible(!supplierNameVisible)} className="ml-1 p-1">
                      {supplierNameVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-800">Custo (Fornecedor)</span>
                {isEditing ? (
                  <input className="w-full px-2 py-1 border rounded text-sm mt-1" type="number" value={order.purchasePrice} onChange={e => setOrder({ ...order, purchasePrice: parseFloat(e.target.value) || 0 })} />
                ) : (
                  <div className="flex items-center mt-1 text-gray-700">
                    {purchasePriceVisible ? (<span>{formatCurrencyBRL(order.purchasePrice)}</span>) : (
                      <span className="blur-sm select-none">{formatCurrencyBRL(order.purchasePrice)}</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setPurchasePriceVisible(!purchasePriceVisible)} className="ml-1 p-1">
                      {purchasePriceVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <span className="font-medium text-gray-800">Observações</span>
                {isEditing ? (
                  <textarea className="w-full px-2 py-1 border rounded text-sm mt-1" value={order.notes || ''} onChange={e => setOrder({ ...order, notes: e.target.value })} />
                ) : (
                  <p className="text-gray-700 mt-1">{order.notes || '-'}</p>
                )}
              </div>
              {parsedReport.data.serialNumber && (
                <div>
                  <span className="font-medium text-gray-800">Serial Number</span>
                  <p className="text-gray-700 mt-1">{parsedReport.data.serialNumber}</p>
                </div>
              )}
              {parsedReport.data.iosVersion && (
                <div>
                  <span className="font-medium text-gray-800">iOS Version</span>
                  <p className="text-gray-700 mt-1">{parsedReport.data.iosVersion}</p>
                </div>
              )}
              {parsedReport.data.manufactureDate && (
                <div>
                  <span className="font-medium text-gray-800">Data de Fabricação</span>
                  <p className="text-gray-700 mt-1">{parsedReport.data.manufactureDate}</p>
                </div>
              )}
              {parsedReport.data.warrantyDate && (
                <div>
                  <span className="font-medium text-gray-800">Data de Garantia</span>
                  <p className="text-gray-700 mt-1">{parsedReport.data.warrantyDate}</p>
                </div>
              )}
              {parsedReport.data.chargeTimes && (
                <div>
                  <span className="font-medium text-gray-800">Charge Times</span>
                  <p className="text-gray-700 mt-1">{parsedReport.data.chargeTimes}</p>
                </div>
              )}
              {parsedReport.data.batteryLife && (
                <div>
                  <span className="font-medium text-gray-800">Battery Life</span>
                  <p className="text-gray-700 mt-1">{parsedReport.data.batteryLife}</p>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="mt-4 flex space-x-2">
                <Button size="sm" onClick={handleSaveInline} disabled={isSaving}>{isSaving ? <Spinner size="sm" /> : 'Salvar alterações'}</Button>
                <Button size="sm" variant="secondary" onClick={handleCancelEdit}>Cancelar</Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Financeiro' && (
        <div className="space-y-4 text-sm">
          <Card>
            <h3 className="text-lg font-semibold mb-2">Detalhes Financeiros</h3>
            {order.sellingPrice !== undefined && <p className="text-gray-700"><strong>Valor de Venda (Cliente):</strong> {formatCurrencyBRL(order.sellingPrice)}</p>}
            <p className="text-gray-700"><strong>Forma de Pagamento:</strong> {order.paymentMethod || 'N/A'}</p>
            {order.paymentMethod === PaymentMethod.BLU_FACILITA && (
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50 text-gray-700 rounded-md">
                <h4 className="font-semibold text-blue-700 mb-1">Detalhes BluFacilita</h4>
                {order.bluFacilitaUsesSpecialRate && <p><strong>Taxa:</strong> {order.bluFacilitaSpecialAnnualRate?.toFixed(2)}% a.a. (Especial)</p>}
                {!order.bluFacilitaUsesSpecialRate && <p><strong>Taxa:</strong> {DEFAULT_BLU_FACILITA_ANNUAL_INTEREST_RATE * 100}% a.a. (Padrão)</p>}
                <p><strong>Entrada:</strong> {formatCurrencyBRL(order.downPayment)}</p>
                <p><strong>Valor Financiado:</strong> {formatCurrencyBRL(order.financedAmount)}</p>
                <p><strong>Total com Juros (Financiado):</strong> {formatCurrencyBRL(order.totalWithInterest)}</p>
                <p><strong>Nº de Parcelas:</strong> {order.installments || 'N/A'}</p>
                <p><strong>Valor da Parcela:</strong> {formatCurrencyBRL(order.installmentValue)}</p>
                <p>
                  <strong>Status Contrato:</strong>{' '}
                  <span className={`font-medium ${order.bluFacilitaContractStatus === BluFacilitaContractStatus.ATRASADO ? 'text-red-600' : order.bluFacilitaContractStatus === BluFacilitaContractStatus.EM_DIA ? 'text-green-600' : 'text-gray-700'}`}>{order.bluFacilitaContractStatus || 'N/A'}</span>
                </p>
                {order.imeiBlocked && <p className="text-red-600 font-semibold">IMEI BLOQUEADO INTERNAMENTE</p>}
              </div>
            )}
            {order.shippingCostSupplierToBlu !== undefined && <p className="text-gray-700"><strong>Custo Frete (Fornecedor → Blu):</strong> {formatCurrencyBRL(order.shippingCostSupplierToBlu)}</p>}
            {order.shippingCostBluToClient !== undefined && <p className="text-gray-700"><strong>Custo Frete (Blu → Cliente):</strong> {formatCurrencyBRL(order.shippingCostBluToClient)}</p>}
          </Card>
        </div>
      )}

      {activeTab === 'Status' && (
        <div className="space-y-4 text-sm">
          {order.trackingCode && (
            <Card>
              <h3 className="text-lg font-semibold mb-2">Rastreamento Correios</h3>
              <p className="text-gray-700"><strong>Código:</strong> {order.trackingCode}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={async () => {
                  if (order.trackingCode) {
                    setIsLoadingCorreios(true);
                    try {
                      setCorreiosEvents(await getCorreiosAREvents(order.trackingCode));
                    } catch (e) {
                      console.error(e);
                      setCorreiosEvents([]);
                    }
                    setIsLoadingCorreios(false);
                  }
                }}
              >
                Atualizar
              </Button>
              {isLoadingCorreios ? (
                <div className="mt-2"><Spinner size="sm" /></div>
              ) : (
                correiosEvents.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                    {correiosEvents.map((ev, i) => (
                      <li key={i}>{formatDateBR(ev.dataCriacao, true)} - {ev.descricaoEvento}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">Nenhum evento.</p>
                )
              )}
            </Card>
          )}
          <Card>
            <h3 className="text-lg font-semibold mb-2">Status e Histórico</h3>
            <p className="text-gray-700"><strong>Data do Pedido:</strong> {formatDateBR(order.orderDate)}</p>
            <p className="text-gray-700"><strong>Prazo Estimado:</strong> {formatDateBR(order.estimatedDeliveryDate)}</p>
            {(() => {
              const d = getDeliveryDate(order);
              if (d) {
                const onTime = order.estimatedDeliveryDate ? new Date(d) <= new Date(order.estimatedDeliveryDate + 'T23:59:59') : true;
                return (
                  <p className="text-gray-700">
                    <strong>Data de Entrega:</strong> {formatDateBR(d)}{' '}
                    {order.estimatedDeliveryDate && (
                      <span className={onTime ? 'text-green-600 font-semibold' : 'text-orange-600 font-semibold'}>
                        ({onTime ? 'Em dia' : 'Atraso'})
                      </span>
                    )}
                  </p>
                );
              } else {
                return <p className="text-gray-700">Em andamento</p>;
              }
            })()}
            {order.arrivalDate && <p className="text-gray-700"><strong>Data de Chegada:</strong> {formatDateBR(order.arrivalDate)}</p>}
            {order.imei && <p className="text-gray-700"><strong>IMEI:</strong> {order.imei}</p>}
            {order.batteryHealth !== undefined && <p className="text-gray-700"><strong>Saúde da Bateria:</strong> {order.batteryHealth}%</p>}
            {order.readyForDelivery && <p className="font-semibold text-green-600">Produto pronto para entrega!</p>}
            <div>
              <h4 className="text-md font-semibold mb-1 text-gray-800">Linha do Tempo:</h4>
              <OrderStatusTimeline order={order} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Notas & Anexos' && (
        <div className="space-y-4 text-sm">
          <Card>
            <h3 className="text-lg font-semibold mb-2">Notas e Anexos</h3>
            {order.notes && <p className="text-gray-700"><strong>Observações (Pedido):</strong> {order.notes}</p>}
            {order.arrivalNotes && <p className="text-gray-700"><strong>Observações (Chegada):</strong> {order.arrivalNotes}</p>}
            {order.threeuToolsReport && (
              <div>
                <strong>Relatório 3uTools:</strong>
                <ThreeuToolsFormatted report={order.threeuToolsReport} />
              </div>
            )}
            {order.whatsAppHistorySummary && <p className="text-gray-700"><strong>Resumo WhatsApp:</strong> {order.whatsAppHistorySummary}</p>}
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">Pagamentos Recebidos</summary>
              {clientPayments.length > 0 ? (
                <ul className="list-disc pl-5 text-xs bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto mt-1">
                  {clientPayments.map(p => (
                    <li key={p.id}>
                      {formatDateBR(p.paymentDate)}: {formatCurrencyBRL(p.amountPaid)} ({p.paymentMethodUsed}{p.installments ? ` - ${p.installments}x` : ''}){p.notes && <span className="text-gray-500"> - {p.notes}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-gray-500 mt-1 block">Nenhum pagamento registrado para esta encomenda.</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => setOrderToRegisterPayment(order)} leftIcon={<EyeIcon className="h-4 w-4" />} className="mt-1">
                Registrar Recebimento
              </Button>
            </details>
            <div className="mt-2">
              <h4 className="text-md font-semibold mb-1 text-gray-800">Documentos:</h4>
              {order.documents.length > 0 ? order.documents.map(d => (
                <span key={d.id} className="text-xs bg-gray-100 p-1 rounded mr-1">{d.name}</span>
              )) : <span className="text-xs text-gray-500">Nenhum.</span>}
            </div>
            <div className="mt-2">
              <h4 className="text-md font-semibold mb-1 text-gray-800">Fotos da Chegada:</h4>
              {order.arrivalPhotos && order.arrivalPhotos.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {order.arrivalPhotos.map(photo => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-500">Nenhuma foto.</span>
              )}
              <input type="file" className="hidden" multiple ref={fileInputRef} onChange={handleArrivalPhotoUpload} />
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-1">
                Adicionar Foto
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="secondary" onClick={() => navigate(`/orders/${order.id}/occurrences`)}>Ocorrências</Button>
        <Button onClick={() => navigate('/orders')}>Voltar</Button>
        <Button variant="secondary" onClick={handleSendContract}>Enviar Contrato</Button>
      </div>

      {orderToRegisterPayment && (
        <RegisterPaymentModal
          order={orderToRegisterPayment}
          isOpen={!!orderToRegisterPayment}
          onClose={() => setOrderToRegisterPayment(null)}
          onPaymentSaved={async () => {
            if (orderId) setClientPayments(await getClientPaymentsByOrderId(orderId));
          }}
        />
      )}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
};

export default OrderDetailsPage;
