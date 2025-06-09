import React from 'react';
import { Card, Textarea, Button } from '../../../components/SharedComponents';
import { Paperclip, FileText, ClipboardList, Plus } from 'lucide-react';
import { DocumentFile, InternalNote } from '../../../types';
import { formatDateBR } from '../../../services/AppService';
import { OrderFormState } from '../../OrdersFeature';

interface NotesDocsProps {
  state: OrderFormState;
  documents: DocumentFile[];
  internalNotes: InternalNote[];
  currentInternalNote: string;
  setCurrentInternalNote: (val: string) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleAddInternalNote: () => void;
  handleRemoveInternalNote: (id: string) => void;
  handleAddDocument: () => void;
  handleRemoveDocument: (id: string) => void;
  generateNotaFiscalDescription: () => void;
  generateNotaFiscalProductInfo: () => void;
}

export const NotesDocsStep: React.FC<NotesDocsProps> = ({
  state,
  documents,
  internalNotes,
  currentInternalNote,
  setCurrentInternalNote,
  handleChange,
  handleAddInternalNote,
  handleRemoveInternalNote,
  handleAddDocument,
  handleRemoveDocument,
  generateNotaFiscalDescription,
  generateNotaFiscalProductInfo,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Notas e Documentos">
        <Textarea
          label="Observações Gerais da Encomenda"
          id="notes"
          name="notes"
          value={state.notes || ''}
          onChange={handleChange}
          rows={3}
        />
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Documentos Anexados</h4>
          {documents.length === 0 && <p className="text-xs text-gray-500">Nenhum documento.</p>}
          <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
            {documents.map(doc => (
              <li key={doc.id} className="text-sm text-gray-600 flex justify-between items-center">
                <span>
                  {doc.name} ({formatDateBR(doc.uploadedAt)})
                </span>
                <Button type="button" variant="link" size="sm" onClick={() => handleRemoveDocument(doc.id)} className="text-red-500">
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddDocument} className="mt-2">
            <Paperclip className="mr-1 h-4 w-4" />Adicionar Documento (mock)
          </Button>
        </div>
        <div className="mt-4">
          <Button type="button" variant="ghost" size="sm" onClick={generateNotaFiscalDescription} className="mt-2" leftIcon={<FileText className="h-4 w-4" />}>
            Gerar Descrição p/ Nota Fiscal
          </Button>
        </div>
        <div className="mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={generateNotaFiscalProductInfo} className="mt-2" leftIcon={<ClipboardList className="h-4 w-4" />}>
            Gerar Dados p/ NF Produto
          </Button>
        </div>
      </Card>
      <Card title="Comunicação e Histórico Interno">
        <Textarea
          label="Resumo do Histórico do WhatsApp (Opcional)"
          id="whatsAppHistorySummary"
          name="whatsAppHistorySummary"
          value={state.whatsAppHistorySummary || ''}
          onChange={handleChange}
          rows={3}
          placeholder="Ex: Cliente aceitou seminovo se bateria > 85%..."
        />
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Notas Internas (Não visível ao cliente)</h4>
          <div className="max-h-32 overflow-y-auto mb-2 border rounded-md p-2 bg-gray-50 space-y-1">
            {internalNotes.length === 0 && <p className="text-xs text-gray-500">Nenhuma nota interna.</p>}
            {internalNotes
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(note => (
                <div key={note.id} className="text-xs text-gray-600 bg-white p-1.5 rounded shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{formatDateBR(note.date, true)}</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => handleRemoveInternalNote(note.id)}
                      className="text-red-400 hover:text-red-600 p-0 leading-none"
                    >
                      X
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap">{note.note}</p>
                </div>
              ))}
          </div>
          <div className="flex items-center space-x-2">
            <Textarea
              id="currentInternalNote"
              value={currentInternalNote}
              onChange={e => setCurrentInternalNote(e.target.value)}
              rows={2}
              placeholder="Adicionar nova nota interna..."
              textareaClassName="text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddInternalNote}
              title="Adicionar Nota"
              className="self-end h-10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotesDocsStep;
