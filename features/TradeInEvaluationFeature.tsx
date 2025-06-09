import React, { useState } from 'react';
import { PageTitle, Card, Input, Button } from '../components/SharedComponents';

interface EvaluationFormState {
  model: string;
  capacity: string;
  tableValue: number;
  batteryHealth: number;
  screenScratched: boolean;
  backGlassCracked: boolean;
  faceIdWorks: boolean;
  buttonsWorking: boolean;
}

const initialState: EvaluationFormState = {
  model: '',
  capacity: '',
  tableValue: 0,
  batteryHealth: 100,
  screenScratched: false,
  backGlassCracked: false,
  faceIdWorks: true,
  buttonsWorking: true,
};

export const TradeInEvaluationPage: React.FC<{}> = () => {
  const [form, setForm] = useState<EvaluationFormState>(initialState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = () => {
    console.log('Form submitted', form);
  };

  return (
    <div className="tradein-evaluation-page space-y-6">
      <PageTitle title="Avaliação de Trade-In" />

      <Card title="Informações do Aparelho">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="model"
            name="model"
            label="Modelo do iPhone"
            type="text"
            value={form.model}
            onChange={handleChange}
          />
          <Input
            id="capacity"
            name="capacity"
            label="Capacidade"
            type="text"
            value={form.capacity}
            onChange={handleChange}
          />
          <Input
            id="tableValue"
            name="tableValue"
            label="Valor de Tabela (R$)"
            type="number"
            value={form.tableValue}
            onChange={handleChange}
          />
          <Input
            id="batteryHealth"
            name="batteryHealth"
            label="Saúde da Bateria (%)"
            type="number"
            value={form.batteryHealth}
            onChange={handleChange}
          />
        </div>
      </Card>

      <Card title="Checklist Cosmético e Funcional">
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              id="screenScratched"
              name="screenScratched"
              type="checkbox"
              checked={form.screenScratched}
              onChange={handleChange}
            />
            <span>Tela Risca?</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              id="backGlassCracked"
              name="backGlassCracked"
              type="checkbox"
              checked={form.backGlassCracked}
              onChange={handleChange}
            />
            <span>Traseira Quebrada?</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              id="faceIdWorks"
              name="faceIdWorks"
              type="checkbox"
              checked={form.faceIdWorks}
              onChange={handleChange}
            />
            <span>Face ID Funcionando?</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              id="buttonsWorking"
              name="buttonsWorking"
              type="checkbox"
              checked={form.buttonsWorking}
              onChange={handleChange}
            />
            <span>Botões Funcionando?</span>
          </label>
        </div>
      </Card>

      <div className="text-right">
        <Button onClick={handleSubmit}>Salvar Avaliação</Button>
      </div>
    </div>
  );
};

