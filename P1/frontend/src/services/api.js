import axios from 'axios';

// Sin docker
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Con docker
// const API_BASE_URL = `http://${process.env.REACT_APP_DNS_API}:${process.env.REACT_APP_DNS_API_PORT}/api`;

// console.log(API_BASE_URL); // para verificar


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// DNS Records API
export const dnsApi = {
  // Get all DNS records
  getAllRecords: async () => {
    try {
      const response = await api.get('/all-domains');
      if (response.status === 200) {
        console.log(response.data[0])
        console.log(response.data[1])
        console.log(response.data)
        return response.data; // [{ id, domain, type, direction, status }]
      } else {
        console.warn('Respuesta inesperada al obtener dominios:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error al cargar dominios:', error);
      return [];
    }
  },

  checkHealth: async (domain, direction) => {
    try {
      // Asegura que el dominio empiece con "www."
      const fullDomain = domain.startsWith("www.") ? domain : `www.${domain}`;
  
      const response = await api.get('/exists', {
        params: {
          domain: fullDomain,
          ip: direction
        }
      });
  
      if (response.status === 200) {
        return {
          health: true,
          message: `Dirección obtenida: ${response.data}`
        };
      } else if (response.status === 500) {
        return {
          health: false,
          message: 'Estado de salud: Error 500'
        };
      } else {
        return {
          health: false,
          message: `Error HTTP: ${response.status}`
        };
      }
    } catch (error) {
      console.error('Error checking DNS health:', error);
  
      return {
        health: false,
        message: error.response?.data?.error || error.message || 'Error al verificar el estado'
      };
    }
  },

  checkApiStatus : async () =>
  {
    const response = await api.get('/status');

    if (response.status === 200) {
      return {
        message: true
      };
    }
      else {
        return {
          message: false
        };  
    }
  },

  checkFirebaseStatus : async () =>
    {
      const response = await api.get('/firebase-status');
  
      if (response.status === 200) {
        return {  
          message: true
        };
      }
        else {
          return {
            message: false
          };  
      }
    },
  
  // Actualiza en la base de datos los registros
  createDNSRecord: async (recordData) => {
    try {
      const response = await api.post('/domains', recordData);
      return {
        success: response.status === 201,
        data: response.data,
        message: 'Registro creado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Error al crear el registro'
      };
    }
  },

  deleteDNSRecord: async (record) => {
    try {
      const response = await api.delete('/domains', {
        data: record
      });
      return {
        success: response.status === 200,
        message: 'Registro eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error al eliminar el registro DNS:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Error al eliminar el registro'
      };
    }
  }
};


// IP to Country Database API
export const databaseApi = {
  // Get database status
  
}; 