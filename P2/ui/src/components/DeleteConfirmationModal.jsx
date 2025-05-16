import React from 'react';

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, domain }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Confirmar Eliminación</h3>
        <p className="mb-6">
          ¿Estás seguro que deseas eliminar el dominio <span className="font-semibold">{domain}</span>?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-warning text-white rounded-md hover:bg-warning/80"

          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;