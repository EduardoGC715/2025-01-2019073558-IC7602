import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { registerDomain } from "../services/domain";
import { ArrowLeft } from "lucide-react";
import SuccessModal from "./SuccessModal";

// Zod schema for DNS domain validation
const schema = z.object({
  domain: z
    .string()
    .min(1, "El dominio es requerido")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
      "Ingrese un dominio de segundo nivel válido (ejemplo.com)"
    ),
});

function DNSRegisterCard() {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const formData = {
        domain: data.domain,
      };

      console.log("Datos enviados:", formData);
      const result = await registerDomain(formData);
      console.log("Resultado del registro:", result);

      if (result.success) {
        setValidationData(result.data.validation);
        setShowSuccessModal(true);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error de red al registrar dominio:", error);
      alert("Error de red al registrar dominio");
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate("/dashboard");
  };

  return (
    <>
      <div className="bg-lightgrey2 text-darkgrey max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6">Registro DNS</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dominio */}
          <div className="mb-4">
            <label className="block mb-2 font-medium">Nombre de Dominio</label>
            <input
              className="w-full p-2 border border-darkgrey rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
              {...register("domain")}
              placeholder="ejemplo.com"
            />
            {errors.domain && (
              <p className="text-warning text-sm mt-1">{errors.domain.message}</p>
            )}
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

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        validationData={validationData}
      />
    </>
  );
}

export default DNSRegisterCard;
