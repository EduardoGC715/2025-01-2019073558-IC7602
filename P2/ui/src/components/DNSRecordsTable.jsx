import { useState, useEffect } from 'react';
import { Edit2, Trash2, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Obtener registros DNS
        const records = await dnsApi.getAllRecords();
        setLocalDnsRecords(records);

        // Obtener dominios del usuario
        const { success, domains, message } = await getUserDomains();
        if (success) {
          setDomains(domains);
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
        // Verificar ownership para cada dominio
        const verificationPromises = Object.keys(domains).map(async (domainName) => {
          if (!domains[domainName].validated) {
            const verificationResult = await verifyDomainOwnership(domainName);
            console.log("Resultado de verificación:", verificationResult);

            if (verificationResult.success) {
              domains[domainName].validated = verificationResult.validated;
            }
          }
          return domains[domainName];
        });

        await Promise.all(verificationPromises);
        setDomains(domains);
      } else {
        console.error("Error fetching domains:", message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = async (domainName) => {
    setIsLoading(true);
    try {
      const result = await verifyDomainOwnership(domainName);
      
      if (result.success) {
        // Actualizar solo el dominio específico en el estado
        setDomains(prevDomains => ({
          ...prevDomains,
          [domainName]: {
            ...prevDomains[domainName],
            validated: result.validated,
            lastChecked: result.timestamp
          }
        }));
      } else {
        console.error(`Error verificando ${domainName}:`, result.message);
      }
    } catch (error) {
      console.error("Error en verificación:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-4">
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, record: null })}
        onConfirm={handleConfirmDelete}
        domain={deleteModal.record?.domain}
      />
      <div className="bg-light shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Registros DNS</h2>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-primary text-s uppercase text-darkgrey">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Dominio</th>
                    <th className="px-4 py-2">Dirección</th>
                    <th className="px-4 py-2">Ownership</th>
                    <th className="px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domains).map(([domainName, domainData], index) => (
                    <tr key={domainName} className="border-b hover:bg-lightgrey1">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{domainName}</td>
                      <td className="px-4 py-2">{domainData.validation?.subdomain || 'N/A'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {domainData.validated ? (
                            <span className="text-green-600">true</span>
                          ) : (
                            <>
                              <span className="text-warning">false</span>
                              <button
                                onClick={refreshDomains}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={isLoading}
                              >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditRecord({ domain: domainName, ...domainData })}
                            className="p-1 text-gray-600 hover:text-black"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick({ domain: domainName, ...domainData })}
                            className="p-1 text-red-600 hover:text-red-800"
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