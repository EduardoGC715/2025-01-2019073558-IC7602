import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Trash2, Eye } from 'lucide-react';
import {
  createSubdomain,
  updateSubdomain,
  getSubdomainByName,
} from '../services/subdomain';
import ms from 'ms';
import CreatedApiKeysModal from './CreatedApiKeysModal';

export default function SubdomainForm() {
  const { domain, subdomain: subParam } = useParams();
  const isEdit = subParam !== undefined;
  const navigate = useNavigate();
  const [createdKeys, setCreatedKeys] = useState(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);

  const [form, setForm] = useState({
    subdomain: '',
    destination: '',
    cacheSize: '',
    fileTypes: [],
    ttl: '',
    replacementPolicy: '',
    authMethod: '',
    apiKeys: [{ id: 0, name: '', isExisting: false }],
    users:   [{ id: 0, username: '', password: '', isExisting: false, resetting: false }],
    protocol: 'https',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [nextApiKeyId, setNextApiKeyId] = useState(1);
  const [nextUserId,   setNextUserId]   = useState(1);

  const mimeTypes = [
    'text/html',
    'text/css',
    'application/js',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'application/xml',
    'text/plain',
    'application/pdf'
  ];

  const addApiKey = () => {
    console.log('Adding new API Key', nextApiKeyId);
    setForm(f => ({
      ...f,
      apiKeys: [
        ...f.apiKeys,
        {
          id: nextApiKeyId,
          name: '',        
          isExisting: false,
        },
      ],
    }));
    setNextApiKeyId(id => id + 1);
  };

  const deleteApiKey = idToRemove => {
    setForm(f => {
      const rest = f.apiKeys.filter(k => k.id !== idToRemove);
      return {
        ...f,
        apiKeys: rest.length
          ? rest
          : [
              {
                id: nextApiKeyId,
                name: '',
                isExisting: false,
              },
            ],
      };
    });
    setNextApiKeyId(i => i + 1);
  };
  
  const addUser = () => {
    setForm(f => ({
      ...f,
      users: [
        ...f.users,
        { id: nextUserId, username: '', password: '', isExisting: false },
      ],
    }));
    setNextUserId(id => id + 1);
  };
  const deleteUser = idToRemove => {
    setForm(f => {
      const rest = f.users.filter(u => u.id !== idToRemove);
      return {
        ...f,
        users: rest.length ? rest : [ { id: nextUserId, username: '', password: '', isExisting: false } ],
      };
    });
    setNextUserId(id => id + 1);
  };

  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const data = await getSubdomainByName(domain, subParam);
        const apiKeysData = data.apiKeys || {};
        const apiKeys = Object.entries(apiKeysData).map(([hashedKey, name], i) => ({
          id: i,
          key: hashedKey,
          name,                  
          isExisting:   true,    
        }));
        if (!apiKeys.length) {
          apiKeys.push({
            id: 0,
            name: '',
            isExisting: false,
          });
        }
        setNextApiKeyId(apiKeys.length);

        const users = Object.entries(data.users || {}).map(([u, p], i) => ({
          id: i,
          username: u,
          password: p,
          isExisting: true,
          resetting: false,
        }));
        if (!users.length) {
          users.push({
            id: 0,
            username: '',
            password: '',
            isExisting: false,
            resetting: false,
          });
        }
        setNextUserId(users.length);

        const subdomain = subParam === '_root_' ? '' : subParam;
        setForm({
          subdomain: subdomain,
          protocol: data.https ? 'https' : 'http',
          destination: data.destination || '',
          cacheSize: data.cacheSize ? String(data.cacheSize / 1000000): '',
          fileTypes: data.fileTypes,
          ttl: ms(data.ttl),
          replacementPolicy: data.replacementPolicy,
          authMethod: data.authMethod,
          apiKeys,
          users,
        });
      } catch (err) {
        console.error(err);
        toast.error('Error fetching subdomain');
      } finally {
        setLoading(false);
      }
    })();
  }, [domain, subParam, isEdit]);
  
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Tamaño de cache: debe ser un número positivo 
    if (!/^\d+(\.\d+)?$/.test(form.cacheSize)) {
      return toast.error('Cache Size debe ser un número positivo (MB).');
    }
    const mb = parseFloat(form.cacheSize);
    if (mb <= 0) {
      return toast.error('Cache Size debe ser mayor que 0.');
    }
    const cacheBytes = mb * 1000000;

    // TTL debe ser parseable por ms
    const ttlMs = ms(form.ttl);
    if (typeof ttlMs !== 'number' || ttlMs <= 0) {
      return toast.error('TTL inválido; use un formato como "5m", "1h".');
    }

    if (!form.fileTypes.length) {
      return toast.error('Seleccione al menos un tipo de archivo para cachear.');
    }

    // Politica de reemplazo
    if (!form.replacementPolicy) {
      return toast.error('Seleccione una política de reemplazo.');
    }

    if (!form.authMethod) {
      return toast.error('Seleccione un método de autenticación.');
    }

    if (form.authMethod === 'api-keys') {
      const names = form.apiKeys.map(k => k.name.trim());
      if (names.some(n => !n)) {
        return toast.error('Todos los nombres de API Key deben estar completos.');
      }
      const dupName = names.find((n, i, arr) => arr.indexOf(n) !== i);
      if (dupName) {
        return toast.error(`Nombre de API Key duplicado detectado: "${dupName}".`);
      }
    }

    if (form.authMethod === 'user-password') {
      const users = form.users.map(u => u.username.trim());
      const pwds = form.users.map(u => u.password);
      if (users.some(u => !u) || pwds.some(p => !p)) {
        return toast.error('Todos los usuarios y contraseñas deben estar completos.');
      }
      if (pwds.some(p => p.length < 6)) {
        return toast.error('Cada contraseña debe tener al menos 6 caracteres.');
      }
      const dupUser = users.find((u, i, arr) => arr.indexOf(u) !== i);
      if (dupUser) {
        return toast.error(`Usuario duplicado detectado: "${dupUser}".`);
      }
    }

    
    setSaving(true);
    try {
      let existingKeysMap = {};
      let newKeyNames = [];
      let existingUsersMap = {};
      let newUsersMap = {};

      if (form.authMethod === 'api-keys') {
        existingKeysMap = form.apiKeys.filter(k => k.isExisting).reduce((m, { key, name }) => {
          m[key] = name.trim();
          return m;
        }, {});
        newKeyNames = form.apiKeys.filter(k => !k.isExisting && k.name.trim() !== '').map(k => k.name.trim());
      } else if (form.authMethod === 'user-password') {
        existingUsersMap = form.users.filter(u => u.isExisting && !u.resetting).reduce((m, { username, password }) => {
          m[username] = password;
          return m;
        }, {});
        newUsersMap = form.users.filter(u => (!u.isExisting && u.username.trim() && u.password.trim()) || (u.isExisting && u.resetting && u.password.trim())).reduce((m, { username, password }) => {
            m[username] = password;
            return m;
          }, {});
      }

      const payload = {
        subdomain: form.subdomain,
        https: form.protocol === 'https',
        destination: form.destination,
        cacheSize: cacheBytes,
        ttl: ttlMs,
        fileTypes: form.fileTypes,
        replacementPolicy: form.replacementPolicy,
        authMethod: form.authMethod,
        apiKeys: existingKeysMap,
        newApiKeys: newKeyNames,
        users: existingUsersMap,
        newUsers: newUsersMap,
      };
      
      const result = isEdit ? await updateSubdomain(domain, subParam, payload): await createSubdomain(domain, payload);

      if (result.success) {
        console.log('Subdomain operation successful:', result.data);
        if (result.data?.createdApiKeys) {
          setCreatedKeys(result.data.createdApiKeys);
          setShowCreatedModal(true);
        } else {
          toast.success(result.message);
          navigate(`/domains/${domain}/subdomains`);
        }
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? 'Error al actualizar subdominio.' : 'Error al crear subdominio.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-b-2 border-secondary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-lightgrey1 text-secondary max-w-xl mx-auto mt-10 p-6 rounded-2xl shadow-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 p-2 hover:bg-lightgrey2 rounded-full transition-colors cursor-pointer"
      >
        <ArrowLeft size={24} />
      </button>

      <h2 className="text-2xl font-bold mb-6">
        {isEdit ? `Editar Subdominio ${subParam === '_root_' ? domain : `${subParam}.${domain}`}` : `Agregar Subdominio a ${domain}`}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Base inputs */}
        <div>
          <label>Subdominio</label>
          <input
            name="subdomain"
            value={form.subdomain}
            onChange={handleChange}
            disabled={isEdit}
            className="w-full p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block mb-1 font-medium">Destino (URL o IP)</label>
          <div className="flex items-center gap-2">
            <select
              name="protocol"
              value={form.protocol}
              onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))}
              className="p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="http">http://</option>
              <option value="https">https://</option>
            </select>
            <input
              name="destination"
              value={form.destination}
              onChange={handleChange}
              required
              placeholder="ej. ejemplo.com o 192.168.0.1"
              className="flex-1 p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Cache and TTL inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Cache Size (MB)</label>
            <input
              name="cacheSize"
              type="number"
              value={form.cacheSize}
              onChange={handleChange}
              className="w-full p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label>TTL (ej. "5m", "1h", "30s")</label>
            <input
              name="ttl"
              value={form.ttl}
              onChange={handleChange}
              className="w-full p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* MIME types selector */}
        <div>
          <label className="block mb-1 font-medium">Tipos de archivo a cachear</label>
          <select
            name="fileTypes"
            multiple
            value={form.fileTypes}
            onChange={e => {
              const selected = Array.from(e.target.selectedOptions, opt => opt.value);
              setForm(prev => ({ ...prev, fileTypes: selected }));
            }}
            className="w-full h-32 p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {mimeTypes.map(mt => (
              <option key={mt} value={mt}>{mt}</option>
            ))}
          </select>
          <p className="text-sm text-lightgrey mt-1">
            Mantén presionada la tecla Ctrl (o Cmd) para seleccionar múltiples.
          </p>
        </div>

        {/* Replacement policy */}
        <div>
          <label>Política de reemplazo</label>
          <select
            name="replacementPolicy"
            value={form.replacementPolicy}
            onChange={handleChange}
            className="w-full p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
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
            className="w-full p-2 border border-lightgrey rounded-md text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
            </option>
            <option value="api-keys">API Keys</option>
            <option value="user-password">Usuario/Contraseña</option>
            <option value="none">Ninguno</option>
          </select>
        </div>

        {/* API keys or users */}
        {form.authMethod === 'api-keys' && (
          <div>
            {form.apiKeys.map(item => (
              <div key={item.id} className="flex gap-4 items-center mb-2">
                <input
                  type="text"
                  value={item.name}
                  placeholder="Nombre de la Key"
                  className="flex-1 p-2 border border-lightgrey rounded-md text-secondary"
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      apiKeys: f.apiKeys.map(k =>
                        k.id === item.id ? { ...k, name: e.target.value } : k
                      ),
                    }))
                  }
                  readOnly={item.isExisting}
                  disabled={item.isExisting}
                />
                <button
                  type="button"
                  onClick={() => deleteApiKey(item.id)}
                  className="p-2 text-warning hover:text-secondary transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button 
              type="button" 
              onClick={addApiKey} 
              className="text-primary hover:text-secondary transition-colors cursor-pointer"
            >
              + Agregar otra API Key
            </button>
          </div>
        )}

        {form.authMethod === 'user-password' && (
          <div>
            <label>Usuarios</label>
            {form.users.map(item => (
              <div key={item.id} className="flex gap-4 items-center mb-2">
                <input
                  type="text"
                  defaultValue={item.username}
                  placeholder="Usuario"
                  className="flex-1 p-2 border rounded"
                  onBlur={e => {
                    const username = e.target.value.trim();
                    setForm(f => ({
                      ...f,
                      users: f.users.map(u =>
                        u.id === item.id ? { ...u, username } : u
                      ),
                    }));
                  }}
                  readOnly={item.isExisting}
                  disabled={item.isExisting}
                />
                  {item.isExisting ? (
                    item.resetting ? (
                      <input
                        type="text"
                        value={item.password}
                        placeholder="Nueva contraseña"
                        className="flex-1 p-2 border rounded"
                        onChange={e => {
                          const password = e.target.value;
                          setForm(f => ({
                            ...f,
                            users: f.users.map(u =>
                              u.id === item.id ? { ...u, password } : u
                            ),
                          }));
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setForm(f => ({
                            ...f,
                            users: f.users.map(u =>
                              u.id === item.id
                                ? { ...u, resetting: true, password: '' }
                                : u
                            ),
                          }))
                        }
                        className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 cursor-pointer transition-colors"
                      >
                        Reset password
                      </button>
                    )
                  ) : (
                    <input
                      type="text"
                      value={item.password}
                      placeholder="Contraseña"
                      className="flex-1 p-2 border rounded"
                      onChange={e => {
                        const password = e.target.value;
                        setForm(f => ({
                          ...f,
                          users: f.users.map(u =>
                            u.id === item.id ? { ...u, password } : u
                          ),
                        }));
                      }}
                    />
                  )}
                <button
                  type="button"
                  onClick={() => deleteUser(item.id)}
                  className="p-2 text-red-600 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addUser} className="text-blue-600 cursor-pointer">
              + Agregar otro usuario
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-lightgrey rounded-md hover:bg-lightgrey2 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-primary text-light rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors cursor-pointer"
          >
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
      <CreatedApiKeysModal
        isOpen={showCreatedModal}
        createdKeys={createdKeys}
        domain={domain}
        onClose={() => setShowCreatedModal(false)}
      />
    </div>
  );
}
