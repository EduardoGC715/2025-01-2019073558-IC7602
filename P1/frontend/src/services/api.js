import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Adjust this to your actual backend URL

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
      const response = await api.get('/dns-records');
      return response.data;
    } catch (error) {
      console.error('Error fetching DNS records:', error);
      throw error;
    }
  },

  // Add new DNS record
  addRecord: async (record) => {
    try {
      const response = await api.post('/dns-records', record);
      return response.data;
    } catch (error) {
      console.error('Error adding DNS record:', error);
      throw error;
    }
  },

  // Update DNS record
  updateRecord: async (id, record) => {
    try {
      const response = await api.put(`/dns-records/${id}`, record);
      return response.data;
    } catch (error) {
      console.error('Error updating DNS record:', error);
      throw error;
    }
  },

  // Delete DNS record
  deleteRecord: async (id) => {
    try {
      const response = await api.delete(`/dns-records/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting DNS record:', error);
      throw error;
    }
  },

  checkHealth: async (domain, direction) => {
    try {
      const response = await api.get('/exists', {
        params: {
          domain: domain,
          ip_address: direction
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
  
      // Si ocurre un error en la llamada, lo marcamos como error
      return {
        health: false,
        message: error.response?.data?.error || error.message || 'Error al verificar el estado'
      };
    }
  }
  
};

// System Status API
export const systemApi = {
  // Get system health status
  getHealthStatus: async () => {
    try {
      const response = await api.get('/system/health');
      return response.data;
    } catch (error) {
      console.error('Error fetching system health:', error);
      throw error;
    }
  },
};

// IP to Country Database API
export const databaseApi = {
  // Get database status
  getStatus: async () => {
    try {
      const response = await api.get('/database/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching database status:', error);
      throw error;
    }
  },

  // Update database
  updateDatabase: async () => {
    try {
      const response = await api.post('/database/update');
      return response.data;
    } catch (error) {
      console.error('Error updating database:', error);
      throw error;
    }
  },

  // Download CSV
  downloadCSV: async () => {
    try {
      const response = await api.get('/database/download', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading CSV:', error);
      throw error;
    }
  },

  // Import CSV
  importCSV: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/database/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  },
}; 