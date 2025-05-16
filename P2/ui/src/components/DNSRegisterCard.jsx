import React from 'react';
import { useForm } from 'react-hook-form';

function DNSRegisterCard() {
    const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => {
    console.log('Form Data:', data);
  };

  return (
      <div className="bg-primary text-light max-w-md mx-auto mt-10 p-6 rounded-2xl ">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
           {/* Dominio*/} 
           <div className="mb-4">
            <label className="block mb-1 font-medium bg-light text-secondary">Dominio</label>



           </div>

        </form>
      </div>

  );
}

export default DNSRegisterCard;
