import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { loginSubdomain } from "../services/auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function LoginSubdomain({ subdomain, authMethod }) {
  const navigate = useNavigate();
  const [subdomainUrl, setSubdomainUrl] = useState(null);
  // Redirect if no subdomain or authMethod
  useEffect(() => {
    if (!subdomain || !authMethod) {
      navigate("/");
      return;
    }
    const subdomainURL = new URL(subdomain);
    setSubdomainUrl(subdomainURL);
  }, [subdomain, authMethod, navigate]);

  // Create schema based on authMethod
  const schema =
    authMethod === "api-keys"
      ? z.object({
          apiKey: z.string().min(1, "La API Key es requerida"),
        })
      : z.object({
          username: z.string().min(4, "El nombre de usuario es requerido"),
          password: z
            .string()
            .min(6, "La contraseña debe tener al menos 6 caracteres."),
        });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    console.log("Datos de inicio de sesión:", data);

    try {
      data.subdomain = subdomain;
      const result = await loginSubdomain(data, authMethod);
      if (!result.success) {
        alert(result.message);
      }
    } catch (error) {
      console.log(error);
      console.error("Error de red al iniciar sesión:", error);
      alert("Error de red al iniciar sesión");
    }
    reset();
    console.log("Formulario reiniciado después del envío");
  };

  return (
    <div className="flex items-top justify-center px-4 sm:px-6 lg:px-8 pt-12">
      {subdomainUrl && (
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary">
              Iniciar sesión en {subdomainUrl.hostname}
            </h2>
          </div>

          <form className="mt-8" onSubmit={handleSubmit(onSubmit)}>
            {authMethod === "user-password" && (
              <div className="rounded-md shadow-sm -space-y-px">
                <div className="mb-4">
                  <input
                    {...register("username")}
                    type="text"
                    placeholder="Nombre de usuario"
                    className={`appearance-none rounded-t-md relative block w-full px-3 py-2 border ${
                      errors.username ? "border-warning" : "border-lightgrey2"
                    } placeholder-lightgrey text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
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
                    type="password"
                    placeholder="Contraseña"
                    className={`appearance-none rounded-b-md relative block w-full px-3 py-2 border ${
                      errors.password ? "border-warning" : "border-lightgrey2"
                    } placeholder-lightgrey text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                  />
                  {errors.password && (
                    <p className="text-warning text-xs mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>
            )}
            {authMethod === "api-keys" && (
              <div className="rounded-md shadow-sm -space-y-px">
                <div className="mb-4">
                  <input
                    {...register("apiKey")}
                    type="text"
                    placeholder="API Key"
                    className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                      errors.apiKey ? "border-warning" : "border-lightgrey2"
                    } placeholder-lightgrey text-secondary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                  />
                  {errors.apiKey && (
                    <p className="text-warning text-xs mt-1">
                      {errors.apiKey.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-lightgrey2 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-secondary"
                >
                  Recordarme
                </label>
              </div>

              <Link
                to="/change-password"
                className="text-sm text-primary hover:text-secondary transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-light bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Iniciar sesión
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default LoginSubdomain;
