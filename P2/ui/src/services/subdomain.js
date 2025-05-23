// src/services/subdomains.js
import { api } from "./api";

export const createSubdomain = async (domain, subdomainData) => {
  try {
    const response = await api.post(
      "/subdomain/register",
      { domain, ...subdomainData },
      { withCredentials: true }
    );

    if (response.status === 201) {
      return {
        success: true,
        data: response.data,
        message: "Subdominio registrado exitosamente",
      };
    }

    return {
      success: false,
      message: response.data?.message || "Error al registrar subdominio",
    };
  } catch (error) {
    console.error("Error al registrar subdominio:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Error de conexión al registrar subdominio",
    };
  }
};

export const getSubdomainsByDomain = async (domain) => {
  try {
    const response = await api.get(`/subdomain/all/${domain}`, {
      withCredentials: true,
    });

    if (response.status === 200 && Array.isArray(response.data.subdomains)) {
      return response.data.subdomains;
    } else {
      console.error(
        "Unexpected response fetching subdomains:",
        response.status,
        response.data
      );
      return [];
    }
  } catch (error) {
    console.error("Error al obtener subdominios:", error);
    return [];
  }
};

export const updateSubdomain = async (domain, subdomainName, updateData) => {
  try {
    const response = await api.put(
      `/subdomain/${domain}/${subdomainName}`,
      updateData,
      { withCredentials: true }
    );

    if (response.status === 200) {
      return {
        success: true,
        data: response.data,
        message: "Subdominio actualizado exitosamente",
      };
    }

    return {
      success: false,
      message: response.data?.message || "Error al actualizar subdominio",
    };
  } catch (error) {
    console.error("Error al actualizar subdominio:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Error de conexión al actualizar subdominio",
    };
  }
};

export const deleteSubdomain = async (domain, subdomainName) => {
  try {
    const response = await api.delete(
      `/subdomain/${domain}/${subdomainName}`,
      { withCredentials: true }
    );

    if (response.status === 200) {
      return {
        success: true,
        message: "Subdominio eliminado exitosamente",
      };
    }

    return {
      success: false,
      message: response.data?.message || "Error al eliminar subdominio",
    };
  } catch (error) {
    console.error("Error al eliminar subdominio:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Error de conexión al eliminar subdominio",
    };
  }
};
