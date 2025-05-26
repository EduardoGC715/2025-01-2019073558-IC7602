import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  createSubdomain,
  updateSubdomain,
  getSubdomainByName,
} from '../services/subdomain'; 

export default function SubdomainForm() {
  const { domain, subdomain: subParam } = useParams();
  const isEdit = Boolean(subParam);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    subdomain: '',
    destination: '',
    cacheSize: '',
    fileTypes: [],
    ttl: '',
    replacementPolicy: '',
    authMethod: '',
    apiKeys: [{ key: '', enabled: true }],
    users: [{ username: '', password: '' }],
  });

  const defaults = {
    cacheSize: 100,
    fileTypes: ['html','css','js','png'],
    ttl: '5m',
    replacementPolicy: 'LRU',
    authMethod: 'api-keys'
  };

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // If editing, fetch existing data
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getSubdomainByName(domain, subParam);
        // transform incoming { keyName: boolean } into { key, enabled }
        const apiKeys = data.apiKeys.map(item => {
          const key = Object.keys(item)[0];
          return { key, enabled: item[key] };
        });
        // transform incoming { username: password } into { username, password }
        const users = data.users.map(item => {
          const username = Object.keys(item)[0];
          return { username, password: item[username] };
        });
      
        setForm({
          subdomain: subParam,
          cacheSize: data.cacheSize,
          fileTypes: data.fileTypes,
          ttl: data.ttl,
          replacementPolicy: data.replacementPolicy,
          authMethod: data.authMethod,
          apiKeys,
          users,
          destination: data.destination || '',
        });
      } catch (err) {
        console.error(err);
        alert('Error fetching subdomain');
      } finally {
        setLoading(false);
      }
    })();
  }, [domain, subParam, isEdit]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleArrayChange = (name, value) => {
    setForm(f => ({ ...f, [name]: value.split(',').map(s => s.trim()) }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        apiKeys: form.authMethod === "api-keys"
          ? form.apiKeys.map(k => ({ [k.key]: k.enabled }))
          : [],
        users: form.authMethod === "user-password"
          ? form.users.map(u => ({ [u.username]: u.password }))
          : []
      };
      if (isEdit) {
        await updateSubdomain(domain, subParam, payload);
      } else {
        await createSubdomain(domain, payload);
      }
      navigate(`/domains/${domain}/subdomains`);
    } catch (err) {
      console.error(err);
      alert(isEdit ? 'Error al actualizar subdominio' : 'Error al crear subdominio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-b-2 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-lightgrey2 text-darkgrey max-w-xl mx-auto mt-10 p-6 rounded-2xl shadow-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <ArrowLeft size={24} />
      </button>
      <h2 className="text-2xl font-bold mb-6">
        {isEdit ? `Editar Subdominio "${subParam}"` : `Agregar Subdominio a ${domain}`}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subdomain (disabled on edit) */}
        <div>
          <label>Subdominio</label>
          <input
            name="subdomain"
            value={form.subdomain}
            onChange={handleChange}
            required
            disabled={isEdit}
            placeholder={!isEdit ? 'mi-casa' : undefined}
            className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        {/* Destination */}
        <div>
          <label>Destino (URL o IP)</label>
          <input
            name="destination"
            value={form.destination}
            onChange={handleChange}
            required
            placeholder="www.micasa.com or 192.168.0.1"
            className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Cache size & TTL */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Cache Size</label>
            <input
              name="cacheSize"
              type="number"
              value={form.cacheSize}
              onChange={handleChange}
              placeholder={defaults.cacheSize}
              className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label>TTL (ej. “5m”)</label>
            <input
              name="ttl"
              value={form.ttl}
              onChange={handleChange}
              placeholder={defaults.ttl}
              className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* File types */}
        <div>
          <label>Tipos de archivo (coma separados)</label>
          <input
            name="fileTypes"
            value={form.fileTypes.join(', ')}
            onChange={e => handleArrayChange('fileTypes', e.target.value)}
            placeholder={defaults.fileTypes.join(', ')}
            className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Replacement policy */}
        <div>
          <label>Política de reemplazo</label>
          <select
            name="replacementPolicy"
            value={form.replacementPolicy}
            onChange={handleChange}
            className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              {defaults.replacementPolicy}
            </option>
            {['LRU','LFU','FIFO','MRU','Random'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Auth method */}
        <div>
          <label>Método de autenticación</label>
          <select
            name="authMethod"
            value={form.authMethod}
            onChange={handleChange}
            className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              {defaults.authMethod}
            </option>
            <option value="api-keys">API Keys</option>
            <option value="user-password">Usuario/Password</option>
            <option value="none">Ninguno</option>
          </select>
        </div>

        {/* API keys or users */}
        {form.authMethod === 'api-keys' && (
          <div className="space-y-4">
            <label className="block font-medium">API Keys</label>
            {form.apiKeys.map((k, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={k.key}
                  onChange={e => {
                    const newKeys = [...form.apiKeys];
                    newKeys[idx] = { ...newKeys[idx], key: e.target.value };
                    setForm(prev => ({ ...prev, apiKeys: newKeys }));
                  }}
                  required
                  className="flex-1 p-2 border border-darkgrey rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={k.enabled}
                    onChange={e => {
                      const newKeys = [...form.apiKeys];
                      newKeys[idx] = { ...newKeys[idx], enabled: e.target.checked };
                      setForm(prev => ({ ...prev, apiKeys: newKeys }));
                    }}
                  />
                  Enabled
                </label>
                {form.apiKeys.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => {
                        const apiKeys = prev.apiKeys.filter((_, i) => i !== idx);
                        return { ...prev, apiKeys };
                      });
                    }}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm(prev => ({
                  ...prev,
                  apiKeys: [...prev.apiKeys, { key: '', enabled: true }]
                }))
              }
              className="text-sm text-blue-600 hover:underline"
            >
              + Agregar otra API Key
            </button>
          </div>
        )}
        {form.authMethod === 'user-password' && (
          <div className="space-y-4">
            <label className="block font-medium">Usuarios</label>
            {form.users.map((u, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Usuario"
                  value={u.username}
                  onChange={e => {
                    setForm(prev => {
                      const users = [...prev.users];
                      users[idx] = { ...users[idx], username: e.target.value };
                      return { ...prev, users };
                    });
                  }}
                  required
                  className="flex-1 p-2 border border-darkgrey rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={u.password}
                  onChange={e => {
                    setForm(prev => {
                      const users = [...prev.users];
                      users[idx] = { ...users[idx], password: e.target.value };
                      return { ...prev, users };
                    });
                  }}
                  required
                  className="flex-1 p-2 border border-darkgrey rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {form.users.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => {
                        const users = prev.users.filter((_, i) => i !== idx);
                        return { ...prev, users };
                      });
                    }}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm(prev => ({
                  ...prev,
                  users: [...prev.users, { username: '', password: '' }]
                }))
              }
              className="text-sm text-blue-600 hover:underline"
            >
              + Agregar otro usuario
            </button>
          </div>
        )}
        {/* Actions */}
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
            {saving
              ? 'Guardando...'
              : isEdit
              ? 'Actualizar'
              : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
