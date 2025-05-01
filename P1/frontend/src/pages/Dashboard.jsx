import React, { useState, useEffect } from "react";
import {Badge, Button, Container} from "react-bootstrap";
import {
  PlusCircle,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import SystemStatusCard from "../components/SystemStatusCard";
import DNSRecordsTable from "../components/DNSRecordsTable";
import DNSRegisterCard from "../components/DNSRegisterCard";
import EditRecordModal from "../components/EditRecordModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import { dnsApi } from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();

  // Estados para los datos y modales
  const [dnsRecords, setDnsRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  const [healthStatus, setHealthStatus] = useState({
    servers: "error",
    database: "error",
    api: "error",
  });

  // Estado para el nuevo registro
  const [newRecord, setNewRecord] = useState({
    domain: "",
    type: "single",
    direction: "",
    directions: [] // Array para almacenar múltiples direcciones cuando type es "multi"
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
        updateFirebaseStatus();
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
      // Si es tipo multi, usamos el array de directions, si no, usamos la dirección única
      direction: newRecord.type === "multi" ? newRecord.directions.join(", ") : newRecord.direction
    }
    setDnsRecords([...dnsRecords, recordWithId]);
    setNewRecord({
      domain: "",
      type: "single",
      direction: "",
      directions: []
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
  
  // Permite eliminar dominio
  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };
  // Permite confirmar eliminar el dominio
  const handleDeleteConfirm = async () => {
    try {
      const record = {
        domain: recordToDelete.domain
      };
  
      const result = await dnsApi.deleteDNSRecord(record);
  
      if (result.success) {
        window.location.reload();
      } else {
        alert(`Error al eliminar el registro`);
      }
    } catch (error) {
      alert('Error al eliminar el registro DNS');
    } finally {
      setShowDeleteModal(false);
      setRecordToDelete(null);
    }
  };

  // Cancela eliminar registro
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setRecordToDelete(null);
  };
  
  // Revisa estado del Backend API
  const updateApiHealthStatus = async () => {
    const result = await dnsApi.checkApiStatus();
  
  // Revisa estado del Firebase
    setHealthStatus(prev => ({
      ...prev,
      api: result.message ? "healthy" : "error"
    }));
  };

  const updateFirebaseStatus = async () => {
    const result = await dnsApi.checkFirebaseStatus();
  
    setHealthStatus(prev => ({
      ...prev,
      database: result.message ? "healthy" : "error"
    }));
  };

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedRecord(null);
  };

  const handleSaveEdit = (updatedRecord) => {
    setDnsRecords(prevRecords =>
      prevRecords.map(record =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
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
            onClick={() => navigate("/ip-to-country")}
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
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteClick}
        />
      </div>

      {/* Modal para Añadir Registro */}
      <DNSRegisterCard
        show={showAddModal}
        handleClose={handleCloseAddModal}
        newRecord={newRecord}
        handleInputChange={handleInputChange}
      />

      {/* Modal de Edición */}
      <EditRecordModal
        show={showEditModal}
        handleClose={handleCloseEditModal}
        record={selectedRecord}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        domain={recordToDelete?.domain}
      />
    </Container>
  );
};

export default Dashboard;

