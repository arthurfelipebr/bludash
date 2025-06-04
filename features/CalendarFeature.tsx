import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { Order, OrderStatus, CalendarEvent, Client } from '../types'; // Added Client
import { getOrders, formatDateBR, ORDER_STATUS_OPTIONS, getClients } from '../services/AppService'; // Added getClients
import { PageTitle, Card, Select, ResponsiveTable, Modal, Button, Spinner } from '../components/SharedComponents';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

const EventItem: React.FC<{ event: CalendarEvent; onClick: () => void }> = ({ event, onClick }) => (
    <div 
        className="bg-blue-100 text-blue-700 p-1 rounded text-xs truncate cursor-pointer hover:bg-blue-200" 
        title={`${event.resource?.productName} ${event.resource?.model} - ${event.resource?.customerName}`}
        onClick={onClick}
    >
      {event.title}
    </div>
);

export const CalendarPage: React.FC<{}> = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // Added clients state
  const [isLoading, setIsLoading] = useState(true);
  const [customerFilter, setCustomerFilter] = useState(''); // Filter by client ID
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);


  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            setOrders(await getOrders());
            setClients(await getClients()); // Fetch clients
        } catch (e) {
            console.error("Error fetching calendar data:", e);
        }
        setIsLoading(false);
    };
    fetchData();
  }, []);

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Cliente Desconhecido';
    const client = clients.find(c => c.id === clientId);
    return client?.fullName || 'Cliente Desconhecido';
  };


  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Ensure customerName for filtering is derived correctly if clientId is present
      const orderCustomerName = order.clientId ? getClientName(order.clientId) : order.customerName;
      const matchesCustomer = customerFilter ? (order.clientId === customerFilter) : true; // Filter by ID
      const matchesStatus = statusFilter ? order.status === statusFilter : true;
      return matchesCustomer && matchesStatus && order.estimatedDeliveryDate;
    });
  }, [orders, clients, customerFilter, statusFilter]); // Added clients dependency
  
  const calendarEvents = useMemo((): CalendarEvent[] => {
    return filteredOrders
      .filter(order => order.estimatedDeliveryDate) 
      .map(order => {
        // Ensure estimatedDeliveryDate is treated as local date then converted to UTC for consistency if needed
        // For calendar display, direct Date object from YYYY-MM-DD is fine as it assumes local time
        const startDate = new Date(order.estimatedDeliveryDate + "T00:00:00"); // Append time to make it local if just YYYY-MM-DD
        const clientName = order.clientId ? getClientName(order.clientId) : order.customerName;
        return {
            id: order.id,
            title: `${order.productName.substring(0,12)}... (${clientName.substring(0,8)}...)`,
            start: startDate,
            end: startDate,  
            allDay: true,
            resource: order,
        };
    });
  }, [filteredOrders, clients]); // Added clients dependency


  const monthGrid: CalendarDay[][] = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay()); 

    const grid: CalendarDay[][] = [];
    
    for (let weekNum = 0; weekNum < 6; weekNum++) { 
        const currentWeek: CalendarDay[] = [];
        for (let dayNum = 0; dayNum < 7; dayNum++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + (weekNum * 7) + dayNum);

            const dayEvents = calendarEvents.filter(event => {
                const eventStart = new Date(event.start);
                return eventStart.getFullYear() === dayDate.getFullYear() &&
                       eventStart.getMonth() === dayDate.getMonth() &&
                       eventStart.getDate() === dayDate.getDate();
            });
            currentWeek.push({
                date: dayDate,
                isCurrentMonth: dayDate.getMonth() === month,
                events: dayEvents,
            });
        }
        grid.push(currentWeek);
    }
    return grid;
  }, [currentDate, calendarEvents]);

  const uniqueClientOptions = useMemo(() => {
    return clients.map(c => ({ value: c.id, label: c.fullName }));
  }, [clients]);

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + amount, 1); 
      return newDate;
    });
  };


  return (
    <div>
      <PageTitle title="Calendário de Entregas" subtitle="Visualize os prazos e entregas previstas." />
      
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1 flex items-center justify-center md:justify-start space-x-2">
            <Button onClick={() => changeMonth(-1)} variant="ghost"><i className="heroicons-outline-chevron-left h-5 w-5"></i></Button>
            <h2 className="text-xl font-semibold text-center whitespace-nowrap">
              {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toLocaleUpperCase()}
            </h2>
            <Button onClick={() => changeMonth(1)} variant="ghost"><i className="heroicons-outline-chevron-right h-5 w-5"></i></Button>
          </div>
          <Select
            id="customerFilter"
            label="Filtrar por Cliente"
            options={[{ value: '', label: 'Todos os Clientes' }, ...uniqueClientOptions]}
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            selectClassName="h-10"
          />
          <Select
            id="statusFilter"
            label="Filtrar por Status da Encomenda"
            options={[{value: '', label: 'Todos os Status'}, ...ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            selectClassName="h-10"
          />
        </div>
      </Card>

      {isLoading ? <div className="flex justify-center items-center p-10"><Spinner size="lg" /> <p className="ml-2">Carregando calendário...</p></div> : (
        <div className="bg-white shadow-lg rounded-lg p-4">
          <div className="grid grid-cols-7 gap-px border-l border-t border-gray-200">
            {daysOfWeek.map(day => (
              <div key={day} className="py-2 text-center font-medium text-sm text-gray-600 bg-gray-50 border-r border-b border-gray-200">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr gap-px border-l border-gray-200"> 
            {monthGrid.flat().map((day, index) => (
              <div
                key={index}
                className={`p-2 h-32 border-r border-b border-gray-200 flex flex-col relative ${
                  day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                } ${new Date().toDateString() === day.date.toDateString() ? '!bg-blue-50 border-blue-200' : ''} ${day.events.length > 0 ? 'cursor-pointer' : ''}`}
                onClick={() => day.events.length > 0 && setSelectedDayEvents(day.events)}
              >
                <p className={`text-sm font-medium ${day.isCurrentMonth ? (new Date().toDateString() === day.date.toDateString() ? 'text-blue-700' : 'text-gray-700') : 'text-gray-400'}`}>{day.date.getDate()}</p>
                <div className="space-y-1 mt-1 overflow-y-auto flex-grow"> 
                  {day.events.slice(0, 2).map(event => <EventItem key={event.id} event={event} onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); setSelectedDayEvents(day.events);}} />)}
                  {day.events.length > 2 && <p className="text-xs text-gray-500 mt-1 hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedDayEvents(day.events);}}>+{day.events.length - 2} mais</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDayEvents && selectedDayEvents.length > 0 && (
        <Modal 
            isOpen={!!selectedDayEvents} 
            onClose={() => setSelectedDayEvents(null)} 
            title={`Encomendas para ${formatDateBR(selectedDayEvents[0].start.toISOString())}`}
            size="lg"
        >
            <ResponsiveTable
                columns={[
                    { header: "Produto", accessor: (item: CalendarEvent): ReactNode => item.resource?.productName + ' ' + item.resource?.model },
                    { header: "Cliente", accessor: (item: CalendarEvent): ReactNode => getClientName(item.resource?.clientId) || item.resource?.customerName },
                    { header: "Status", accessor: (item: CalendarEvent): ReactNode => item.resource?.status }
                ]}
                data={selectedDayEvents}
                rowKeyAccessor="id"
                emptyStateMessage="Nenhuma encomenda para este dia com os filtros atuais."
            />
             <div className="mt-4 flex justify-end">
                <Button onClick={() => setSelectedDayEvents(null)}>Fechar</Button>
            </div>
        </Modal>
      )}
    </div>
  );
};