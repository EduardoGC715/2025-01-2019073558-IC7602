// src/components/SubdomainsRecordsTable.jsx
import { Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { deleteSubdomain } from '../services/subdomain'; 

export default function SubdomainsRecordsTable({
  subdomains,
  onDelete
}) {
    const [authModal, setAuthModal] = useState({
      isOpen: false,
      type: '',
      items: [],
      revealed: false
    });
    const [deletionTarget, setDeletionTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    const openAuthModal = (type, items) => setAuthModal({ isOpen: true, type, items, revealed: false });
    
    const closeAuthModal = () => setAuthModal({ isOpen: false, type: '', items: [], revealed: false });
    
    const toggleReveal = () => setAuthModal(m => ({ ...m, revealed: !m.revealed }));

    const confirmDelete = async () => {
      if (!deletionTarget) return;

      setIsDeleting(true);

      const { domain, subdomain } = deletionTarget;
      const result = await deleteSubdomain(domain, subdomain);

      if (result.success) {
        alert(result.message);
        window.location.reload(); 
      } else {
        alert(result.message);
      }

      setIsDeleting(false);
      setDeletionTarget(null);
    };

  return (
    <>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-primary text-s uppercase text-darkgrey">
          <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Subdominio</th>
              <th className="px-4 py-2">Cache Size</th>
              <th className="px-4 py-2">Tipos</th>
              <th className="px-4 py-2">TTL</th>
              <th className="px-4 py-2">Política</th>
              <th className="px-4 py-2">Destino</th>
              <th className="px-4 py-2">Auth</th>
              <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {subdomains.map((rec, idx) => (
            <tr key={rec.subdomain} className="border-b hover:bg-lightgrey1">
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2">{rec.subdomain}</td>
              <td className="px-4 py-2">{rec.cacheSize}</td>
              <td className="px-4 py-2">{rec.fileTypes?.join(', ')}</td>
              <td className="px-4 py-2">{rec.ttl}</td>
              <td className="px-4 py-2">{rec.replacementPolicy}</td>
              <td className="px-4 py-2">{rec.destination}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => openAuthModal(
                    rec.authMethod,
                    rec.authMethod === 'api-keys' ? rec.apiKeys : rec.users
                  )}
                  className="text-blue-600 hover:underline"
                >
                  {rec.authMethod}
                </button>
              </td>
              <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => navigate(`/domains/${rec.domain}/subdomains/${rec.subdomain}`)} className="p-1 text-gray-600 hover:text-black" title="Editar">
                    <Edit2 className="text-indigo-600" size={16} />
                  </button>
                  <button   onClick={() => setDeletionTarget(rec)} className="p-1 text-red-600 hover:text-red-800" title="Eliminar">
                    <Trash2 className="text-red-600" size={16} />
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <AuthModal
      isOpen={authModal.isOpen}
      type={authModal.type}
      items={authModal.items}
      revealed={authModal.revealed}
      onToggleReveal={toggleReveal}
      onClose={closeAuthModal}
    />
    <DeleteConfirmationModal
      isOpen={!!deletionTarget}
      name={deletionTarget ? `${deletionTarget.subdomain}.${deletionTarget.domain}` : ''}
      type="subdomain"
      onClose={() => setDeletionTarget(null)}
      onConfirm={confirmDelete}
    />
    </>
);
}
