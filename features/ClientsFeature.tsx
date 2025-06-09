import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Client, ClientType, Order, PaymentMethod, OrderStatus } from '../types';
import { 
  saveClient, getClients, deleteClient, getClientById,
  getOrders, 
  CLIENT_TYPE_OPTIONS, formatCPFOrCNPJ, formatDateBR, formatCurrencyBRL, exportToCSV
} from '../services/AppService';
import { Button, Modal, Input, Select, Textarea, Card, PageTitle, Alert, ResponsiveTable, Spinner } from '../components/SharedComponents';
import { v4 as uuidv4 } from 'uuid';

const BRAZIL_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const initialFormData: Omit<Client, 'id' | 'registrationDate'> = {
  fullName: '',
  cpfOrCnpj: '',
  email: '',
  phone: '',
  address: '',
  cep: '',
  city: '',
  state: '',
  clientType: ClientType.PESSOA_FISICA,
  notes: '',
  isDefaulter: false,
  defaulterNotes: '',
};

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => Promise<void>;
  initialClient?: Client | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, onSave, initialClient }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'registrationDate'>>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  
  useEffect(() => {
    if (initialClient) {
      setFormData({
        ...initialClient,
        notes: initialClient.notes || '',
        defaulterNotes: initialClient.defaulterNotes || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [initialClient, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Fetch cities whenever state (UF) changes
  useEffect(() => {
    if (!formData.state) {
      setCities([]);
      setFormData(prev => ({ ...prev, city: '' }));
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`)
      .then(res => res.json())
      .then((data: any[]) => {
        setCities(data.map(c => c.nome));
      })
      .catch(() => setCities([]));
  }, [formData.state]);

  // Auto fill address by CEP using ViaCEP
  useEffect(() => {
    const cleaned = formData.cep.replace(/\D/g, '');
    if (cleaned.length === 8) {
      fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
        .then(res => res.json())
        .then(data => {
          if (data.erro) return;
          setFormData(prev => ({
            ...prev,
            address: data.logradouro || prev.address,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        })
        .catch(() => {});
    }
  }, [formData.cep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.fullName || !formData.cpfOrCnpj || !formData.email || !formData.phone) {
        setError("Nome, CPF/CNPJ, Email e Telefone são obrigatórios.");
        return;
    }
    if (formData.clientType === ClientType.PESSOA_FISICA && formData.cpfOrCnpj.replace(/\D/g, '').length !== 11) {
        setError("CPF inválido. Deve conter 11 dígitos.");
        return;
    }
    if (formData.clientType === ClientType.PESSOA_JURIDICA && formData.cpfOrCnpj.replace(/\D/g, '').length !== 14) {
        setError("CNPJ inválido. Deve conter 14 dígitos.");
        return;
    }
    if (!formData.email.includes('@')) {
        setError("Email inválido.");
        return;
    }

    setIsLoading(true);
    const clientToSave: Client = {
      ...formData,
      id: initialClient?.id || uuidv4(),
      registrationDate: initialClient?.registrationDate || new Date().toISOString(),
      cpfOrCnpj: formData.cpfOrCnpj.replace(/\D/g, ''), 
    };

    try {
      await onSave(clientToSave); 
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
        <Input label="Nome Completo" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Tipo de Cliente" id="clientType" name="clientType" value={formData.clientType} onChange={handleChange} options={CLIENT_TYPE_OPTIONS.map(c => ({ value: c, label: c }))} />
            <Input 
                label={formData.clientType === ClientType.PESSOA_FISICA ? "CPF" : "CNPJ"} 
                id="cpfOrCnpj" name="cpfOrCnpj" 
                value={formatCPFOrCNPJ(formData.cpfOrCnpj, formData.clientType)} 
                onChange={handleChange} required 
                placeholder={formData.clientType === ClientType.PESSOA_FISICA ? "000.000.000-00" : "00.000.000/0000-00"}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="E-mail" id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <Input label="Telefone" id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required placeholder="(00) 90000-0000" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input label="Endereço" id="address" name="address" value={formData.address} onChange={handleChange} />
            <Input label="CEP" id="cep" name="cep" value={formData.cep} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                label="Estado (UF)"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                options={BRAZIL_STATES}
                placeholder="Selecione"
            />
            <Select
                label="Cidade"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                options={cities.map(c => ({ value: c, label: c }))}
                placeholder="Selecione"
            />
        </div>
        <Textarea label="Observações" id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {initialClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface ClientDetailsModalProps {
    client: Client | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (client: Client) => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, isOpen, onClose, onEdit }) => {
    const [clientOrders, setClientOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [filterBluFacilita, setFilterBluFacilita] = useState(false);

    useEffect(() => {
        const fetchClientOrders = async () => {
            if (client && isOpen) {
                setOrdersLoading(true);
                try {
                    const allOrders = await getOrders();
                    const orders = allOrders.filter(o => o.clientId === client.id)
                                          .sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
                    setClientOrders(orders);
                } catch (error) {
                    console.error("Failed to fetch client orders:", error);
                } finally {
                    setOrdersLoading(false);
                }
            }
        };
        fetchClientOrders();
    }, [client, isOpen]);

    const filteredClientOrders = useMemo(() => {
        if (!filterBluFacilita) return clientOrders;
        return clientOrders.filter(o => o.paymentMethod === PaymentMethod.BLU_FACILITA);
    }, [clientOrders, filterBluFacilita]);

    if (!client) return null;

    const orderColumns = [
        { header: 'Produto', accessor: (item: Order): ReactNode => `${item.productName} ${item.model} (${item.capacity})` },
        { header: 'Data Compra', accessor: (item: Order): ReactNode => formatDateBR(item.orderDate) },
        { header: 'Valor', accessor: (item: Order): ReactNode => formatCurrencyBRL(item.sellingPrice || item.purchasePrice) },
        { header: 'Pagamento', accessor: 'paymentMethod' as keyof Order },
        { header: 'Status', accessor: 'status' as keyof Order},
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes de ${client.fullName}`} size="xl">
            <div className="space-y-4">
                <Card title="Informações do Cliente" actions={<Button variant="ghost" onClick={() => onEdit(client)}>Editar Cliente</Button>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <p><strong>CPF/CNPJ:</strong> {formatCPFOrCNPJ(client.cpfOrCnpj, client.clientType)} ({client.clientType})</p>
                        <p><strong>Email:</strong> {client.email}</p>
                        <p><strong>Telefone:</strong> {client.phone}</p>
                        <p><strong>Endereço:</strong> {client.address ? `${client.address}, ${client.city} - ${client.state}, CEP: ${client.cep}` : 'Não informado'}</p>
                        <p><strong>Cliente Desde:</strong> {formatDateBR(client.registrationDate)}</p>
                        {client.notes && <p className="md:col-span-2"><strong>Observações:</strong> {client.notes}</p>}
                    </div>
                </Card>

                <Card title="Histórico de Encomendas">
                    <div className="mb-4">
                        <label className="flex items-center space-x-2">
                            <input 
                                type="checkbox" 
                                checked={filterBluFacilita} 
                                onChange={(e) => setFilterBluFacilita(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Mostrar apenas encomendas via BluFacilita</span>
                        </label>
                    </div>
                    {ordersLoading ? <Spinner /> : (
                        <ResponsiveTable
                            columns={orderColumns}
                            data={filteredClientOrders}
                            rowKeyAccessor="id"
                            emptyStateMessage="Nenhuma encomenda encontrada para este cliente."
                        />
                    )}
                </Card>
                <div className="flex justify-end pt-4">
                    <Button onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </Modal>
    );
};


export const ClientsPage: React.FC<{}> = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
        const clientsData = await getClients();
        console.log('[DEBUG] Dados brutos recebidos da API:', clientsData);
        setClients(clientsData);
    } catch (error) {
        console.error("Falha ao buscar clientes:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSaveClient = async (client: Client) => {
    if (editingClient) {
      await saveClient(client);
    } else {
      const { id, ...data } = client;
      await saveClient(data as Omit<Client, 'id'>);
    }
    await fetchClients();
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleOpenForm = (client?: Client) => {
    setEditingClient(client || null);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      await deleteClient(clientId);
      await fetchClients();
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const term = searchTerm.toLowerCase();
      return (client.fullName || '').toLowerCase().includes(term) ||
             (client.cpfOrCnpj || '').includes(term) || 
             (client.email || '').toLowerCase().includes(term);
    });
  }, [clients, searchTerm]);
  
  const clientTableColumns = [
    { header: 'Nome Completo', accessor: 'fullName' as keyof Client, className: 'font-medium' },
    { header: 'CPF/CNPJ', accessor: (item: Client): ReactNode => formatCPFOrCNPJ(item.cpfOrCnpj, item.clientType) },
    { header: 'Email', accessor: 'email' as keyof Client },
    { header: 'Telefone', accessor: 'phone' as keyof Client },
    { header: 'Cidade/UF', accessor: (item: Client): ReactNode => `${item.city || 'N/A'} / ${item.state || 'N/A'}`},
    { header: 'Tipo', accessor: 'clientType' as keyof Client },
    { header: 'Ações', accessor: (item: Client): ReactNode => (
      <div className="space-x-1">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewingClient(item);}} title="Ver Detalhes">
            <i className="heroicons-outline-eye h-4 w-4"></i>
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenForm(item);}} title="Editar">
            <i className="heroicons-outline-pencil-square h-4 w-4"></i>
        </Button>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={async (e) => { e.stopPropagation(); await handleDeleteClient(item.id);}} title="Excluir">
            <i className="heroicons-outline-trash h-4 w-4"></i>
        </Button>
      </div>
    )},
  ];

  const handleExportClients = () => {
    const dataToExport = filteredClients.map(c => ({
        ID: c.id,
        NomeCompleto: c.fullName,
        CPF_CNPJ: formatCPFOrCNPJ(c.cpfOrCnpj, c.clientType),
        TipoCliente: c.clientType,
        Email: c.email,
        Telefone: c.phone,
        Endereco: c.address,
        CEP: c.cep,
        Cidade: c.city,
        Estado: c.state,
        DataCadastro: formatDateBR(c.registrationDate),
        Observacoes: c.notes,
    }));
    exportToCSV(dataToExport, `clientes_blu_imports_${new Date().toISOString().split('T')[0]}.csv`);
  };

  console.log('[DEBUG] Renderizando ClientsPage. isLoading:', isLoading, '| Nº de clientes no estado:', clients.length, '| Nº de clientes filtrados:', filteredClients.length);

  return (
    <div>
      <PageTitle 
        title="Gerenciamento de Clientes" 
        subtitle="Cadastre e administre os clientes da Blu Imports."
        actions={
            <div className="flex space-x-2">
                 <Button onClick={handleExportClients} variant="secondary" leftIcon={<i className="heroicons-outline-arrow-down-tray h-5 w-5"></i>}>
                    Exportar CSV
                </Button>
                <Button onClick={() => handleOpenForm()} leftIcon={<i className="heroicons-outline-plus-circle h-5 w-5"></i>}>
                    Novo Cliente
                </Button>
            </div>
        }
      />

      <Card className="mb-6">
        <Input 
          id="searchClients" 
          placeholder="Buscar por nome, CPF/CNPJ ou email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          inputClassName="h-10"
        />
      </Card>

      <ResponsiveTable
        columns={clientTableColumns}
        data={filteredClients}
        isLoading={isLoading}
        emptyStateMessage="Nenhum cliente encontrado. Adicione um novo ou ajuste sua busca."
        onRowClick={(client) => setViewingClient(client)}
        rowKeyAccessor="id"
      />

      {isFormOpen && (
        <ClientForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingClient(null); }}
          onSave={handleSaveClient}
          initialClient={editingClient}
        />
      )}

      {viewingClient && (
          <ClientDetailsModal 
            client={viewingClient}
            isOpen={!!viewingClient}
            onClose={() => setViewingClient(null)}
            onEdit={(clientToEdit) => {
                setViewingClient(null); 
                handleOpenForm(clientToEdit); 
            }}
          />
      )}
    </div>
  );
};
