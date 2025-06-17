import React, { useState, useEffect } from 'react';
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
  { id: 'iPad', name: 'iPad', dustBag: 19, packaging: 21 },
  { id: 'iPhone', name: 'iPhone', dustBag: 11, packaging: 13 },
  { id: 'Apple Watch', name: 'Apple Watch', dustBag: 29, packaging: 31 },
  { id: 'Garmin', name: 'Garmin', dustBag: 10, packaging: 12 },
  { id: 'iMac', name: 'iMac', dustBag: 40, packaging: 42 },
  { id: 'Mac Mini', name: 'Mac Mini', dustBag: 20, packaging: 22 },
  { id: 'Mac Studio', name: 'Mac Studio', dustBag: 45, packaging: 47 },
  { id: 'MacBook Air', name: 'MacBook Air', dustBag: 25, packaging: 27 },
  { id: 'MacBook Pro', name: 'MacBook Pro', dustBag: 25, packaging: 27 },
  { id: 'OpenBox iP', name: 'OpenBox iP', dustBag: 9, packaging: 11 },
  { id: 'Outros', name: 'Outros', dustBag: 0, packaging: 2 },
];

const DEFAULT_GLOBALS: GlobalDefaults = { nfPercent: 0.02, nfProduto: 30, frete: 105 };

const loadCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(CATEGORY_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

const saveCategories = (cats: Category[]) => {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(cats));
};


const loadGlobals = (): GlobalDefaults => {
  try {
    const raw = localStorage.getItem(GLOBAL_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_GLOBALS;
  } catch {
    return DEFAULT_GLOBALS;
  }
};

const saveGlobals = (g: GlobalDefaults) => {
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(g));
};

const computeValorTabela = (p: Omit<Product, 'id'>): number => {
  // custos de importação opcionais
  const importCosts =
    (p.freteDeclarado || 0) +
    (p.freteEuaBr || 0) +
    (p.freteRedirecionador || 0) +
    (p.impostoImportacao || 0);

  // soma dos custos fixos mais o custo do produto
  const custoTotal =
    p.dustBag + p.packaging + p.frete + p.custoOperacional + p.nfProduto + importCosts;
  const custoConvertido =
    p.disp === 'Brasil' ? (p.custoBRL || 0) : (p.custoUSD || 0) * p.cambio;
  const custoTotalProd = custoConvertido + custoTotal; // Custo Total + Prod

  // valor de tabela contempla lucro e compensação das NFs
  const valorBase = custoTotalProd * (1 + p.lucroPercent);
  const bruto = valorBase / (1 - p.nfPercent);
  // arredonda o valor para o mais próximo que termine em "70"
  const arredondado = Math.round((bruto - 70) / 100) * 100 + 70;
  return arredondado;
};

