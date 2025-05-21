import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { dnsApi } from "../services/api";
import { getUserDomains } from "../services/domain";
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

  const handleConfirmDelete = () => {
    if (deleteModal.record) {
      onDeleteRecord(deleteModal.record);
      setDeleteModal({ isOpen: false, record: null });
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
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domains).map(([domainName, domainData], index) => (
                    <tr key={domainName} className="border-b hover:bg-lightgrey1">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{domainName}</td>
                      <td className="px-4 py-2">
                        {domainData.validated ? (
                          <span className="text-green-600">Validado</span>
                        ) : (
                          <span className="text-yellow-600">Pendiente</span>
                        )}
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