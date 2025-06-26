import React, { useState, useEffect } from "react";
import { Modal, Button, Spinner, Alert, Select as SharedSelect, Input as SharedInput, Textarea as SharedTextarea } from "../SharedComponents";
import { getOrders, addOrderCostItem, COST_TYPE_OPTIONS_SELECT, parseBRLCurrencyStringToNumber, formatNumberToBRLCurrencyInput, formatDateBR } from "../../services/AppService";
import { Order, OrderCostItem, CostType, OrderStatus } from "../../types";

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
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setIsSubmitting(true);
        try {
            const savedCostItem = await addOrderCostItem(costItemData);
            onSave(savedCostItem);
            onClose();
        } catch (err) {
            setError("Falha ao salvar custo: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSubmitting(false);
        }
    };
    const orderOptions: Array<{ value: string | number; label: string }> = [
        { value: '', label: 'Selecione uma Encomenda Ativa...' },
        ...allOrders.map(o => ({
            value: o.id,
            label: `${o.productName} ${o.model} (${o.customerName || 'Cliente não especificado'}) - Pedido: ${formatDateBR(o.orderDate)}`
        }))
    ];
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Novo Custo de Encomenda" size="lg">
            <div className="space-y-4">
                {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
                {isLoadingOrders ? (
                    <Spinner />
                ) : (
                    <SharedSelect
                        label="Encomenda Ativa"
                        id="costOrderId"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        options={orderOptions}
                        required
                    />
                )}
                <SharedSelect
                    label="Tipo de Custo"
                    id="costType"
                    value={type}
                    onChange={(e) => setType(e.target.value as CostType)}
                    options={COST_TYPE_OPTIONS_SELECT}
                    required
                />
                <SharedInput
                    label="Valor do Custo (R$)"
                    id="costAmount"
                    value={amountInput}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    required
                />
                <SharedTextarea
                    label={`Descrição do Custo${type === CostType.OUTROS_CUSTOS ? ' *' : ''}`}
                    id="costDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder={type !== CostType.OUTROS_CUSTOS ? 'Opcional' : 'Detalhe o custo'}
                    required={type === CostType.OUTROS_CUSTOS}
                    aria-required={type === CostType.OUTROS_CUSTOS}
                />
                <SharedInput
                    label="Data do Custo"
                    id="costDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} isLoading={isSubmitting}>
                        Salvar Custo
                    </Button>
                </div>
            </div>
        </Modal>
);
};
