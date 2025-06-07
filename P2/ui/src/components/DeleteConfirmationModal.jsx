import React from 'react';

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, name, type }) {
  if (!isOpen) return null;

  const typeText = type === 'subdomain' ? 'subdominio' : 'dominio';

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-light rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirmar Eliminación</h3>
        <p className="mb-6">
          ¿Estás seguro que deseas eliminar el {typeText} <span className="font-semibold">{name}</span>?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-light text-gray-800 rounded-md hover:bg-light/80 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-warning text-white rounded-md hover:bg-warning/80 cursor-pointer"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;