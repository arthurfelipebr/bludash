import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUsers, inviteUser } from '../services/AppService';
import { PageTitle, Card, ResponsiveTable, Button, Modal, Input, Select, Alert, Spinner } from '../components/SharedComponents';
import { formatDateBR } from '../services/AppService';
import { useAuth } from '../Auth';

const ROLE_OPTIONS = [
  { value: 'user', label: 'Usuário' },
  { value: 'admin', label: 'Administrador' },
];

export const UserManagementPage: React.FC<{}> = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar usuários.');
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      const newUser = await inviteUser({ email: inviteEmail, password: invitePassword, name: inviteName, role: inviteRole });
      setUsers([...users, newUser]);
      setInviteModalOpen(false);
      setInviteEmail('');
      setInvitePassword('');
      setInviteName('');
      setInviteRole('user');
    } catch (err: any) {
      setInviteError(err.message || 'Falha ao convidar usuário.');
    }
    setIsInviting(false);
  };

  if (currentUser?.role !== 'admin') {
    return <Alert type="error" message="Acesso negado." onClose={undefined} />;
  }

  const columns = [
    { header: 'E-mail', accessor: (u: User) => u.email },
    { header: 'Nome', accessor: (u: User) => u.name || '-' },
    { header: 'Role', accessor: (u: User) => u.role || 'user' },
    { header: 'Registrado', accessor: (u: User) => u.registrationDate ? formatDateBR(u.registrationDate, true) : '-' },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Gerenciar Usuários" subtitle="Convide novos usuários e defina papéis" />
      <Card actions={<Button onClick={() => setInviteModalOpen(true)}>Convidar Usuário</Button>}>
        {isLoading ? <Spinner /> : error ? <Alert type="error" message={error} onClose={() => setError(null)} /> : (
          <ResponsiveTable columns={columns} data={users} rowKeyAccessor="id" />
        )}
      </Card>
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Convidar Usuário">
        {inviteError && <Alert type="error" message={inviteError} onClose={() => setInviteError(null)} />}
        <Input label="E-mail" id="inviteEmail" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
        <Input label="Senha" id="invitePassword" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} required />
        <Input label="Nome" id="inviteName" type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} />
        <Select label="Role" id="inviteRole" value={inviteRole} onChange={e => setInviteRole(e.target.value)} options={ROLE_OPTIONS} />
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleInvite} isLoading={isInviting}>Convidar</Button>
        </div>
      </Modal>
    </div>
  );
};
