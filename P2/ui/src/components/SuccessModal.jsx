import React from 'react';
import { Check, X } from 'lucide-react';

function SuccessModal({ isOpen, onClose, validationData }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-light bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-lightgrey rounded-lg max-w-md w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-full">
            <Check className="text-green-600" size={24} />
          </div>
          <h3 className="text-xl font-semibold">¡Registro Exitoso!</h3>
        </div>

        <div className="space-y-4">
          <p className="text-secondary">Tu dominio ha sido registrado exitosamente. Aquí están los detalles de validación:</p>
          
          <div className="bg-lightgrey p-4 rounded-lg">
            <div className="grid gap-2">
              <div>
                <span className="font-medium">Subdominio: </span>
                <span className="text-light">{validationData.subdomain}</span>
              </div>
              <div>
                <span className="font-medium">Token: </span>
                <span className="text-light">{validationData.token}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-light rounded-md hover:bg-black transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessModal;