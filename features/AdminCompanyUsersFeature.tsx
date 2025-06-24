import React, { useEffect, useState } from 'react';
import { Empresa, Plano, UsuarioEmpresa } from '../types';
import { getEmpresas, saveEmpresa, updateEmpresaStatus, getPlanosAdmin, getUsuariosEmpresa, saveUsuarioEmpresa, deleteUsuarioEmpresa, formatDateBR } from '../services/AppService';
import { PageTitle, Card, ResponsiveTable, Spinner, Alert, Button, Modal, Input, Select } from '../components/SharedComponents';

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'ativo' },
  { value: 'suspenso', label: 'suspenso' },
  { value: 'inativo', label: 'inativo' },
];
const NIVEL_OPTIONS = [
  { value: 'admin', label: 'admin' },
  { value: 'operador', label: 'operador' },
];

const EmpresaForm: React.FC<{isOpen:boolean; onClose:()=>void; onSave:(e:Partial<Empresa>)=>Promise<void>; empresa?:Empresa|null; planos:Plano[]}> = ({isOpen,onClose,onSave,empresa,planos}) => {
  const [formData,setFormData] = useState<Partial<Empresa>>({});
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState<string|null>(null);

  useEffect(()=>{ if(empresa) setFormData(empresa); else setFormData({status:'ativo'}); },[empresa,isOpen]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch(err:any){
      setError(err.message);
    } finally { setSaving(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={empresa?'Editar Empresa':'Nova Empresa'}>
      {error && <Alert type="error" message={error} onClose={()=>setError(null)} />}
      <Input label="Nome" id="nome" value={formData.nome||''} onChange={e=>setFormData({...formData,nome:e.target.value})} required />
      <Input label="E-mail responsável" id="email" type="email" value={formData.email_responsavel||''} onChange={e=>setFormData({...formData,email_responsavel:e.target.value})} />
      <Select label="Plano" id="plano" value={formData.plano_id?.toString()||''} onChange={e=>setFormData({...formData,plano_id:e.target.value?parseInt(e.target.value):undefined})} options={[{value:'',label:'-'} ,...planos.map(p=>({value:p.id.toString(),label:p.nome}))]} />
      <Select label="Status" id="status" value={formData.status||'ativo'} onChange={e=>setFormData({...formData,status:e.target.value as any})} options={STATUS_OPTIONS} />
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} isLoading={saving}>Salvar</Button>
      </div>
    </Modal>
  );
};

const UsuariosEmpresaPanel: React.FC<{empresa:Empresa|null; onClose:()=>void}> = ({empresa,onClose}) => {
  const [users,setUsers] = useState<UsuarioEmpresa[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [isFormOpen,setFormOpen] = useState(false);
  const [editing,setEditing] = useState<UsuarioEmpresa|null>(null);

  useEffect(()=>{ if(empresa){ load(); } },[empresa]);

  const load = async () => {
    if(!empresa) return; setLoading(true); try{ const data= await getUsuariosEmpresa(empresa.id); setUsers(data);}catch(err:any){ setError(err.message);} finally{ setLoading(false);} };

  const handleSave = async (u:Partial<UsuarioEmpresa>)=>{
    if(!empresa) return; await saveUsuarioEmpresa(empresa.id,{...editing,...u,id:editing?.id}); setEditing(null); setFormOpen(false); load(); };

  const columns = [
    { header: 'Nome', accessor: (u:UsuarioEmpresa)=>u.nome },
    { header: 'E-mail', accessor: (u:UsuarioEmpresa)=>u.email },
    { header: 'Acesso', accessor: (u:UsuarioEmpresa)=>u.nivel_acesso },
    { header: 'Ações', accessor: (u:UsuarioEmpresa)=>(<div className="flex space-x-1"><Button size="sm" variant="link" onClick={()=>{setEditing(u);setFormOpen(true);}}>Editar</Button><Button size="sm" variant="danger" onClick={()=>{deleteUsuarioEmpresa(u.id).then(load);}}>Excluir</Button></div>) }
  ];

  return (
    <Modal isOpen={!!empresa} onClose={onClose} title={`Usuários de ${empresa?.nome||''}`} size="lg">
      {error && <Alert type="error" message={error} onClose={()=>setError(null)} />}
      {loading ? <Spinner /> : <ResponsiveTable columns={columns} data={users} rowKeyAccessor="id" />} 
      <div className="flex justify-end mt-4"><Button onClick={()=>{setEditing(null);setFormOpen(true);}}>Adicionar Usuário</Button></div>
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={()=>setFormOpen(false)} title={editing?'Editar Usuário':'Novo Usuário'}>
          <Input label="Nome" id="unome" value={editing?.nome||''} onChange={e=>setEditing({...editing, nome:e.target.value} as UsuarioEmpresa)} />
          <Input label="E-mail" id="uemail" type="email" value={editing?.email||''} onChange={e=>setEditing({...editing, email:e.target.value} as UsuarioEmpresa)} />
          <Select label="Nível" id="nivel" value={editing?.nivel_acesso||'operador'} onChange={e=>setEditing({...editing, nivel_acesso:e.target.value as any} as UsuarioEmpresa)} options={NIVEL_OPTIONS} />
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={()=>setFormOpen(false)}>Cancelar</Button>
            <Button onClick={()=>{handleSave(editing||{});}}>Salvar</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

const AdminCompanyUsersPage: React.FC = () => {
  const [empresas,setEmpresas] = useState<Empresa[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [planos,setPlanos] = useState<Plano[]>([]);
  const [formOpen,setFormOpen] = useState(false);
  const [editing,setEditing] = useState<Empresa|null>(null);
  const [viewUsers,setViewUsers] = useState<Empresa|null>(null);

  const load = async () => {
    try{
      const [e,p] = await Promise.all([getEmpresas(), getPlanosAdmin()]);
      setEmpresas(e); setPlanos(p); setError(null);
    }catch(err:any){ setError(err.message); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const handleSave = async (data:Partial<Empresa>) => {
    await saveEmpresa({ ...editing, ...data, id: editing?.id });
    setEditing(null); setFormOpen(false); load();
  };

  const columns = [
    { header:'Empresa', accessor: (e:Empresa)=>e.nome },
    { header:'Status', accessor: (e:Empresa)=>(<span className={`px-2 py-1 rounded ${e.status==='ativo'?'bg-green-100 text-green-800':e.status==='suspenso'?'bg-yellow-100 text-yellow-800':'bg-gray-200 text-gray-800'}`}>{e.status}</span>) },
    { header:'Plano', accessor: (e:Empresa)=>e.planoNome||'-' },
    { header:'Última Atividade', accessor: (e:Empresa)=>formatDateBR(e.data_ultima_atividade,true) },
    { header:'Ações', accessor: (e:Empresa)=>(<div className="flex space-x-1"><Button size="sm" variant="link" onClick={()=>setViewUsers(e)}>Ver detalhes</Button><Button size="sm" variant="link" onClick={()=>{setEditing(e);setFormOpen(true);}}>Editar</Button><Button size="sm" variant="ghost" onClick={()=>{updateEmpresaStatus(e.id, e.status==='ativo'?'suspenso':'ativo').then(load);}}>{e.status==='ativo'?'Desativar':'Ativar'}</Button></div>) }
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Gestão de Usuários / Clientes" subtitle="Administre contas de empresas" />
      <Card actions={<Button onClick={()=>{setEditing(null);setFormOpen(true);}}>+ Nova Empresa</Button>}>
        {loading ? <Spinner /> : error ? <Alert type="error" message={error} onClose={()=>setError(null)} /> : <ResponsiveTable columns={columns} data={empresas} rowKeyAccessor="id" />} 
      </Card>
      <EmpresaForm isOpen={formOpen} onClose={()=>setFormOpen(false)} onSave={handleSave} empresa={editing} planos={planos} />
      {viewUsers && <UsuariosEmpresaPanel empresa={viewUsers} onClose={()=>setViewUsers(null)} />}
    </div>
  );
};

export default AdminCompanyUsersPage;
