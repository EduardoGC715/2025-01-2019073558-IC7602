import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_HOST;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-key": import.meta.env.VITE_API_KEY,
    "x-app-id": import.meta.env.VITE_APP_ID,
  },
  withCredentials: true,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("token");
  }
};

// Obtener el token de autenticación desde las cookies
// https://www.regex-tutorial.com/getCookieWithRegex.html
export const getAuthToken = () => {
  const cookies = document.cookie;
  const match = cookies.match(/(?:^|;\s*)token=([^;]*)/);

  if (match) {
    const token = decodeURIComponent(match[1]);
    return token;
  }
  return null;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      const requestUrl = error.config.url;
      console.error("Token expirado o inválido");
      if (!requestUrl.includes("/auth/login/subdomain")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// DNS Records API
export const dnsApi = {
  // Toma todos los DNS records
  getAllRecords: async () => {
    try {
      const { status, data } = await api.get("/all-domains");
      console.log("getAllRecords response:", { status, data });
      if (status === 200) {
        return data;
      } else {
        console.warn(`Unexpected status ${status} when fetching domains`);
        return [];
      }
    } catch (error) {
      console.error("Error fetching domains:", error);
      return [];
    }
  },

  checkHealth: async (domain, direction) => {
    try {
      // Asegura que el dominio empiece con "www."
      const fullDomain = domain.startsWith("www.") ? domain : `www.${domain}`;

      const response = await api.get("/exists", {
        params: {
          domain: fullDomain,
          ip: direction,
        },
      });
      console.log("Response:", response);
      if (response.status === 200) {
        return {
          health: true,
          message: `Dirección obtenida: ${response.data}`,
        };
      } else if (response.status === 500) {
        return {
          health: false,
          message: "Estado de salud: Error 500",
        };
      } else {
        return {
          health: false,
          message: `Error HTTP: ${response.status}`,
        };
      }
    } catch (error) {
      console.error("Error checking DNS health:", error);

      return {
        health: false,
        message:
          error.response?.data?.error ||
          error.message ||
          "Error al verificar el estado",
      };
    }
  },

  // Revisa conexión con el backend
  checkApiStatus: async () => {
    const response = await api.get("/status");

    if (response.status === 200) {
      return {
        message: true,
      };
    } else {
      return {
        message: false,
      };
    }
  },

  checkFirebaseStatus: async () => {
    const response = await api.get("/firebase-status");

    if (response.status === 200) {
      return {
        message: true,
      };
    } else {
      return {
        message: false,
      };
    }
  },

  // Actualiza en la base de datos los registros
  createDNSRecord: async (recordData) => {
    try {
      const response = await api.post("/domains", recordData);
      return {
        success: response.status === 201,
        data: response.data,
        message: response.data.message || "Registro creado exitosamente",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || "Error al crear el registro",
      };
    }
  },

  // Elimina un registro
  deleteDNSRecord: async (record) => {
    try {
      const response = await api.delete("/domains", {
        data: record,
      });
      return {
        success: response.status === 200,
        message: "Registro eliminado exitosamente",
      };
    } catch (error) {
      console.error("Error al eliminar el registro DNS:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Error al eliminar el registro",
      };
    }
  },

  // Edita un registro
  editDNSRecord: async (recordData) => {
    try {
      const response = await api.put("/domains", recordData);

      if (response.status === 201) {
        return {
          success: true,
          data: response.data,
          message: "Registro actualizado exitosamente",
        };
      } else {
        return {
          success: false,
          message: response.data?.error || "Error al actualizar el registro",
        };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.error || "Error al actualizar el registro",
      };
    }
  },
};
