import React, { useState, useEffect } from 'react';
import { PageTitle, Card, Button, Input, Select, ResponsiveTable } from '../components/SharedComponents';
import { v4 as uuidv4 } from 'uuid';

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

interface Product {
  id: string;
  name: string;
  categoryId: string;
  disp: 'Brasil' | 'EUA';
  dustBag: number;
  packaging: number;
  custoBRL?: number;
  custoUSD?: number;
  cambio: number;
  custoOperacional: number;
  nfPercent: number;
  nfProduto: number;
  frete: number;
  valorTabela: number;
  lucroPercent: number;
  caixa: string;
  freteDeclarado?: number;
  freteEuaBr?: number;
  freteRedirecionador?: number;
  impostoImportacao?: number;
  nomeDeclarado?: string;
  precoDeclarado?: number;
  historicoPrecos?: string;
}

const CATEGORY_KEY = 'productCategories';
const PRODUCT_KEY = 'productItems';
const GLOBAL_KEY = 'productGlobals';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'AirPods', name: 'AirPods', dustBag: 24, packaging: 26 },
  { id: 'iPad', name: 'iPad', dustBag: 19, packaging: 21 },
  { id: 'iPhone', name: 'iPhone', dustBag: 11, packaging: 13 },
  { id: 'Apple Watch', name: 'Apple Watch', dustBag: 29, packaging: 31 },
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

const loadProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(PRODUCT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveProducts = (items: Product[]) => {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(items));
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

export const ProductPricingDashboardPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(loadCategories);
  const [globals, setGlobals] = useState<GlobalDefaults>(loadGlobals);
  const [products, setProducts] = useState<Product[]>(loadProducts);

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
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveGlobals(globals);
  }, [globals]);

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  const handleCategoryChange = (id: string, field: keyof Category, value: string) => {
    setCategories(cats => cats.map(c => c.id === id ? { ...c, [field]: Number(value) } : c));
  };

  const addCategory = () => {
    const newCat: Category = { id: uuidv4(), name: 'Nova Categoria', dustBag: 0, packaging: 0 };
    setCategories(prev => [...prev, newCat]);
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
      return updated;
    });
  };

  const startEdit = (prod: Product) => {
    setEditingId(prod.id);
    setProductForm({ ...prod });
  };

  const resetForm = () => {
    setEditingId(null);
    const first = categories[0];
    setProductForm({
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
    });
  };

  const saveProduct = () => {
    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? { id: editingId, ...productForm } as Product : p));
    } else {
      setProducts(prev => [...prev, { id: uuidv4(), ...productForm } as Product]);
    }
    resetForm();
  };

  const deleteProduct = (id: string) => {
    if (!window.confirm('Confirma a exclusão?')) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const calcValues = (p: Product) => {
    const valorVenda = p.valorTabela * (1 - p.nfPercent);
    const custoConvertido = p.disp === 'Brasil' ? (p.custoBRL || 0) : (p.custoUSD || 0) * p.cambio;
    const custoTotalProd = custoConvertido + p.dustBag + p.packaging + p.frete + p.custoOperacional + p.nfProduto;
    const lucroFinal = valorVenda - custoTotalProd;
    return { valorVenda, custoConvertido, custoTotalProd, lucroFinal, parcelado: p.valorTabela / 12 };
  };

  const productColumns = [
    { header: 'Disp', accessor: 'disp' as keyof Product },
    { header: 'Produto', accessor: 'name' as keyof Product },
    { header: 'Categoria', accessor: (item: Product) => categories.find(c => c.id === item.categoryId)?.name || '' },
    { header: 'Valor de Tabela', accessor: (item: Product) => item.valorTabela.toFixed(2) },
    { header: 'Parcelado (12x)', accessor: (item: Product) => calcValues(item).parcelado.toFixed(2) },
    { header: 'Valor de Venda', accessor: (item: Product) => calcValues(item).valorVenda.toFixed(2) },
    { header: 'Custo Total + Prod', accessor: (item: Product) => calcValues(item).custoTotalProd.toFixed(2) },
    { header: 'Lucro Final', accessor: (item: Product) => calcValues(item).lucroFinal.toFixed(2) },
    { header: 'Ações', accessor: (item: Product) => (
      <div className="space-x-1">
        <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>Editar</Button>
        <Button size="sm" variant="danger" onClick={() => deleteProduct(item.id)}>Excluir</Button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Precificação de Produtos" />

      <Card title="Gestão de Categorias e Padrões" bodyClassName="space-y-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input id="global-nfs" label="NFs (%)" type="number" step="0.01" value={globals.nfPercent} onChange={e => handleGlobalChange('nfPercent', e.target.value)} />
          <Input id="global-nfprod" label="NF Produto" type="number" value={globals.nfProduto} onChange={e => handleGlobalChange('nfProduto', e.target.value)} />
          <Input id="global-frete" label="Frete" type="number" value={globals.frete} onChange={e => handleGlobalChange('frete', e.target.value)} />
          <div className="flex items-end">
            <Button onClick={addCategory}>Adicionar Nova Categoria</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">DustBag</th>
                <th className="px-2 py-1 text-right">Custos Embalagem</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <td className="px-2 py-1">
                    <Input id={`name-${cat.id}`} value={cat.name} onChange={e => handleCategoryChange(cat.id, 'name' as any, e.target.value)} />
                  </td>
                  <td className="px-2 py-1">
                    <Input id={`dust-${cat.id}`} type="number" value={cat.dustBag} onChange={e => handleCategoryChange(cat.id, 'dustBag', e.target.value)} />
                  </td>
                  <td className="px-2 py-1">
                    <Input id={`pack-${cat.id}`} type="number" value={cat.packaging} onChange={e => handleCategoryChange(cat.id, 'packaging', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Cadastro / Edição de Produtos" bodyClassName="space-y-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input id="prod-name" label="Produto" value={productForm.name} onChange={e => handleProductField('name', e.target.value)} />
          <Select id="prod-cat" label="Categoria" value={productForm.categoryId} onChange={e => handleProductField('categoryId', e.target.value)} options={categories.map(c => ({ value: c.id, label: c.name }))} />
          <Select id="prod-disp" label="Disp" value={productForm.disp} onChange={e => handleProductField('disp', e.target.value as 'Brasil' | 'EUA')} options={[{ value: 'Brasil', label: 'Brasil' }, { value: 'EUA', label: 'EUA' }]} />
          <Input id="dustBag" label="DustBag" type="number" value={productForm.dustBag} onChange={e => handleProductField('dustBag', e.target.value)} />
          <Input id="packaging" label="Custos Embalagem" type="number" value={productForm.packaging} onChange={e => handleProductField('packaging', e.target.value)} />
          {productForm.disp === 'Brasil' && (
            <Input id="custoBRL" label="Custo BRL" type="number" value={productForm.custoBRL} onChange={e => handleProductField('custoBRL', e.target.value)} />
          )}
          {productForm.disp === 'EUA' && (
            <Input id="custoUSD" label="Custo USD" type="number" value={productForm.custoUSD} onChange={e => handleProductField('custoUSD', e.target.value)} />
          )}
          <Input id="cambio" label="Câmbio" type="number" value={productForm.cambio} onChange={e => handleProductField('cambio', e.target.value)} />
          <Input id="custoOperacional" label="Custo Operacional" type="number" value={productForm.custoOperacional} onChange={e => handleProductField('custoOperacional', e.target.value)} />
          <Input id="nfPercent" label="NFs (%)" type="number" step="0.01" value={productForm.nfPercent} onChange={e => handleProductField('nfPercent', e.target.value)} />
          <Input id="nfProduto" label="NF Produto" type="number" value={productForm.nfProduto} onChange={e => handleProductField('nfProduto', e.target.value)} />
          <Input id="frete" label="Frete" type="number" value={productForm.frete} onChange={e => handleProductField('frete', e.target.value)} />
          <Input id="valorTabela" label="Valor de Tabela" type="number" value={productForm.valorTabela} onChange={e => handleProductField('valorTabela', e.target.value)} />
          <Input id="lucroPercent" label="% Lucro" type="number" value={productForm.lucroPercent} onChange={e => handleProductField('lucroPercent', e.target.value)} />
          <Input id="caixa" label="Caixa" value={productForm.caixa} onChange={e => handleProductField('caixa', e.target.value)} />
        </div>
        {productForm.disp === 'EUA' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input id="freteDeclarado" label="Frete Declarado" type="number" value={productForm.freteDeclarado || 0} onChange={e => handleProductField('freteDeclarado', e.target.value)} />
            <Input id="freteEuaBr" label="Frete EUA x BR" type="number" value={productForm.freteEuaBr || 0} onChange={e => handleProductField('freteEuaBr', e.target.value)} />
            <Input id="freteRed" label="Frete P/ Redirecionador" type="number" value={productForm.freteRedirecionador || 0} onChange={e => handleProductField('freteRedirecionador', e.target.value)} />
            <Input id="imposto" label="Imposto de Importação" type="number" value={productForm.impostoImportacao || 0} onChange={e => handleProductField('impostoImportacao', e.target.value)} />
            <Input id="nomeDec" label="Nome Declarado" value={productForm.nomeDeclarado || ''} onChange={e => handleProductField('nomeDeclarado', e.target.value)} />
            <Input id="precoDec" label="Preço Declarado" type="number" value={productForm.precoDeclarado || 0} onChange={e => handleProductField('precoDeclarado', e.target.value)} />
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={resetForm}>Cancelar</Button>
          <Button onClick={saveProduct}>{editingId ? 'Atualizar Produto' : 'Salvar Novo Produto'}</Button>
        </div>
      </Card>

      <Card title="Produtos" bodyClassName="p-4">
        <ResponsiveTable columns={productColumns} data={products} rowKeyAccessor="id" />
      </Card>
    </div>
  );
};

export default ProductPricingDashboardPage;
