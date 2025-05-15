import axios from "axios";

// Sin docker
const API_BASE_URL = 'https://127.0.0.1:5000/api';

// Con docker
// const API_BASE_URL = `https://${process.env.REACT_APP_DNS_API}:${process.env.REACT_APP_DNS_API_PORT}/api`;
// console.log("API_BASE_URL:", API_BASE_URL); // para verificar

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
