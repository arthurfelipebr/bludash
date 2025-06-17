import React, { useState, useEffect } from 'react';
import { PlusIcon, MinusIcon } from 'lucide-react';
import { PageTitle, Card, Button, Input, Select, Modal, Tabs, Tab, Toast } from '../components/SharedComponents';
import { PricingProduct, PricingCategory, PricingGlobals } from '../types';
import {
  getPricingProducts,
  savePricingProduct,
  deletePricingProduct,
  getProductCategories,
  saveProductCategory,
  deleteProductCategory,
  getPricingGlobals,
  savePricingGlobals,
} from '../services/AppService';

type Product = PricingProduct;

const DEFAULT_GLOBALS: PricingGlobals = { nfPercent: 0.02, nfProduto: 30, frete: 105 };

const computeCustoOperacional = (p: Omit<Product, 'id'>): number => {
  const importCosts =
    (p.freteDeclarado || 0) +
    (p.freteEuaBr || 0) +
    (p.freteRedirecionador || 0) +
    (p.impostoImportacao || 0);
  return p.dustBag + p.packaging + p.frete + p.nfProduto + importCosts;
};

const computeValorTabela = (p: Omit<Product, 'id'>): number => {
  const custoOperacional = computeCustoOperacional(p);
  const custoConvertido =
    p.disp === 'Brasil' ? (p.custoBRL || 0) : (p.custoUSD || 0) * p.cambio;
  const custoTotalProd = custoConvertido + custoOperacional;
  const valorBase = custoTotalProd * (1 + p.lucroPercent);
  const bruto = valorBase / (1 - p.nfPercent);
  const arredondado = Math.round((bruto - 70) / 100) * 100 + 70;
  return arredondado;
};

