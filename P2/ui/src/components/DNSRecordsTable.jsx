import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { dnsApi } from "../services/api";
import { getUserDomains, deleteDomain, verifyDomainOwnership } from "../services/domain";
import DeleteConfirmationModal from './DeleteConfirmationModal';

function DNSRecordsTable({ onEditRecord, onDeleteRecord }) {
  const [localDnsRecords, setLocalDnsRecords] = useState([]);
  const [domains, setDomains] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    record: null
  });
  const [expandedDomains, setExpandedDomains] = useState({});
  const navigate = useNavigate();
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { success, domains, message } = await getUserDomains();
        if (success) {
          setDomains(domains);
          setLocalDnsRecords([]);
        } else {
          console.error("Error fetching domains:", message);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteClick = (record) => {
    setDeleteModal({
      isOpen: true,
      record 
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.record) {
      setIsLoading(true);
      try {
        const result = await deleteDomain(deleteModal.record.domain);
        if (result.success) {
          await refreshDomains(); // Refresh the domains list after deletion
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error("Error deleting domain:", error);
        alert("Error al eliminar el dominio");
      } finally {
        setIsLoading(false);
        setDeleteModal({ isOpen: false, record: null });
      }
    }
  };

  const refreshDomains = async () => {
    setIsLoading(true);
    try {
      const { success, domains, message } = await getUserDomains();
      if (success) {
        // Verificar ownership para todos los dominios no validados
        const verificationResult = await verifyDomainOwnership();
        
        if (verificationResult.success) {
          const updatedDomains = { ...domains };
          
          // Actualizar el estado de validación de los dominios
          Object.entries(verificationResult.results).forEach(([domainName, result]) => {
            if (updatedDomains[domainName]) {
              updatedDomains[domainName].validated = result.verified;
            }
          });
          
          setDomains(updatedDomains);
        }
      } else {
        console.error("Error fetching domains:", message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsLoading(true);
    try {
      const result = await verifyDomainOwnership();
      
      if (result.success) {
        // Actualizar los dominios después de la verificación
        const { success: domainsSuccess, domains: newDomains } = await getUserDomains();
        if (domainsSuccess) {
          setDomains(newDomains);
        }
      } else {
        console.error(`Error en la verificación:`, result.message);
      }
    } catch (error) {
      console.error("Error en verificación:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDomainExpand = (domainName) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainName]: !prev[domainName]
    }));
  };

  return (
    <div className="w-full p-4">
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, record: null })}
        onConfirm={handleConfirmDelete}
        name={deleteModal.record?.domain}
        type="dominio"
      />
      <div className="bg-light shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-secondary">Registros DNS</h2>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-primary text-s uppercase text-light">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Dominio</th>
                    <th className="px-4 py-2">Subdominios</th>
                    <th className="px-4 py-2">Validación</th>
                    <th className="px-4 py-2">Ownership</th>
                    <th className="px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domains).map(([domainName, domainData], index) => (
                    <tr key={domainName} className="border-b hover:bg-lightgrey2 transition-colors duration-200">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 text-secondary">{domainName}</td>
                      <td className="px-4 py-2">
                        <button 
                          onClick={() => navigate(`/domains/${domainName}/subdomains`)}
                          className="text-accentBlue hover:text-secondary transition-colors duration-200"
                        >
                          Ver Subdominios
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-secondary">
                            {domainData.validation?.subdomain || 'N/A'}
                          </span>
                          <span className="text-xs text-lightgrey mt-1">
                            {domainData.validation?.token || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={domainData.validated ? "text-primary" : "text-warning"}>
                            {domainData.validated ? "true" : "false"}
                          </span>
                          <button
                            onClick={() => handleVerifyDomain(domainName)}
                            className="p-1 hover:bg-lightgrey2 rounded-full transition-colors duration-200"
                            disabled={isLoading}
                          >
                            <RefreshCw 
                              size={16} 
                              className={`${isLoading ? 'animate-spin' : ''} 
                                ${domainData.validated ? 'text-lightgrey hover:text-lightgrey1' : 'text-secondary hover:text-primary'}
                                transition-colors duration-200`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditRecord({ domain: domainName, ...domainData })}
                            className="p-1 text-lightgrey hover:text-secondary transition-colors duration-200"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick({ domain: domainName, ...domainData })}
                            className="p-1 text-warning hover:text-secondary transition-colors duration-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DNSRecordsTable;