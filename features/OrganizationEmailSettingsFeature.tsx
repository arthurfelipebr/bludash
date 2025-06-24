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
    smtpSecure: true,
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
          smtpPort: Number(cfg.smtpPort) || 587,
          smtpUser: cfg.smtpUser || '',
          smtpPassword: '',
          smtpFromEmail: cfg.smtpFromEmail || '',
          smtpSecure: !!cfg.smtpSecure,
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
    if (!formData.smtpHost || !formData.smtpPort) {
      setError('Host e porta são obrigatórios.');
      return;
    }
    if (isNaN(Number(formData.smtpPort))) {
      setError('Porta deve ser numérica.');
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationSmtpConfig(formData);
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
      setSuccess('E-mail enviado com sucesso.');
    } catch (e) {
      setError('Falha no envio de teste.');
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
          <Input label="Porta" id="smtpPort" name="smtpPort" value={formData.smtpPort.toString()} onChange={handleChange} required />
          <Input label="Usuário SMTP" id="smtpUser" name="smtpUser" value={formData.smtpUser || ''} onChange={handleChange} />
          <Input label="Senha SMTP" type="password" id="smtpPassword" name="smtpPassword" value={formData.smtpPassword || ''} onChange={handleChange} />
          <Input label="E-mail do remetente" id="smtpFromEmail" name="smtpFromEmail" value={formData.smtpFromEmail || ''} onChange={handleChange} />
          <label className="flex items-center space-x-2">
            <input type="checkbox" name="smtpSecure" checked={formData.smtpSecure} onChange={handleChange} className="h-4 w-4" />
            <span>Conexão segura (SSL/TLS)</span>
          </label>
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
