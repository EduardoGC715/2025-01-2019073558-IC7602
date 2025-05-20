import { api } from "./api";

export const registerDomain = async (domain) => {
  try {
    const response = await api.post("/domain/register", domain, {
      withCredentials: true,
    });
    console.log("Response:", response);
    if (response.status == 201) {
      return {
        success: true,
        data: response.data,
        message: "Dominio registrado exitosamente",
      };
    }
    return {
      success: false,
      message: response.data?.message || "Error al registrar dominio",
    };
  } catch (error) {
    console.error(`"Error al registrar dominio: ${error}`);
    return {
      success: false,
      message: error.response?.data?.message || "Error al registrar dominio",
    };
  }
};
