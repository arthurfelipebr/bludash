import React, { useEffect, useState } from 'react';
import { Input, Select, Card, Alert } from '../../../components/SharedComponents';
import { Client, ProductCondition } from '../../../types';
import { getClients, getClientById, PRODUCT_CONDITION_OPTIONS } from '../../../services/AppService';
import { OrderFormState, OrderFormAction } from '../../OrdersFeature';

const PRODUCT_OPTIONS = ['iPhone', 'MacBook', 'iPad', 'Apple Watch', 'Mac Mini'];
const PRODUCT_MODELS: { [key: string]: string[] } = {
  'iPhone': ['15 Pro Max', '15 Pro', '15 Plus', '15', '14 Pro Max', '14 Pro', '14 Plus', '14', 'SE (3ª ger)', '13 Pro Max', '13 Pro', '13', '13 Mini', '12 Pro Max', '12 Pro', '12', '12 Mini', 'SE (2ª ger)'],
  'MacBook': ['Air 15" (M3)', 'Air 13" (M3)', 'Pro 14" (M3)', 'Pro 14" (M3 Pro/Max)', 'Pro 16" (M3 Pro/Max)', 'Air 15" (M2)', 'Pro 13" (M2)', 'Air (M2)', 'Pro 14" (M2 Pro/Max)', 'Pro 16" (M2 Pro/Max)', 'Air (M1)', 'Pro 13" (M1)'],
  'iPad': ['Pro 13" (M4)', 'Pro 11" (M4)', 'Air 13" (M2)', 'Air 11" (M2)', 'iPad (10ª ger)', 'Pro 12.9" (M2)', 'Pro 11" (M2)', 'Air (M1 - 5ª ger)', 'Mini (6ª ger)', 'iPad (9ª ger)', 'Pro 12.9" (M1)', 'Pro 11" (M1)'],
  'Apple Watch': ['Series 9', 'Ultra 2', 'SE (2ª ger)', 'Series 8', 'Ultra', 'Series 7', 'SE (1ª ger)', 'Series 6'],
  'Mac Mini': ['Mac Mini (M2)', 'Mac Mini (M2 Pro)', 'Mac Mini (M1)'],
};
const CAPACITY_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];
const WATCH_SIZE_OPTIONS = ['44mm', '40mm', '46mm', '42mm'];

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (client: Partial<Client>) => void;
  onAddNew?: (name: string) => void;
  results: Client[];
}

const Combobox: React.FC<ComboboxProps> = ({ value, onChange, onSelect, onAddNew, results }) => {
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
            <li className="p-2 cursor-pointer hover:bg-gray-100" onMouseDown={() => { onSelect({ fullName: value }); onAddNew && onAddNew(value); setOpen(false); }}>
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
  onAddNewClient?: (name: string) => void;
}

export const ClientProductStep: React.FC<Props> = ({ state, dispatch, onAddNewClient }) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    if (selectedClient) {
      setQuery(selectedClient.fullName);
    } else {
      setQuery(state.customerNameManual);
    }
  }, [state.customerNameManual, selectedClient]);

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

  useEffect(() => {
    if (state.productName !== 'Apple Watch') {
      dispatch({ type: 'UPDATE_FIELD', field: 'watchSize', value: '' });
    }
  }, [state.productName]);

  useEffect(() => {
    if (state.productName === 'Apple Watch' && state.model.includes('Ultra')) {
      dispatch({ type: 'UPDATE_FIELD', field: 'watchSize', value: '49mm' });
    }
  }, [state.model, state.productName]);

  const handleSelect = (client: Partial<Client>) => {
    dispatch({ type: 'SET_CLIENT', client });
    if (client.fullName) {
      setQuery(client.fullName);
    }
  };

  return (
    <Card title="Detalhes do Cliente e Produto" className="h-full">
      <h4 className="font-semibold text-gray-700 mb-2 mt-4 first:mt-0">Dados do Cliente</h4>
      <Combobox value={query} onChange={setQuery} onSelect={handleSelect} onAddNew={onAddNewClient} results={options} />
      {selectedClient?.isDefaulter && (
        <Alert type="warning" message={`Atenção: Cliente ${selectedClient.fullName} está marcado como inadimplente.`}
               details={selectedClient.defaulterNotes} className="mt-2" />
      )}
      <h4 className="font-semibold text-gray-700 mb-2 mt-4 first:mt-0">Detalhes do Produto</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Select
          label="Produto"
          id="productName"
          name="productName"
          value={state.productName}
          onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'productName', value: e.target.value })}
          options={PRODUCT_OPTIONS.map(p => ({ value: p, label: p }))}
        />
        <Select
          label="Modelo"
          id="model"
          name="model"
          value={state.model}
          onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'model', value: e.target.value })}
          disabled={!state.productName}
          options={
            state.productName
              ? PRODUCT_MODELS[state.productName].map(m => ({ value: m, label: m }))
              : [{ value: '', label: 'Selecione um produto...' }]
          }
        />
        <Select
          label="Armazenamento"
          id="capacity"
          name="capacity"
          value={state.capacity}
          onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'capacity', value: e.target.value })}
          options={CAPACITY_OPTIONS.map(c => ({ value: c, label: c }))}
        />
        {state.productName === 'Apple Watch' && (
          <Select
            label="Tamanho (mm)"
            id="watchSize"
            name="watchSize"
            value={state.watchSize}
            onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'watchSize', value: e.target.value })}
            options={WATCH_SIZE_OPTIONS.map(s => ({ value: s, label: s }))}
            disabled={state.model.includes('Ultra')}
          />
        )}
        <Input
          label="Cor"
          id="color"
          name="color"
          value={state.color}
          onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'color', value: e.target.value })}
        />
        <Select
          label="Condição"
          id="condition"
          name="condition"
          value={state.condition}
          onChange={(e) => dispatch({ type: 'UPDATE_FIELD', field: 'condition', value: e.target.value as ProductCondition })}
          options={PRODUCT_CONDITION_OPTIONS.map((c: ProductCondition) => ({ value: c, label: c }))}
        />
      </div>
    </Card>
  );
};

export default ClientProductStep;
