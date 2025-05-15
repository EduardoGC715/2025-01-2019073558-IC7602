import { useState, useEffect } from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { dnsApi } from "../services/api";

const dnsRecordSchema = z.object({
  id: z.number(),
  domain: z.string().nonempty(),
  type: z.string().nonempty(),
  directions: z.array(z.string()).optional(),
});

const healthCheckSchema = z.object({
  address: z.string(),
  health: z.boolean(),
  healthcheck_results: z.record(
    z.object({
      duration_ms: z.number(),
      success: z.boolean(),
      timestamp: z.string(),
    })
  ).optional(),
});

function DNSRecordsTable({ dnsRecords, onEditRecord, onDeleteRecord, getExtraCol }) {
  const [showModal, setShowModal] = useState(false);
  const [localDnsRecords, setLocalDnsRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Agregamos estado local para loading
  const [modalDomain, setModalDomain] = useState(null);
  const [modalHealthData, setModalHealthData] = useState(null);

  const renderDirections = (record) => {
    try {
      dnsRecordSchema.parse(record);
    } catch (e) {
      return <span className="text-warning">Datos inválidos</span>;
    }

    return record.directions ? record.directions.join(', ') : 'N/A';
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Usamos el nuevo estado
      try {
        const records = await dnsApi.getAllRecords();
        console.log("Fetched records:", records);
        setLocalDnsRecords(records);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false); // Usamos el nuevo estado
      }
    };

    fetchData();
  }, []);

  return (
    <div className="w-full p-4">
      <div className="bg-light shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Registros DNS</h2>
        </div>
        <div className="p-4">
          {isLoading ? ( // Usamos el nuevo estado
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
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Dirección</th>
                    <th className="px-4 py-2">Health Checks</th>
                    <th className="px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {localDnsRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-lightgrey1">
                      <td className="px-4 py-2">{record.id}</td>
                      <td className="px-4 py-2">{record.domain}</td>
                      <td className="px-4 py-2">{record.type}</td>
                      <td className="px-4 py-2">{renderDirections(record)}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => {
                            setModalDomain(record.domain);
                            setModalHealthData(null);
                            setShowModal(true);
                          }}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Eye size={16} />
                          Detalles
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => onEditRecord(record)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(record)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-lg p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="text-lg font-semibold">Health Checks: {modalDomain}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-red-600 text-xl">
                &times;
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {!modalHealthData ? (
                <p>Cargando datos…</p>
              ) : (() => {
                const raw = modalHealthData;
                const extra = getExtraCol(raw.routing_policy);

                const entries = raw.ip
                  ? [raw.ip]
                  : raw.ips
                  ? Array.isArray(raw.ips)
                    ? raw.ips.map((ip) => ({ ...ip }))
                    : Object.entries(raw.ips).map(([country, ip]) => ({
                        ...ip,
                        country
                      }))
                  : [];

                return (
                  <table className="min-w-full text-sm text-left mb-4">
                    <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2">Dirección</th>
                        {extra && <th className="px-4 py-2">{extra.label}</th>}
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2">Resultados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((ipEntry) => {
                        try {
                          healthCheckSchema.parse(ipEntry);
                        } catch {
                          return (
                            <tr key={Math.random()}>
                              <td colSpan={4} className="text-red-600 px-4 py-2">
                                Error de validación
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={ipEntry.address} className="border-b">
                            <td className="px-4 py-2">{ipEntry.address}</td>
                            {extra && (
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded bg-${extra.badgeBg}`}>
                                  {ipEntry[extra.key]}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                ipEntry.health ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {ipEntry.health ? 'healthy' : 'unhealthy'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              {ipEntry.healthcheck_results && Object.keys(ipEntry.healthcheck_results).length > 0 ? (
                                <table className="min-w-full text-xs text-left">
                                  <thead>
                                    <tr>
                                      <th className="px-2 py-1">Checker</th>
                                      <th className="px-2 py-1">Duración</th>
                                      <th className="px-2 py-1">Éxito</th>
                                      <th className="px-2 py-1">Timestamp</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(ipEntry.healthcheck_results).map(([checker, res]) => (
                                      <tr key={checker}>
                                        <td className="px-2 py-1">{checker}</td>
                                        <td className="px-2 py-1">{res.duration_ms.toFixed(2)} ms</td>
                                        <td className="px-2 py-1">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            res.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                            {res.success.toString()}
                                          </span>
                                        </td>
                                        <td className="px-2 py-1">{res.timestamp}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div>No hay resultados</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DNSRecordsTable;