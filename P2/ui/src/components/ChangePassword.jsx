import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../services/auth";

const schema = z.object({
  username: z.string().min(4, "El nombre de usuario es requerido"),
  newPassword: z
    .string()
    .min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmNewPassword"],
});

export default function ChangePassword({ title = "Recuperar Contraseña" }) {
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
      const { confirmNewPassword, ...changePasswordData } = data;
      const result = await changePassword(changePasswordData);
      if (result.success) {
        alert("Contraseña cambiada exitosamente");
        navigate("/dashboard");
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error al cambiar la contraseña");
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
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.username ? "border-warning" : "border-lightgrey2"
                } placeholder-lightgrey text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
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
                {...register("newPassword")}
                id="newPassword"
                type="password"
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.newPassword ? "border-warning" : "border-lightgrey2"
                } placeholder-lightgrey text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Nueva contraseña"
              />
              {errors.newPassword && (
                <p className="text-warning text-xs mt-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <input
                {...register("confirmNewPassword")}
                id="confirmNewPassword"
                type="password"
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.confirmNewPassword ? "border-warning" : "border-lightgrey2"
                } placeholder-lightgrey text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Confirmar nueva contraseña"
              />
              {errors.confirmNewPassword && (
                <p className="text-warning text-xs mt-1">
                  {errors.confirmNewPassword.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-light bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
            >
             Cambio de contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}