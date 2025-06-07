// src/components/CreatedApiKeysModal.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react'; 
import { toast } from 'react-toastify';

function CreatedApiKeysModal({ isOpen, createdKeys, domain, onClose }) {
  const navigate = useNavigate();

  if (!isOpen || !createdKeys) return null;

  const handleCopy = (rawKey) => {
    navigator.clipboard.writeText(rawKey).then(
      () => {
        toast.success("Llave copiada al portapapeles");
      },
      () => {
        
      }
    );
  };

  const handleClose = () => {
    onClose();
    navigate(`/domains/${domain}/subdomains`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h3 className="text-xl font-bold mb-4">Nuevas API Keys</h3>
        <p className="mb-4">
          Copia estas claves ahora; solo se muestran una vez:
        </p>
        <div className="space-y-2 max-h-60 overflow-auto">
          {Object.entries(createdKeys).map(([rawKey, name]) => (
            <div key={rawKey} className="border p-2 rounded bg-gray-50 flex flex-col gap-1">
              <div>
                <span className="font-medium">Nombre:</span> {name}
              </div>
              <div className="flex items-center justify-between mt-1">
                <code className="break-all">{rawKey}</code>
                <button
                  onClick={() => handleCopy(rawKey)}
                  className="p-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors cursor-pointer"
                  title="Copiar al portapapeles"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleClose}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default CreatedApiKeysModal;