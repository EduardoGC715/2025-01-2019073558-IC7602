import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

function DNSRegisterCard() {
  const [ipAddresses, setIpAddresses] = useState(['']); // Estado para manejar múltiples IPs
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = (data) => {
    const formData = {
      ...data,
      ipAddresses: ipAddresses.filter(ip => ip !== '') // Filtra IPs vacías
    };
    console.log('Form Data:', formData);
  };

  const addIpField = () => {
    setIpAddresses([...ipAddresses, '']);
  };

  const removeIpField = (index) => {
    const newIpAddresses = ipAddresses.filter((_, i) => i !== index);
    setIpAddresses(newIpAddresses);
  };

  return (
    <div className="bg-lightgrey2 text-darkgrey max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Registro DNS</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Dominio */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Nombre de Dominio</label>
          <input
            className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('domain', { 
              required: 'El dominio es requerido',
              pattern: {
                value: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
                message: 'Ingrese un dominio válido'
              }
            })}
            placeholder="ejemplo.com"
          />
          {errors.domain && (
            <p className="text-warning text-sm mt-1">{errors.domain.message}</p>
          )}
        </div>

        {/* Direcciones IP */}
        <div className="space-y-4">
          <label className="block font-medium">Direcciones IP</label>
          {ipAddresses.map((_, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="flex-1 p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                {...register(`ip${index}`, {
                  pattern: {
                    value: /^(\d{1,3}\.){3}\d{1,3}$/,
                    message: 'Ingrese una IP válida'
                  }
                })}
                placeholder="192.168.1.1"
              />
              {ipAddresses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIpField(index)}
                  className="px-3 py-2 bg-warning text-light rounded-md hover:bg-red-600"
                >
                  -
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addIpField}
            className="px-4 py-2 bg-secondary text-light rounded-md hover:bg-black"
          >
            Añadir IP
          </button>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-secondary text-light rounded-md hover:bg-black transition-colors"
        >
          Registrar
        </button>
      </form>
    </div>
  );
}

export default DNSRegisterCard;