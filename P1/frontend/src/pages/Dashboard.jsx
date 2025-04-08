import React, { useState, useEffect } from "react";
import {Badge, Button, Container} from "react-bootstrap";
import {
  PlusCircle,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import SystemStatusCard from "../components/SystemStatusCard";
import DatabaseModal from "../components/DatabaseModal";
import DNSRecordsTable from "../components/DNSRecordsTable";
import DNSRegisterCard from "../components/DNSRegisterCard";
import { dnsApi , databaseApi} from "../services/api";

const Dashboard = () => {
  // Estados para los datos y modales
  const [dnsRecords, setDnsRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [healthStatus, setHealthStatus] = useState({
    servers: "error",
    database: "error",
    api: "error",
  });

  // Estado para el nuevo registro
  const [newRecord, setNewRecord] = useState({
    domain: "",
    type: "A",
    direction: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener todos los registros de la tabla
        const records = await dnsApi.getAllRecords(); 

        // Obtener los estados
        const updatedRecords = await Promise.all(
          records.map(async (record) => {
            const healthResult = await dnsApi.checkHealth(record.domain, record.direction);
  
            return {
              ...record,
              status: healthResult.health ? 'active' : 'error',
              statusMessage: healthResult.message
            };
          })
        );
        // Guardar el estado
        setDnsRecords(updatedRecords);
        // Update el APIHealth
        updateApiHealthStatus();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const handleCloseAddModal = () => setShowAddModal(false);
  const handleShowAddModal = () => setShowAddModal(true);
  const handleCloseDatabaseModal = () => setShowDatabaseModal(false);
  const handleShowDatabaseModal = () => setShowDatabaseModal(true);

  // Cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecord({
      ...newRecord,
      [name]: value,
    });
  };

  // Añadir nuevo registro

  const handleAddRecord = () => {
  const newId = dnsRecords.length + 1;
  const recordWithId = {
    id: newId,
    ...newRecord,
    status: "active",
  }
  setDnsRecords([...dnsRecords, recordWithId]);
  setNewRecord({
    domain: "",
    type: "A",
    direction: ""
  });
  handleCloseAddModal();
  };


  // Función para renderizar el indicador de estado
  const renderStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge bg="success">Activo</Badge>;
      case "warning":
        return <Badge bg="warning">Advertencia</Badge>;
      case "error":
        return <Badge bg="danger">Error</Badge>;
      default:
        return <Badge bg="secondary">Desconocido</Badge>;
    }
  };

  // Función para renderizar icono de salud
  const renderHealthIcon = (status) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="text-success" />;
      case "warning":
        return <AlertTriangle className="text-warning" />;
      case "error":
        return <XCircle className="text-danger" />;
      default:
        return <AlertTriangle className="text-secondary" />;
    }
  };

  const handleRefreshStatus = async (recordId, domain, direction) => {
    try {
      const updatedRecords = dnsRecords.map(record =>
        record.id === recordId
          ? { ...record, status: "loading" }
          : record
      );
  
      setDnsRecords(updatedRecords); 
  
      const healthCheck = await dnsApi.checkHealth(domain, direction);
  
      console.log("Resultado del checkHealth:", healthCheck);
  
      // Actualiza el estado del registro con el resultado del check
      const finalRecords = updatedRecords.map(record =>
        record.id === recordId
          ? {
              ...record,
              status:
                healthCheck && typeof healthCheck.health === "boolean"
                  ? healthCheck.health
                    ? "active"
                    : "error"
                  : "unknown",
            }
          : record
      );
  
      setDnsRecords(finalRecords);
    } catch (error) {
      console.error("Error refreshing record status:", error);
  
      // En caso de error, actualiza el estado a "error"
      const errorRecords = dnsRecords.map(record =>
        record.id === recordId
          ? { ...record, status: "error" }
          : record
      );
  
      setDnsRecords(errorRecords);
    }
  };

  const updateApiHealthStatus = async () => {
    const result = await dnsApi.checkApiStatus();
  
    setHealthStatus(prev => ({
      ...prev,
      api: result.message ? "healthy" : "error"
    }));
  };

  // Esta es la parte visual del FRONTEND donde se importan todos los componentes a usar
  return (
    <Container fluid className="p-4">
      <h1 className="mb-4">Panel de Control DNS</h1>

      {/* Health Checks */}
      <div className="container mt-4">
        <SystemStatusCard
          healthStatus={healthStatus}
          renderHealthIcon={renderHealthIcon}
        />
      </div>

      {/* Botones de Acción */}
      <div className="container mt-4 ">
        <div className="d-flex justify-content-end">
          <Button
            variant="primary"
            className="me-2 d-flex align-items-center"
            onClick={handleShowAddModal}
          >
            <PlusCircle size={18} className="me-1" />
            Añadir Registro
          </Button>
          <Button
            variant="secondary"
            className="d-flex align-items-center"
            onClick={handleShowDatabaseModal}
          >
            <Database size={18} className="me-1" />
            Gestionar IP to Country
          </Button>
        </div>
      </div>

      {/* Tabla de Registros DNS */}
      <div className="container mt-4">
        <DNSRecordsTable
          dnsRecords={dnsRecords}
          loading={loading}
          renderStatusBadge={renderStatusBadge}
          onRefreshStatus={handleRefreshStatus}
        />
      </div>

      {/* Modal para Añadir Registro */}
      <DNSRegisterCard
        show={showAddModal}
        handleClose={handleCloseAddModal}
        newRecord={newRecord}
        handleInputChange={handleInputChange}
        handleAddRecord={handleAddRecord}
      />

      {/* Modal para Gestionar IP to Country */}
      <div className="container mt-4">
        <DatabaseModal
          show={showDatabaseModal}
          handleClose={handleCloseDatabaseModal}
        />
      </div>
    </Container>
  );
};

export default Dashboard;
