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
  } catch (error) {s
    console.error(`"Error al registrar dominio: ${error}`);
    return {
      success: false,
      message: error.response?.data?.message || "Error al registrar dominio",
    };
  }
};

export const getUserDomains = async () => {
  try {
    const response = await api.get("/domain/all", {
      withCredentials: true,
    });

    if (response.status === 200) {
      return {
        success: true,
        domains: response.data.domains || {},
        message: "Dominios obtenidos exitosamente",
      };
    }

    return {
      success: false,
      domains: {},
      message: response.data?.message || "Error al obtener dominios",
    };
  } catch (error) {
    console.error(`Error al obtener dominios:`, error);
    return {
      success: false,
      domains: {},
      message: "Error de conexión al servidor",
    };
  }
};

export const deleteDomain = async (domainName) => {
  console.log("Dominio a eliminar:", domainName);

  try {
    const response = await api.delete(`/domain/${domainName}`, {
      withCredentials: true,
    });

    if (response.status === 200) {
      return {
        success: true,
        message: "Dominio eliminado exitosamente",
      };
    }

    return {
      success: false,
      message: response.data?.message || "Error al eliminar dominio",
    };
  } catch (error) {
    console.error(`Error al eliminar dominio:`, error);
    return {
      success: false,
      message: error.response?.data?.message || "Error de conexión al servidor",
    };
  }
};

export const verifyDomainOwnership = async (domainName) => {
  console.log("========= INICIO DE VERIFICACIÓN =========");
  console.log("Dominio a verificar:", domainName);
  
  if (!domainName) {
    console.error("Error: Nombre de dominio no proporcionado");
    return {
      success: false,
      validated: false,
      message: "Nombre de dominio requerido"
    };
  }

  try {
    console.log(`Verificando dominio: ${domainName}`);
    const response = await api.get(`/domain/verify/${domainName}`, {
      withCredentials: true,
    });

    console.log(`Respuesta para ${domainName}:`, response.data);

    // Retornamos la respuesta con el nombre del dominio para identificación
    return {
      success: true,
      domainName: domainName,
      validated: response.data.validated,
      message: response.data.message,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Error verificando ${domainName}:`, {
      name: error.name,
      message: error.message,
      response: error.response?.data
    });
    
    return {
      success: false,
      domainName: domainName,
      validated: false,
      message: error.response?.data?.message || "Error de verificación",
      timestamp: new Date().toISOString()
    };
  }
};
