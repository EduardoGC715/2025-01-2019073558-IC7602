import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/auth";

// Validación con Zod
const schema = z
  .object({
    username: z.string().min(4, "El nombre de usuario es requerido"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export default function Register({ title = "Crear una cuenta" }) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...userData } = data;
      const result = await registerUser(userData);
      if (result.success) {
        navigate("/dashboard");
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error de red al registrar usuario");
    }
  };

  return (
    <div className="flex items-top justify-center px-4 sm:px-6 lg:px-8 pt-12">
      <div className="max-w-md w-full">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary">
            {title}
          </h2>
        </div>

        <form className="mt-8" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <input
                {...register("username")}
                id="username"
                type="text"
                autoComplete="username"
                className={`appearance-none rounded-t-md relative block w-full px-3 py-2 border ${
                  errors.username ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
                placeholder="Nombre de usuario"
              />
              {errors.username && (
                <p className="text-warning text-xs mt-1">
                  {errors.username.message}
                </p>
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
                <p className="text-warning text-xs mt-1">
                  {errors.password.message}
                </p>
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
                <p className="text-warning text-xs mt-1">
                  {errors.confirmPassword.message}
                </p>
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
