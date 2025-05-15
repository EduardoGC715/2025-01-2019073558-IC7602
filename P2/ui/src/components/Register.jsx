import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Esquema de validación con Zod
const schema = z
  .object({
    name: z.string().min(1, "El nombre es requerido"),
    email: z.string().email("Correo inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    console.log("Formulario enviado:", data);
  };

  return (
    <div className="flex items-top justify-center px-4 sm:px-6 lg:px-8 pt-12">
      <div className="max-w-md w-full">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary">
            Crear una cuenta
          </h2>
        </div>

        <form className="mt-8" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <input
                {...register("name")}
                id="name"
                type="text"
                autoComplete="name"
                className={`appearance-none rounded-t-md relative block w-full px-3 py-2 border ${
                  errors.name ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
                placeholder="Nombre completo"
              />
              {errors.name && (
                <p className="text-warning text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                {...register("email")}
                id="email"
                type="email"
                autoComplete="email"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
                placeholder="Correo electrónico"
              />
              {errors.email && (
                <p className="text-warning text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                {...register("password")}
                id="password"
                type="password"
                autoComplete="new-password"
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
                placeholder="Contraseña"
              />
              {errors.password && (
                <p className="text-warning text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                {...register("confirmPassword")}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`appearance-none rounded-b-md relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
                placeholder="Confirmar contraseña"
              />
              {errors.confirmPassword && (
                <p className="text-warning text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-light bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/80"
            >
              Registrarse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}