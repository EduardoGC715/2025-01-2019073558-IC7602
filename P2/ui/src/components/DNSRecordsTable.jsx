import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";


const DNSRecordsTable = ({ records, onDeleteRecord }) => {
  const schema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    type: z.enum(["A", "CNAME", "MX", "TXT"], {
      errorMap: () => ({ message: "Tipo inválido" }),
    }),
    value: z.string().min(1, "El valor es requerido"),
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
    console.log("Datos del nuevo registro:", data);
    // Aquí puedes agregar la lógica para enviar los datos al servidor
    reset(); // limpia el formulario
  };

return (
    <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-secundary">
          Registros DNS
        </h2>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <input
                {...register("name")}
                type="text"
                placeholder="Nombre del registro"
                className={`appearance-none rounded-t-md relative block w-full px-3 py-2 border ${
                  errors.name ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secundary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
              />
              {errors.name && (
                <p className="text-warning text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="mb-4">
              <select
                {...register("type")}
                className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
                  errors.type ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secundary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
              >
                <option value="">Selecciona un tipo</option>
                <option value="A">A</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
              </select>
              {errors.type && (
                <p className="text-warning text-xs mt-1">{errors.type.message}</p>
              )}
            </div>
            <div className="mb-4">
              <input
                {...register("value")}
                type="text"
                placeholder="Valor del registro"
                className={`appearance-none rounded-b-md relative block w-full px-3 py-2 border ${
                  errors.value ? "border-warning" : "border-gray-300"
                } placeholder-gray-500 text-secundary focus:outline-none focus:ring-primary/80 focus:border-primary/80 focus:z-10 sm:text-sm`}
              />
              {errors.value && (
                <p className="text-warning text-xs mt-1">{errors.value.message}</p>
              )}
              </div>
            </div>
        </form>
    </div>
</div>
  );
}