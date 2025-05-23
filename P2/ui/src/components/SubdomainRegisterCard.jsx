// src/components/SubdomainRegisterCard.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createSubdomain } from '../services/subdomain';

export default function SubdomainRegisterCard() {
  const { domain } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    subdomain: '',
    cacheSize: 100,
    fileTypes: ['html', 'css', 'js', 'png'],
    ttl: '5m',
    replacementPolicy: 'LRU',
    authMethod: 'api-keys',
    apiKeys: [''],
    users: [{ username: '', password: '' }]
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleArrayChange = (name, value) => {
    setForm((f) => ({ ...f, [name]: value.split(',').map(s => s.trim()) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSubdomain(domain, form);
      navigate(`/domains/${domain}/subdomains`);
    } catch (err) {
      console.error(err);
      alert('Error al crear subdominio');
    } finally {
      setSaving(false);
    }
  };

    return (
        <div className="bg-lightgrey2 text-darkgrey max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-lg">
            <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6">Agregar Subdominio a {domain}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label>Subdominio</label>
                    <input
                        name="subdomain"
                        value={form.subdomain}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label>Cache Size</label>
                    <input
                        name="cacheSize"
                        type="number"
                        value={form.cacheSize}
                        onChange={handleChange}
                        className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    </div>
                    <div>
                    <label>TTL (ej. “5m”)</label>
                    <input
                        name="ttl"
                        value={form.ttl}
                        onChange={handleChange}
                        className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    </div>
                </div>

                <div>
                    <label>Tipos de archivo (coma separados)</label>
                    <input
                    name="fileTypes"
                    value={form.fileTypes.join(', ')}
                    onChange={(e) => handleArrayChange('fileTypes', e.target.value)}
                    className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div>
                    <label>Política de reemplazo</label>
                    <select
                    name="replacementPolicy"
                    value={form.replacementPolicy}
                    onChange={handleChange}
                    className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                    {['LRU','LFU','FIFO','MRU','Random'].map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                    </select>
                </div>

                <div>
                    <label>Método de autenticación</label>
                    <select
                    name="authMethod"
                    value={form.authMethod}
                    onChange={handleChange}
                    className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                    <option value="api-keys">API Keys</option>
                    <option value="user-pass">Usuario/Password</option>
                    </select>
                </div>

                {form.authMethod === 'api-keys' && (
                    <div>
                    <label>API Keys (coma separados)</label>
                    <input
                        name="apiKeys"
                        value={form.apiKeys.join(', ')}
                        onChange={(e) => handleArrayChange('apiKeys', e.target.value)}
                        className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    </div>
                )}

                {form.authMethod === 'user-pass' && (
                    <div className="space-y-2">
                    <label>Usuarios</label>
                    {form.users.map((u, i) => (
                        <div key={i} className="flex gap-2">
                        <input
                            placeholder="usuario"
                            value={u.username}
                            onChange={(e) => {
                            const users = [...form.users];
                            users[i].username = e.target.value;
                            setForm(f => ({ ...f, users }));
                            }}
                            className="flex-1 border px-2 py-1 rounded"
                        />
                        <input
                            placeholder="password"
                            type="password"
                            value={u.password}
                            onChange={(e) => {
                            const users = [...form.users];
                            users[i].password = e.target.value;
                            setForm(f => ({ ...f, users }));
                            }}
                            className="flex-1 border px-2 py-1 rounded"
                        />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() =>
                        setForm(f => ({ users: [...f.users, { username: '', password: '' }], ...f }))
                        }
                        className="text-sm text-blue-600 hover:underline"
                    >
                        + Agregar otro usuario
                    </button>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border rounded"
                        >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full px-4 py-2 bg-secondary text-light rounded-md hover:bg-black transition-colors"
                        >
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
}
