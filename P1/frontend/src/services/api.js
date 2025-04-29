import axios from "axios";

// Sin docker
// const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Con docker
const API_BASE_URL = `https://${process.env.REACT_APP_DNS_API}:${process.env.REACT_APP_DNS_API_PORT}/api`;
console.log("API_BASE_URL:", API_BASE_URL); // para verificar
// console.log(API_BASE_URL); // para verificar

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// DNS Records API
export const dnsApi = {
  // Get all DNS records
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

// IP to Country Database API
export const databaseApi = {
  getAllIPToCountryRecords: async () => {
    try {
      const response = await api.get("/ip-to-country/all");
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn(
          "Unexpected response from IPToCountry API:",
          response.status
        );
        return [];
      }
    } catch (error) {
      console.error("Error fetching IPToCountry records:", error);
      return [];
    }
  },
  getCountryByIp: async (ip) => {
    try {
      const response = await api.get("/ip-to-country", {
        params: { ip },
      });

      if (response.status === 200) {
        return response.data;
      } else {
        console.warn("Unexpected status:", response.status);
        return null;
      }
    } catch (error) {
      console.error("Error fetching country for IP:", error);
      return null;
    }
  },
  createIPToCountryRecord: async (rec) => {
    try {
      const response = await api.post("/ip-to-country", rec);
      if (response.status === 201) {
        return response.data;
      } else {
        // handle 4xx/5xx with conflict
        return {
          error: response.data.error || "Unknown error",
          conflict: response.data.conflict || null,
        };
      }
    } catch (error) {
      const data = error.response?.data || {};
      console.error("[createIPToCountry] failed:", data);
      return {
        error: data.error || error.message,
        conflict: data.conflict || null,
      };
    }
  },
  updateIPToCountryRecord: async (rec) => {
    try {
      const { data } = await api.put("/ip-to-country", rec);
      if (data.record) return data;
      throw new Error(data.error);
    } catch (error) {
      const data = error.response?.data || {};
      console.error("[updateIPToCountryRecord] failed:", data);
      return {
        error: data.error || error.message,
        conflict: data.conflict || null,
        trace: data.trace || null,
      };
    }
  },
  deleteIPToCountryRecord: async (id) => {
    try {
      const response = await api.delete("/ip-to-country", {
        data: { id },
      });
      return response.data;
    } catch (error) {
      console.error(
        "[deleteIPToCountryRecord] id:",
        id,
        "response:",
        error.response?.data
      );
      console.error(
        "[deleteIPToCountryRecord] response.data:",
        error.response?.data
      );
      return {
        error: error.response?.data?.error || error.message,
      };
    }
  },
  checkCountry: async (country) => {
    try {
      const response = await api.get("/countries", {
        params: { country_code: country },
      });

      if (response.status === 200) {
        return response.data.exists; // true o false
      } else {
        console.warn("Unexpected status:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Error fetching country:", error);
      return false;
    }
  },
};
