import React from 'react';

export default function AuthModal({
  isOpen,
  type,            
  items,           
  revealed,        
  onToggleReveal, 
  onClose
}) {
  if (!isOpen) return null;

  const title = type === 'api-keys' ? 'API Keys' : 'Usuarios y Contraseñas';

  const renderItem = (item) => {
    const [[field, value]] = Object.entries(item);
    if (!revealed) return '••••••••••';
    return type === 'api-keys' ? field : `${field}: ${value}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>

        {items.length === 0 ? (
          <p className="text-center text-gray-500 mb-4">No hay datos</p>
        ) : (
          <ul className="mb-4 max-h-40 overflow-auto font-mono">
            {items.map((it, i) => (
              <li
                key={i}
                className={`p-2 border-b ${
                  revealed ? 'text-black' : 'text-gray-400 select-none'
                }`}
              >
                {renderItem(it)}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          {items.length > 0 && (
            <button
              onClick={onToggleReveal}
              className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
            >
              {revealed ? 'Ocultar' : 'Revelar'}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
