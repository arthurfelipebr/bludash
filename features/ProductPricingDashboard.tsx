import React, { useEffect, useState } from 'react';
import { PageTitle, Card } from '../components/SharedComponents';
import { PricingListItem } from '../types';
import { getPricingProducts } from '../services/AppService';

const ProductPricingDashboardPage: React.FC = () => {
  const [items, setItems] = useState<PricingListItem[]>([]);

  useEffect(() => {
    getPricingProducts()
      .then(setItems)
      .catch(err => console.error('Failed to load products', err));
  }, []);

  return (
    <div className="space-y-4">
      <PageTitle title="Precificação de Produtos" />
      <Card title="Produtos" bodyClassName="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Produto</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Custo BRL</th>
                <th className="px-2 py-1 text-right">Valor de Tabela</th>
                <th className="px-2 py-1 text-right">Atualizado Em</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.productId}>
                  <td className="px-2 py-1">{it.productName}</td>
                  <td className="px-2 py-1">{it.categoryName}</td>
                  <td className="px-2 py-1 text-right">{it.custoBRL?.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{it.valorTabela?.toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">
                    {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString('pt-BR') : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ProductPricingDashboardPage;
