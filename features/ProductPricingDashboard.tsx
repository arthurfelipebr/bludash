import React, { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon } from 'lucide-react';
import { PageTitle, Card, Button, Input, Select, Modal, Tabs, Tab, Toast } from '../components/SharedComponents';
import { v4 as uuidv4 } from 'uuid';
import { PricingProduct } from '../types';
import { getPricingProducts, savePricingProduct, deletePricingProduct } from '../services/AppService';

interface Category {
  id: string;
  name: string;
  dustBag: number;
  packaging: number;
}

interface GlobalDefaults {
  nfPercent: number;
  nfProduto: number;
  frete: number;
}

type Product = PricingProduct;

const CATEGORY_KEY = 'productCategories';
const GLOBAL_KEY = 'productGlobals';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'AirPods', name: 'AirPods', dustBag: 24, packaging: 26 },
@@ -100,50 +101,51 @@ export const ProductPricingDashboardPage: React.FC = () => {
    categoryId: DEFAULT_CATEGORIES[0].id,
    disp: 'Brasil',
    dustBag: DEFAULT_CATEGORIES[0].dustBag,
    packaging: DEFAULT_CATEGORIES[0].packaging,
    custoBRL: 0,
    custoUSD: 0,
    cambio: 0,
    custoOperacional: 0,
    nfPercent: globals.nfPercent,
    nfProduto: globals.nfProduto,
    frete: globals.frete,
    valorTabela: 0,
    lucroPercent: 0,
    caixa: '',
  });
  // initialize valorTabela based on defaults
  useEffect(() => {
    setProductForm(prev => {
      const custoOperacional = computeCustoOperacional(prev);
      return { ...prev, custoOperacional, valorTabela: computeValorTabela({ ...prev, custoOperacional }) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveGlobals(globals);
  }, [globals]);

  useEffect(() => {
    getPricingProducts()
      .then(setProducts)
      .catch(err => console.error('Failed to load products', err));
  }, []);

  const openNewCategory = () => {
    setEditingCategory({ id: '', name: '', dustBag: 0, packaging: 0 });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory({ ...cat });
    setCategoryModalOpen(true);
  };

@@ -231,50 +233,56 @@ export const ProductPricingDashboardPage: React.FC = () => {
    try {
      await savePricingProduct(toSave);
      const items = await getPricingProducts();
      setProducts(items);
      setToastMessage(editingId ? 'Produto Atualizado' : 'Produto Salvo');
    } catch (err) {
      console.error('Erro ao salvar produto', err);
      setToastMessage('Erro ao salvar produto');
    }
    resetForm();
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Confirma a exclusão?')) return;
    try {
      await deletePricingProduct(id);
      const items = await getPricingProducts();
      setProducts(items);
      setToastMessage('Produto Excluído');
    } catch (err) {
      console.error('Erro ao excluir produto', err);
      setToastMessage('Erro ao excluir produto');
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const calcValues = (p: Product) => {
    const custoOperacional = computeCustoOperacional(p);
    const custoConvertido = p.disp === 'Brasil' ? (p.custoBRL || 0) : (p.custoUSD || 0) * p.cambio;
    const custoTotalProd = custoConvertido + custoOperacional;
    const valorTabela = p.valorTabela || computeValorTabela({ ...p, custoOperacional });
    const valorVenda = valorTabela * (1 - p.nfPercent);
    const lucroFinal = valorVenda - custoTotalProd;
    return { valorVenda, custoConvertido, custoTotalProd, lucroFinal, parcelado: valorTabela / 12, custoTotal: custoOperacional, valorTabela, custoOperacional };
  };


  const CategoryModal = () => {
    const [form, setForm] = useState<Category>(editingCategory || { id: '', name: '', dustBag: 0, packaging: 0 });

    useEffect(() => {
      if (editingCategory) setForm(editingCategory);
    }, [editingCategory]);

    if (!editingCategory) return null;

    return (
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}
@@ -393,78 +401,95 @@ export const ProductPricingDashboardPage: React.FC = () => {
            <Input id="lucroPercent" label="% Lucro" type="number" value={productForm.lucroPercent} onChange={e => handleProductField('lucroPercent', e.target.value)} />
            <Input id="valorTabela" label="Valor de Tabela" type="number" value={productForm.valorTabela.toFixed(2)} disabled />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
          <Button onClick={saveProduct}>{editingId ? 'Atualizar Produto' : 'Salvar Novo Produto'}</Button>
        </div>
      </Card>

      <Card title="Produtos" bodyClassName="p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1" />
                <th className="px-2 py-1 text-left">Produto</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Valor de Tabela</th>
                <th className="px-2 py-1 text-right">Lucro Final</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const catProducts = products.filter(p => p.categoryId === cat.id);
                const catOpen = expandedCategories.includes(cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    <tr className="bg-gray-100">
                      <td className="px-2 py-1 text-center">
                        <Button variant="ghost" size="sm" onClick={() => toggleCategory(cat.id)}>
                          {catOpen ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td className="px-2 py-1 font-semibold" colSpan={5}>{cat.name}</td>
                    </tr>
                    {catOpen &&
                      catProducts.map(p => {
                        const values = calcValues(p);
                        const isOpen = expandedId === p.id;
                        return (
                          <React.Fragment key={p.id}>
                            <tr>
                              <td className="px-2 py-1 text-center">
                                <Button variant="ghost" size="sm" onClick={() => setExpandedId(isOpen ? null : p.id)}>
                                  {isOpen ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                                </Button>
                              </td>
                              <td className="px-2 py-1">{p.name}</td>
                              <td className="px-2 py-1">{categories.find(c => c.id === p.categoryId)?.name}</td>
                              <td className="px-2 py-1 text-right">{values.valorTabela.toFixed(2)}</td>
                              <td className="px-2 py-1 text-right">{values.lucroFinal.toFixed(2)}</td>
                              <td className="px-2 py-1 text-right space-x-1">
                                <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Editar</Button>
                                <Button size="sm" variant="danger" onClick={() => deleteProduct(p.id)}>Excluir</Button>
                              </td>
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={6} className="bg-gray-50 p-3">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                    <span>Custo BRL: {(p.custoBRL ?? 0).toFixed(2)}</span>
                                    <span>Custo USD: {(p.custoUSD ?? 0).toFixed(2)}</span>
                                    <span>Câmbio: {p.cambio.toFixed(2)}</span>
                                    <span>Frete: {p.frete.toFixed(2)}</span>
                                    <span>Custo Operacional: {values.custoOperacional.toFixed(2)}</span>
                                    <span>NF Produto: {p.nfProduto.toFixed(2)}</span>
                                    <span>NFs (%): {p.nfPercent.toFixed(2)}</span>
                                    <span>DustBag: {p.dustBag.toFixed(2)}</span>
                                    <span>Embalagem: {p.packaging.toFixed(2)}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <CategoryModal />
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default ProductPricingDashboardPage;
