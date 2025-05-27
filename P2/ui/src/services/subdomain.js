// src/services/subdomains.js
import { api } from "./api";

export const createSubdomain = async (domain, subdomainData) => {
  try {
    console.log("Creating subdomain:", domain, subdomainData);
    if (!subdomainData.subdomain) {
      throw new Error("El campo 'subdomain' es requerido.");
    }

    const payload = {
      domain,
      ...subdomainData,
    };

    const response = await api.post(
      "/subdomain/register",
      payload,
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
    const response = await api.get("/subdomain/subdomains", {
      params: { domain },
      withCredentials: true,
    });

    if (response.status === 200 && typeof response.data === "object") {
      return response.data; 
    }
    console.error("Unexpected response:", response.status, response.data);
    return {};
  } catch (error) {
    console.error("Error fetching subdomains:", error);
    return {};
  }
};

export const getSubdomainByName = async (domain, subdomainName) => {
  try {
    const response = await api.get(
      `/subdomain/${domain}/${subdomainName}`,
      { withCredentials: true }
    );

    if (response.status === 200) {
      console.log("Subdomain data:", response.data);  
      return response.data;
    } else {
      throw new Error(
        response.data?.message || "Error fetching subdomain data"
      );
    }
  } catch (error) {
    console.error("Error in getSubdomainByName:", error);
    throw error;
  }
};

export const updateSubdomain = async (domain, subdomainName, updateData) => {
  try {
    console.log("Updating subdomain:", domain, subdomainName, updateData);
    const payload = {
      ...updateData,
      domain,
      subdomain: subdomainName,
    };

    const response = await api.put(
      `/subdomain/${domain}/${subdomainName}`,
      payload,
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
      {
        withCredentials: true
      }
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
