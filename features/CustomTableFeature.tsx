import React, { useState, useEffect } from 'react';
import { CustomTableRow } from '../types';
import {
  getCustomTableRows,
  addCustomTableRow,
  updateCustomTableRow,
  deleteCustomTableRow,
} from '../services/AppService';
import {
  PageTitle,
  Card,
  Button,
  Input,
  ResponsiveTable,
} from '../components/SharedComponents';

const emptyRow: Omit<CustomTableRow, 'id'> = {
  Data: '',
  Descrição: '',
  Categoria: '',
  Moeda: '',
  Valor: '',
  Câmbio: '',
  Valor_em_BRL: '',
  Metodo_de_Pagamento: '',
  Status_do_Pagamento: '',
  Fornecedor: '',
  Cliente: '',
  Nota_Fiscal: '',
  Data_de_Vencimento: '',
  Data_de_Pagamento: '',
  Juros_Multa: '',
  Descontos: '',
  Observacoes: '',
};

const fieldList: Array<{ label: string; key: keyof Omit<CustomTableRow, 'id'> }> = [
  { label: 'Data', key: 'Data' },
  { label: 'Descrição', key: 'Descrição' },
  { label: 'Categoria', key: 'Categoria' },
  { label: 'Moeda', key: 'Moeda' },
  { label: 'Valor', key: 'Valor' },
  { label: 'Câmbio', key: 'Câmbio' },
  { label: 'Valor em BRL', key: 'Valor_em_BRL' },
  { label: 'Método de Pagamento', key: 'Metodo_de_Pagamento' },
  { label: 'Status do Pagamento', key: 'Status_do_Pagamento' },
  { label: 'Fornecedor', key: 'Fornecedor' },
  { label: 'Cliente', key: 'Cliente' },
  { label: 'Nota Fiscal', key: 'Nota_Fiscal' },
  { label: 'Data de Vencimento', key: 'Data_de_Vencimento' },
  { label: 'Data de Pagamento', key: 'Data_de_Pagamento' },
  { label: 'Juros/Multa', key: 'Juros_Multa' },
  { label: 'Descontos', key: 'Descontos' },
  { label: 'Observações', key: 'Observacoes' },
];

export const CustomTablePage: React.FC = () => {
  const [rows, setRows] = useState<CustomTableRow[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<CustomTableRow | null>(null);
  const [formData, setFormData] = useState<Omit<CustomTableRow, 'id'>>(emptyRow);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      setRows(await getCustomTableRows());
    } catch (e) {
      console.error('Failed to fetch custom table', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNew = () => {
    setSelectedRecord(null);
    setFormData(emptyRow);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleRowClick = (row: CustomTableRow) => {
    setSelectedRecord(row);
    setFormData({ ...row });
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleChange = (
    key: keyof Omit<CustomTableRow, 'id'>,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let saved: CustomTableRow | null = null;
      if (isCreating) {
        saved = await addCustomTableRow(formData);
      } else if (isEditing && selectedRecord) {
        saved = await updateCustomTableRow({ ...formData, id: selectedRecord.id });
      }
      if (saved) {
        await fetchData();
        setSelectedRecord(saved);
        setIsCreating(false);
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Failed to save row', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      setIsCreating(false);
      setFormData(emptyRow);
    } else if (isEditing && selectedRecord) {
      setIsEditing(false);
      setFormData({ ...selectedRecord });
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    if (!window.confirm('Confirma a exclusão?')) return;
    try {
      await deleteCustomTableRow(selectedRecord.id);
      await fetchData();
      setSelectedRecord(null);
      setFormData(emptyRow);
      setIsEditing(false);
      setIsCreating(false);
    } catch (e) {
      console.error('Failed to delete row', e);
    }
  };

  const tableColumns = [
    { header: 'Data', accessor: 'Data' as keyof CustomTableRow },
    { header: 'Descrição', accessor: 'Descrição' as keyof CustomTableRow },
    { header: 'Valor em BRL', accessor: 'Valor_em_BRL' as keyof CustomTableRow },
    { header: 'Fornecedor', accessor: 'Fornecedor' as keyof CustomTableRow },
    { header: 'Status', accessor: 'Status_do_Pagamento' as keyof CustomTableRow },
  ];

  return (
    <div>
      <PageTitle title="Tabela Customizável" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="mb-4">
              <Button onClick={openNew}>Adicionar Novo Registro</Button>
            </div>
            <ResponsiveTable
              columns={tableColumns}
              data={rows}
              isLoading={isLoading}
              rowKeyAccessor="id"
              onRowClick={handleRowClick}
              emptyStateMessage="Nenhum registro."
            />
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card title="Detalhes" bodyClassName="p-4 space-y-4">
            {isCreating || isEditing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldList.map((f) => (
                    <Input
                      key={f.key as string}
                      id={`field-${f.key}`}
                      label={f.label}
                      value={(formData as any)[f.key] || ''}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                    />
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} isLoading={isSaving}>
                    Salvar
                  </Button>
                </div>
              </>
            ) : selectedRecord ? (
              <>
                <div className="space-y-2 text-sm">
                  {fieldList.map((f) => (
                    <div key={f.key} className="border-b pb-1">
                      <p className="font-medium">{f.label}</p>
                      <p className="break-words">
                        {(selectedRecord as any)[f.key] || '-'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button onClick={() => setIsEditing(true)}>Editar</Button>
                  <Button variant="danger" onClick={handleDelete}>
                    Excluir
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                Selecione um registro para ver os detalhes ou adicione um novo
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomTablePage;