export const ProductPricingDashboardPage: React.FC = () => {
  const [categories, setCategories] = useState<PricingCategory[]>([]);
  const [globals, setGlobals] = useState<PricingGlobals>(DEFAULT_GLOBALS);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PricingCategory | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dispTab, setDispTab] = useState<'Brasil' | 'EUA'>('Brasil');
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [globalErrors, setGlobalErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({
    name: '',
    categoryId: '',
    disp: 'Brasil',
    dustBag: 0,
    packaging: 0,
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
    getProductCategories()
      .then(cats => setCategories(cats))
      .catch(err => console.error('Failed to load categories', err));
    getPricingGlobals()
      .then(g => setGlobals(g))
      .catch(err => console.error('Failed to load globals', err));
  }, []);

  useEffect(() => {
    savePricingGlobals(globals).catch(err => console.error('Failed to save globals', err));
  }, [globals]);

  useEffect(() => {
    getPricingProducts()
      .then(items => {
        setProducts(items);
        setCategories(prev => {
          let changed = false;
          const updated = [...prev];
          items.forEach(p => {
            if (!updated.some(c => c.id === p.categoryId)) {
              const newCat = { id: p.categoryId, name: p.categoryId, dustBag: 0, packaging: 0 };
              updated.push(newCat);
              saveProductCategory(newCat).catch(err => console.error('Failed to auto-save category', err));
              changed = true;
            }
          });
          return changed ? updated : prev;
        });
      })
      .catch(err => console.error('Failed to load products', err));
  }, []);

  const openNewCategory = () => {
    setEditingCategory({ id: '', name: '', dustBag: 0, packaging: 0 });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: PricingCategory) => {
    setEditingCategory({ ...cat });
    setCategoryModalOpen(true);
  };

  const saveCategory = async (cat: PricingCategory) => {
    try {
      const saved = await saveProductCategory(cat);
      setCategories(prev => {
        const exists = prev.some(c => c.id === saved.id);
        return exists ? prev.map(c => (c.id === saved.id ? saved : c)) : [...prev, saved];
      });
      setToastMessage(cat.id ? 'Categoria Atualizada' : 'Categoria Salva');
    } catch (err) {
      console.error('Erro ao salvar categoria', err);
      setToastMessage('Erro ao salvar categoria');
    }
    setCategoryModalOpen(false);
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteProductCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setToastMessage('Categoria Excluída');
    } catch (err) {
      console.error('Erro ao excluir categoria', err);
      setToastMessage('Erro ao excluir categoria');
    }
    setCategoryModalOpen(false);
  };

  const handleGlobalChange = (field: keyof PricingGlobals, value: string) => {
    if (value.trim() !== '' && isNaN(Number(value))) {
      setGlobalErrors(prev => ({ ...prev, [field]: 'Valor inválido' }));
      return;
    }
    setGlobalErrors(prev => { const { [field]: _, ...rest } = prev; return rest; });
    setGlobals(prev => ({ ...prev, [field]: Number(value) }));
  };

  const handleProductField = (field: keyof Omit<Product, 'id'>, value: string) => {
    const numericFields: Array<keyof Omit<Product, 'id'>> = [
      'dustBag','packaging','custoBRL','custoUSD','cambio','nfPercent','nfProduto','frete','valorTabela','lucroPercent','freteDeclarado','freteEuaBr','freteRedirecionador','impostoImportacao','precoDeclarado'
    ];
    if (numericFields.includes(field) && value.trim() !== '' && isNaN(Number(value))) {
      setProductErrors(prev => ({ ...prev, [field]: 'Valor inválido' }));
      return;
    }
    setProductErrors(prev => { const { [field]: _, ...rest } = prev; return rest; });
    setProductForm(prev => {
      const parsed = numericFields.includes(field) ? Number(value) : value;
      const updated: Omit<Product,'id'> = { ...prev, [field]: parsed } as Omit<Product,'id'>;
      if (field === 'categoryId') {
        const cat = categories.find(c => c.id === value);
        if (cat) {
          updated.dustBag = cat.dustBag;
          updated.packaging = cat.packaging;
        }
      }
      updated.custoOperacional = computeCustoOperacional(updated);
      updated.valorTabela = computeValorTabela(updated);
      return updated;
    });
  };

  const startEdit = (prod: Product) => {
    setEditingId(prod.id);
    const withoutId = { ...prod } as Omit<Product, 'id'>;
    withoutId.custoOperacional = computeCustoOperacional(withoutId);
    withoutId.valorTabela = computeValorTabela(withoutId);
    setProductForm(withoutId);
    setDispTab(prod.disp);
  };

  const resetForm = () => {
    setEditingId(null);
    const first = categories[0] || { id: '', dustBag: 0, packaging: 0 } as PricingCategory;
    const base: Omit<Product, 'id'> = {
      name: '',
      categoryId: first.id,
      disp: 'Brasil',
      dustBag: first.dustBag,
      packaging: first.packaging,
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
    };
    base.custoOperacional = computeCustoOperacional(base);
    base.valorTabela = computeValorTabela(base);
    setProductForm(base);
    setDispTab('Brasil');
  };

  const saveProduct = async () => {
    const custoOperacional = computeCustoOperacional(productForm);
    const valorTabela = computeValorTabela({ ...productForm, custoOperacional });
    const toSave: Product = { id: editingId ?? '', ...productForm, custoOperacional, valorTabela };
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
    const [form, setForm] = useState<PricingCategory>(editingCategory || { id: '', name: '', dustBag: 0, packaging: 0 });

    useEffect(() => {
      if (editingCategory) setForm(editingCategory);
    }, [editingCategory]);

    if (!editingCategory) return null;

    return (
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>Cancelar</Button>
            {editingCategory.id && (
              <Button variant="danger" onClick={() => deleteCategory(editingCategory.id)}>Excluir</Button>
            )}
            <Button onClick={() => saveCategory(form)}>Salvar</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Input id="cat-name" label="Nome" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
          <Input id="cat-dust" label="DustBag" type="number" value={form.dustBag} onChange={e => setForm(prev => ({ ...prev, dustBag: Number(e.target.value) }))} />
          <Input id="cat-pack" label="Custos Embalagem" type="number" value={form.packaging} onChange={e => setForm(prev => ({ ...prev, packaging: Number(e.target.value) }))} />
        </div>
      </Modal>
    );
  };

  const ConfirmDeleteModal = () => (
    <Modal
      isOpen={deleteId !== null}
      onClose={() => setDeleteId(null)}
      title="Confirmar Exclusão"
      footer={(
        <>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          {deleteId && <Button variant="danger" onClick={() => { deleteProduct(deleteId); setDeleteId(null); }}>Excluir</Button>}
        </>
      )}
    >
      <p className="text-gray-700">Tem certeza que deseja excluir este produto?</p>
    </Modal>
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Precificação de Produtos" />

      <Card title="Gestão de Categorias e Padrões" bodyClassName="space-y-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input id="global-nfs" label="NFs" type="number" step="0.01" rightAddon="%" value={globals.nfPercent} onChange={e => handleGlobalChange('nfPercent', e.target.value)} error={globalErrors.nfPercent} />
          <Input id="global-nfprod" label="NF Produto" type="number" leftAddon="R$" value={globals.nfProduto} onChange={e => handleGlobalChange('nfProduto', e.target.value)} error={globalErrors.nfProduto} />
          <Input id="global-frete" label="Frete" type="number" leftAddon="R$" value={globals.frete} onChange={e => handleGlobalChange('frete', e.target.value)} error={globalErrors.frete} />
          <div className="flex items-end">
            <Button onClick={openNewCategory}>Adicionar Nova Categoria</Button>
          </div>
        </div>
        <div className="mb-3">
          <Input id="search" label="Buscar Produto" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">DustBag</th>
                <th className="px-2 py-1 text-right">Custos Embalagem</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td className="px-2 py-1">{cat.name}</td>
                  <td className="px-2 py-1 text-right">{cat.dustBag}</td>
                  <td className="px-2 py-1 text-right">{cat.packaging}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEditCategory(cat)}>Editar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Cadastro / Edição de Produtos" bodyClassName="space-y-6 p-4">
        <div>
          <h3 className="text-lg font-semibold">Informações Principais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Input id="prod-name" label="Produto" value={productForm.name} onChange={e => handleProductField('name', e.target.value)} />
            <Select id="prod-cat" label="Categoria" value={productForm.categoryId} onChange={e => handleProductField('categoryId', e.target.value)} options={categories.map(c => ({ value: c.id, label: c.name }))} />
            <Input id="caixa" label="Caixa" value={productForm.caixa} onChange={e => handleProductField('caixa', e.target.value)} />
          </div>
        </div>

        <Tabs className="mt-4">
          <Tab label="Brasil" isActive={dispTab === 'Brasil'} onClick={() => { setDispTab('Brasil'); handleProductField('disp', 'Brasil'); }} />
          <Tab label="EUA" isActive={dispTab === 'EUA'} onClick={() => { setDispTab('EUA'); handleProductField('disp', 'EUA'); }} />
        </Tabs>

        {dispTab === 'Brasil' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input id="custoBRL" label="Custo BRL" type="number" leftAddon="R$" value={productForm.custoBRL} onChange={e => handleProductField('custoBRL', e.target.value)} error={productErrors.custoBRL} />
          </div>
        )}

        {dispTab === 'EUA' && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="custoUSD" label="Custo USD" type="number" leftAddon="US$" value={productForm.custoUSD} onChange={e => handleProductField('custoUSD', e.target.value)} error={productErrors.custoUSD} />
              <Input id="cambio" label="Câmbio" type="number" leftAddon="R$" value={productForm.cambio} onChange={e => handleProductField('cambio', e.target.value)} error={productErrors.cambio} />
            </div>
            <h4 className="text-md font-semibold">Custos de Importação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="freteDeclarado" label="Frete Declarado" type="number" leftAddon="R$" value={productForm.freteDeclarado || 0} onChange={e => handleProductField('freteDeclarado', e.target.value)} error={productErrors.freteDeclarado} />
              <Input id="freteEuaBr" label="Frete EUA x BR" type="number" leftAddon="R$" value={productForm.freteEuaBr || 0} onChange={e => handleProductField('freteEuaBr', e.target.value)} error={productErrors.freteEuaBr} />
              <Input id="freteRed" label="Frete P/ Redirecionador" type="number" leftAddon="R$" value={productForm.freteRedirecionador || 0} onChange={e => handleProductField('freteRedirecionador', e.target.value)} error={productErrors.freteRedirecionador} />
              <Input id="imposto" label="Imposto de Importação" type="number" leftAddon="R$" value={productForm.impostoImportacao || 0} onChange={e => handleProductField('impostoImportacao', e.target.value)} error={productErrors.impostoImportacao} />
              <Input id="nomeDec" label="Nome Declarado" value={productForm.nomeDeclarado || ''} onChange={e => handleProductField('nomeDeclarado', e.target.value)} />
              <Input id="precoDec" label="Preço Declarado" type="number" leftAddon="US$" value={productForm.precoDeclarado || 0} onChange={e => handleProductField('precoDeclarado', e.target.value)} error={productErrors.precoDeclarado} />
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mt-4">Custos Base</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Input id="dustBag" label="DustBag" type="number" leftAddon="R$" value={productForm.dustBag} onChange={e => handleProductField('dustBag', e.target.value)} error={productErrors.dustBag} />
            <Input id="packaging" label="Custos Embalagem" type="number" leftAddon="R$" value={productForm.packaging} onChange={e => handleProductField('packaging', e.target.value)} error={productErrors.packaging} />
            <Input id="custoOperacional" label="Custo Operacional" type="number" leftAddon="R$" value={productForm.custoOperacional.toFixed(2)} disabled />
            <Input id="frete" label="Frete" type="number" leftAddon="R$" value={productForm.frete} onChange={e => handleProductField('frete', e.target.value)} error={productErrors.frete} />
            <Input id="nfProduto" label="NF Produto" type="number" leftAddon="R$" value={productForm.nfProduto} onChange={e => handleProductField('nfProduto', e.target.value)} error={productErrors.nfProduto} />
            <Input id="nfPercent" label="NFs" type="number" step="0.01" rightAddon="%" value={productForm.nfPercent} onChange={e => handleProductField('nfPercent', e.target.value)} error={productErrors.nfPercent} />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mt-4">Valores de Venda</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Input id="lucroPercent" label="% Lucro" type="number" rightAddon="%" value={productForm.lucroPercent} onChange={e => handleProductField('lucroPercent', e.target.value)} error={productErrors.lucroPercent} />
            <Input id="valorTabela" label="Valor de Tabela" type="number" leftAddon="R$" value={productForm.valorTabela.toFixed(2)} disabled />
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
                const catProducts = products.filter(p => p.categoryId === cat.id && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
                                <Button size="sm" variant="danger" onClick={() => setDeleteId(p.id)}>Excluir</Button>
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
      <ConfirmDeleteModal />
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default ProductPricingDashboardPage;
