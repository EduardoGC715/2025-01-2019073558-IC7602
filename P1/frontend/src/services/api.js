import axios from 'axios';
import { EmojiKiss } from 'react-bootstrap-icons';
import { responsivePropType } from 'react-bootstrap/esm/createUtilityClasses';

const API_BASE_URL = 'https://127.0.0.1:5000/api'; // Adjust this to your actual backend URL

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
    }
};


// IP to Country Database API
export const databaseApi = {
  getAllIPToCountryRecords: async () => {
    try {
      const response = await api.get('/ip-to-country/all');
      if (response.status === 200) {
        return response.data; // Array of { id, start_ip, end_ip, country_name, … }
      } else {
        console.warn('Unexpected response from IPToCountry API:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching IPToCountry records:', error);
      return [];
    }
  },
  getCountryByIp: async (ip) => {
    try {
      const response = await api.get('/ip-to-country', {
        params: { ip }
      });

      if (response.status === 200) {
        return response.data; 
      } else {
        console.warn('Unexpected status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching country for IP:', error);
      return null;
    }
  },
  createIPToCountryRecord: async (rec) => {
    try {
      const response = await api.post('/ip-to-country', rec);
      if (response.status === 201) {
        return response.data;    
      } else {
        // handle 4xx/5xx with conflict
        return {
          error:    response.data.error   || 'Unknown error',
          conflict: response.data.conflict || null
        };
      }
    } catch (error) {
      const data = error.response?.data || {};
      console.error('[createIPToCountry] failed:', data);
      return {
        error:    data.error    || error.message,
        conflict: data.conflict || null
      };
    }
  },
  updateIPToCountryRecord: async (rec) => {
    try {
      const { data } = await api.put('/ip-to-country', rec);
      if (data.record) return data;
      throw new Error(data.error);
    } catch (error) {
      const data = error.response?.data || {};
      console.error('[updateIPToCountryRecord] failed:', data);
      return {
        error:    data.error    || error.message,
        conflict: data.conflict || null,
        trace:    data.trace    || null
      };
    }
  },
  deleteIPToCountryRecord: async (id) => {
    try {
      const response = await api.delete('/ip-to-country', {
        data: { id }
      });
      return response.data;
    } catch (error) {
      console.error('[deleteIPToCountryRecord] id:', id, 'response:', error.response?.data);
      console.error('[deleteIPToCountryRecord] response.data:', error.response?.data);
      return {
        error: error.response?.data?.error || error.message
      };
    }
  }  
}; 