export const ProductPricingDashboardPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(loadCategories);
  const [globals, setGlobals] = useState<GlobalDefaults>(loadGlobals);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dispTab, setDispTab] = useState<'Brasil' | 'EUA'>('Brasil');

  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({
    name: '',
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
    setProductForm(prev => ({ ...prev, valorTabela: computeValorTabela(prev) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const saveCategory = (cat: Category) => {
    if (cat.id) {
      setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
      setToastMessage('Categoria Atualizada');
    } else {
      const newCat = { ...cat, id: uuidv4() };
      setCategories(prev => [...prev, newCat]);
      setToastMessage('Categoria Salva');
    }
    setCategoryModalOpen(false);
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setCategoryModalOpen(false);
    setToastMessage('Categoria Excluída');
  };

  const handleGlobalChange = (field: keyof GlobalDefaults, value: string) => {
    setGlobals(prev => ({ ...prev, [field]: Number(value) }));
  };

  const handleProductField = (field: keyof Omit<Product, 'id'>, value: string) => {
    const numericFields: Array<keyof Omit<Product, 'id'>> = [
      'dustBag','packaging','custoBRL','custoUSD','cambio','custoOperacional','nfPercent','nfProduto','frete','valorTabela','lucroPercent','freteDeclarado','freteEuaBr','freteRedirecionador','impostoImportacao','precoDeclarado'
    ];
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
      updated.valorTabela = computeValorTabela(updated);
      return updated;
    });
  };

  const startEdit = (prod: Product) => {
    setEditingId(prod.id);
    const withoutId = { ...prod } as Omit<Product, 'id'>;
    withoutId.valorTabela = computeValorTabela(withoutId);
    setProductForm(withoutId);
    setDispTab(prod.disp);
  };

  const resetForm = () => {
    setEditingId(null);
    const first = categories[0];
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
    base.valorTabela = computeValorTabela(base);
    setProductForm(base);
    setDispTab('Brasil');
  };

  const saveProduct = async () => {
    const valorTabela = computeValorTabela(productForm);
    const toSave: Product = { id: editingId ?? uuidv4(), ...productForm, valorTabela };
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

  const calcValues = (p: Product) => {
    const importCosts =
      (p.freteDeclarado || 0) +
      (p.freteEuaBr || 0) +
      (p.freteRedirecionador || 0) +
      (p.impostoImportacao || 0);
    const custoTotal = p.dustBag + p.packaging + p.frete + p.custoOperacional + p.nfProduto + importCosts;
    const custoConvertido = p.disp === 'Brasil' ? (p.custoBRL || 0) : (p.custoUSD || 0) * p.cambio;
    const custoTotalProd = custoConvertido + custoTotal;
    const valorTabela = p.valorTabela || computeValorTabela(p);
    const valorVenda = valorTabela * (1 - p.nfPercent);
    const lucroFinal = valorVenda - custoTotalProd;
    return { valorVenda, custoConvertido, custoTotalProd, lucroFinal, parcelado: valorTabela / 12, custoTotal, valorTabela };
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
        footer={(
          <>
            {editingCategory.id && (
              <Button variant="danger" onClick={() => deleteCategory(editingCategory.id)}>Excluir</Button>
            )}
            <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>Cancelar</Button>
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

  return (
    <div className="space-y-6">
      <PageTitle title="Precificação de Produtos" />

      <Card title="Gestão de Categorias e Padrões" bodyClassName="space-y-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input id="global-nfs" label="NFs (%)" type="number" step="0.01" value={globals.nfPercent} onChange={e => handleGlobalChange('nfPercent', e.target.value)} />
          <Input id="global-nfprod" label="NF Produto" type="number" value={globals.nfProduto} onChange={e => handleGlobalChange('nfProduto', e.target.value)} />
          <Input id="global-frete" label="Frete" type="number" value={globals.frete} onChange={e => handleGlobalChange('frete', e.target.value)} />
          <div className="flex items-end">
            <Button onClick={openNewCategory}>Adicionar Nova Categoria</Button>
          </div>
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
            <Input id="custoBRL" label="Custo BRL" type="number" value={productForm.custoBRL} onChange={e => handleProductField('custoBRL', e.target.value)} />
          </div>
        )}

        {dispTab === 'EUA' && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="custoUSD" label="Custo USD" type="number" value={productForm.custoUSD} onChange={e => handleProductField('custoUSD', e.target.value)} />
              <Input id="cambio" label="Câmbio" type="number" value={productForm.cambio} onChange={e => handleProductField('cambio', e.target.value)} />
            </div>
            <h4 className="text-md font-semibold">Custos de Importação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="freteDeclarado" label="Frete Declarado" type="number" value={productForm.freteDeclarado || 0} onChange={e => handleProductField('freteDeclarado', e.target.value)} />
              <Input id="freteEuaBr" label="Frete EUA x BR" type="number" value={productForm.freteEuaBr || 0} onChange={e => handleProductField('freteEuaBr', e.target.value)} />
              <Input id="freteRed" label="Frete P/ Redirecionador" type="number" value={productForm.freteRedirecionador || 0} onChange={e => handleProductField('freteRedirecionador', e.target.value)} />
              <Input id="imposto" label="Imposto de Importação" type="number" value={productForm.impostoImportacao || 0} onChange={e => handleProductField('impostoImportacao', e.target.value)} />
              <Input id="nomeDec" label="Nome Declarado" value={productForm.nomeDeclarado || ''} onChange={e => handleProductField('nomeDeclarado', e.target.value)} />
              <Input id="precoDec" label="Preço Declarado" type="number" value={productForm.precoDeclarado || 0} onChange={e => handleProductField('precoDeclarado', e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mt-4">Custos Base</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <Input id="dustBag" label="DustBag" type="number" value={productForm.dustBag} onChange={e => handleProductField('dustBag', e.target.value)} />
            <Input id="packaging" label="Custos Embalagem" type="number" value={productForm.packaging} onChange={e => handleProductField('packaging', e.target.value)} />
            <Input id="custoOperacional" label="Custo Operacional" type="number" value={productForm.custoOperacional} onChange={e => handleProductField('custoOperacional', e.target.value)} />
            <Input id="frete" label="Frete" type="number" value={productForm.frete} onChange={e => handleProductField('frete', e.target.value)} />
            <Input id="nfProduto" label="NF Produto" type="number" value={productForm.nfProduto} onChange={e => handleProductField('nfProduto', e.target.value)} />
            <Input id="nfPercent" label="NFs (%)" type="number" step="0.01" value={productForm.nfPercent} onChange={e => handleProductField('nfPercent', e.target.value)} />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mt-4">Valores de Venda</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
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
              {products.map(p => {
                const values = calcValues(p);
                const isOpen = expandedId === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr>
                      <td className="px-2 py-1 text-center">
                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(isOpen ? null : p.id)}>
                          <i className={`heroicons-outline-${isOpen ? 'minus' : 'plus'} h-4 w-4`} />
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
                            <span>Custo Operacional: {p.custoOperacional.toFixed(2)}</span>
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
