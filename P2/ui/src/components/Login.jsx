import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function Login({ onLoginSuccess }) {
  const schema = z.object({
    email: z.string().email("Correo inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    console.log("Datos de inicio de sesión:", data);

    const mockUser = {
      name: "Usuario Demo",
      email: data.email,
    };

    onLoginSuccess(mockUser);
    reset(); // limpia el formulario
  };

  return (
    <div className="flex items-top justify-center px-4 sm:px-6 lg:px-8 pt-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary">
            Iniciar sesión
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <input
                {...register("email")}
                type="email"
                placeholder="Correo electrónico"
                className={`appearance-none rounded-t-md relative block w-full px-3 py-2 border ${
                  errors.email ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
              />
              {errors.email && (
                <p className="text-warning text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-4">
              <input
                {...register("password")}
                type="password"
                placeholder="Contraseña"
                className={`appearance-none rounded-b-md relative block w-full px-3 py-2 border ${
                  errors.password ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secondary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
              />
              {errors.password && (
                <p className="text-warning text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary/80 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-primary/80">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-light bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/80"
            >
              Iniciar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;