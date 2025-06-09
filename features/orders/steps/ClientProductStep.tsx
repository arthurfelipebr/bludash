import React, { useEffect, useState } from 'react';
import { Input, Select, Card, Alert } from '../../../components/SharedComponents';
import { Client, ProductCondition } from '../../../types';
import { getClients, getClientById, PRODUCT_CONDITION_OPTIONS } from '../../../services/AppService';
import { OrderFormState, OrderFormAction } from '../../OrdersFeature';

const PRODUCT_OPTIONS = ['iPhone', 'MacBook', 'iMac'];
const CAPACITY_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (client: Partial<Client>) => void;
  results: Client[];
}

const Combobox: React.FC<ComboboxProps> = ({ value, onChange, onSelect, results }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Input id="clientSearch" value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        placeholder="Buscar cliente..." autoComplete="off" />
      {open && (
        <ul className="absolute z-10 bg-white border border-gray-300 shadow-md max-h-60 overflow-y-auto w-full">
          {results.length > 0 ? results.map(c => (
            <li key={c.id} className="p-2 cursor-pointer hover:bg-gray-100" onMouseDown={() => { onSelect(c); setOpen(false); }}>
              {c.fullName} {c.cpfOrCnpj && `(${c.cpfOrCnpj})`}
            </li>
          )) : value && (
            <li className="p-2 cursor-pointer hover:bg-gray-100" onMouseDown={() => { onSelect({ fullName: value }); setOpen(false); }}>
              Adicionar novo cliente: '{value}'
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

interface Props {
  state: OrderFormState;
  dispatch: React.Dispatch<OrderFormAction>;
}

export const ClientProductStep: React.FC<Props> = ({ state, dispatch }) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => { setQuery(state.customerNameManual); }, [state.customerNameManual]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try { setOptions(await getClients(query)); } catch { setOptions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (state.clientId) {
      getClientById(state.clientId).then(c => setSelectedClient(c || null));
    } else {
      setSelectedClient(null);
    }
  }, [state.clientId]);

  const handleSelect = (client: Partial<Client>) => {
    dispatch({ type: 'SET_CLIENT', client });
  };

  return (
    <Card title="Detalhes do Cliente e Produto" className="h-full">
      <Combobox value={query} onChange={setQuery} onSelect={handleSelect} results={options} />
      {selectedClient?.isDefaulter && (
        <Alert type="warning" message={`Atenção: Cliente ${selectedClient.fullName} está marcado como inadimplente.`}
               details={selectedClient.defaulterNotes} className="mt-2" />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Select label="Produto" id="productName" name="productName" value={state.productName}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'productName', value: e.target.value })}
                options={PRODUCT_OPTIONS.map(p => ({ value: p, label: p }))} />
        <Input label="Modelo (ex: 15 Pro Max)" id="model" name="model" value={state.model}
               onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'model', value: e.target.value })} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Select label="Armazenamento" id="capacity" name="capacity" value={state.capacity}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'capacity', value: e.target.value })}
                options={CAPACITY_OPTIONS.map(c => ({ value: c, label: c }))} />
        <Input label="Cor" id="color" name="color" value={state.color}
               onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'color', value: e.target.value })} />
        <Select label="Condição" id="condition" name="condition" value={state.condition}
                onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'condition', value: e.target.value as ProductCondition })}
                options={PRODUCT_CONDITION_OPTIONS.map((c: ProductCondition) => ({ value: c, label: c }))} />
      </div>
    </Card>
  );
};

export default ClientProductStep;
