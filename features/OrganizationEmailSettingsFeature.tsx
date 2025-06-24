import React, { useEffect, useState } from 'react';
import { PageTitle, Card, Input, Button, Alert, Spinner } from '../components/SharedComponents';
import { getOrganizationSmtpConfig, updateOrganizationSmtpConfig, testOrganizationSmtp } from '../services/AppService';
import { OrganizationSmtpConfig } from '../types';
import { useAuth } from '../Auth';

const OrganizationEmailSettingsFeature: React.FC = () => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<OrganizationSmtpConfig>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpSecure: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cfg = await getOrganizationSmtpConfig();
        setFormData({
          smtpHost: cfg.smtpHost || '',
          smtpPort: 587,
          smtpUser: cfg.smtpUser || '',
          smtpPassword: '',
          smtpFromEmail: cfg.smtpFromEmail || '',
          smtpSecure: false,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!formData.smtpHost) {
      setError('Host é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationSmtpConfig({ ...formData, smtpPort: 587, smtpSecure: false });
      setSuccess('Configurações salvas com sucesso.');
      setFormData(f => ({ ...f, smtpPassword: '' }));
    } catch (e) {
      setError('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      await testOrganizationSmtp();
      setSuccess('E-mail de teste enviado com sucesso.');
    } catch (e: any) {
      if (e?.code === 'ETIMEDOUT') {
        setError('Não foi possível se conectar ao servidor SMTP (timeout). Verifique se a porta 587 está liberada.');
      } else if (typeof e?.message === 'string' && e.message.includes('wrong version number')) {
        setError('Erro de SSL: o servidor SMTP não aceita STARTTLS na porta 587. Verifique se o servidor está configurado corretamente.');
      } else {
        setError(e?.message || 'Falha no envio de teste.');
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-6"><Spinner /></div>;
  if (!currentUser || currentUser.role !== 'admin') {
    return <Alert type="error" message="Acesso restrito" />;
  }

  return (
    <div className="space-y-4 max-w-xl">
      <PageTitle title="Configurações de E-mail (SMTP)" />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
          <Input label="Servidor SMTP" id="smtpHost" name="smtpHost" value={formData.smtpHost} onChange={handleChange} required />
          <Input label="Usuário SMTP" id="smtpUser" name="smtpUser" value={formData.smtpUser || ''} onChange={handleChange} />
          <Input label="Senha SMTP" type="password" id="smtpPassword" name="smtpPassword" value={formData.smtpPassword || ''} onChange={handleChange} />
          <Input label="E-mail do remetente" id="smtpFromEmail" name="smtpFromEmail" value={formData.smtpFromEmail || ''} onChange={handleChange} />
          <div className="flex space-x-2">
            <Button type="submit" isLoading={saving}>Salvar</Button>
            <Button type="button" variant="secondary" onClick={handleTest} isLoading={testing}>Testar Envio</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default OrganizationEmailSettingsFeature;
