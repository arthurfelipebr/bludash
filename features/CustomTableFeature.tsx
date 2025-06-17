import React, { useState, useEffect } from 'react';
import { CustomTableRow } from '../types';
import { getCustomTableRows, addCustomTableRow, updateCustomTableRow, deleteCustomTableRow } from '../services/AppService';
import { PageTitle, Card, Button, Input, Modal } from '../components/SharedComponents';

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
  Observacoes: ''
};

const fieldList: Array<{ label: string; key: keyof Omit<CustomTableRow,'id'> }> = [
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
  { label: 'Observações', key: 'Observacoes' }
];

export const CustomTablePage: React.FC = () => {
  const [rows, setRows] = useState<CustomTableRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CustomTableRow | null>(null);
  const [formData, setFormData] = useState<Omit<CustomTableRow,'id'>>(emptyRow);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      setRows(await getCustomTableRows());
    } catch (e) {
      console.error('Failed to fetch custom table', e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditingRow(null); setFormData(emptyRow); setIsModalOpen(true); };
  const openEdit = (row: CustomTableRow) => { setEditingRow(row); setFormData({ ...row }); setIsModalOpen(true); };

  const handleChange = (key: keyof Omit<CustomTableRow,'id'>, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingRow) {
        await updateCustomTableRow({ ...formData, id: editingRow.id });
      } else {
        await addCustomTableRow(formData);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (e) {
      console.error('Failed to save row', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma a exclusão?')) return;
    await deleteCustomTableRow(id);
    fetchData();
  };

  return (
    <div>
      <PageTitle title="Tabela Customizável" />
      <Card className="mb-4">
        <Button onClick={openNew}>Adicionar Novo Registro</Button>
      </Card>
      <Card>
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr>
              {fieldList.map(f => (
                <th key={f.key as string} className="px-2 py-1 text-left font-medium">{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                {fieldList.map(f => (
                  <td key={f.key as string} className="px-2 py-1">{(r as any)[f.key]}</td>
                ))}
                <td className="px-2 py-1 whitespace-nowrap">
                  <Button size="sm" onClick={() => openEdit(r)}>Editar</Button>
                  <Button size="sm" variant="danger" className="ml-2" onClick={() => handleDelete(r.id)}>Excluir</Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={fieldList.length + 1} className="text-center py-4 text-gray-500">Nenhum registro.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRow ? 'Editar Registro' : 'Novo Registro'}
        size="3xl"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fieldList.map(f => (
            <Input
              key={f.key as string}
              id={`field-${f.key}`}
              label={f.label}
              value={(formData as any)[f.key] || ''}
              onChange={e => handleChange(f.key, e.target.value)}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default CustomTablePage;
