import React, { useState, useEffect } from "react";
import { Table, Badge, Button, Container, Row, Col } from "react-bootstrap";
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
import { dnsApi, systemApi } from "../services/api";

const Dashboard = () => {
  // Estados para los datos y modales
  const [dnsRecords, setDnsRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [healthStatus, setHealthStatus] = useState({
    servers: "healthy",
    database: "healthy",
    api: "warning",
  });

  // Estado para el nuevo registro
  const [newRecord, setNewRecord] = useState({
    domain: "",
    type: "A",
    value: "",
    ttl: 3600,
  });

  // Carga de datos desde la API
  useEffect(() => {
    // Aquí se hace llamada al API
    const fetchData = async () => {
      setLoading(true);
      try {
        const mockData = [
          {
            id: 1,
            domain: "ejemplo.com",
            type: "A",
            value: "192.168.1.1",
            ttl: 3600,
            status: "active",
          },
          {
            id: 2,
            domain: "test.com",
            type: "CNAME",
            value: "ejemplo.com",
            ttl: 1800,
            status: "active",
          },
          {
            id: 3,
            domain: "mail.ejemplo.com",
            type: "MX",
            value: "mail.ejemplo.com",
            ttl: 7200,
            status: "warning",
          },
          {
            id: 4,
            domain: "api.ejemplo.com",
            type: "A",
            value: "192.168.1.2",
            ttl: 3600,
            status: "error",
          },
          {
            id: 5,
            domain: "dev.ejemplo.com",
            type: "A",
            value: "192.168.1.3",
            ttl: 600,
            status: "active",
          },
        ];
  
        // Simular retardo de 1 segundo
        setTimeout(() => {
          setDnsRecords(mockData);
          setLoading(false);
        }, 1000);
  
        // Si después vas a usar la API real, puedes usar esto:
        /*
        const [records, health] = await Promise.all([
          dnsApi.getAllRecords(),
          systemApi.getHealthStatus()
        ]);
        setDnsRecords(records);
        setHealthStatus(health);
        */
      } catch (error) {
        console.error("Error fetching data:", error);
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
  // Aca se hace llamda del API
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
    value: "",
    ttl: 3600,
  });
  handleCloseAddModal();
  };

  //const handleAddRecord = async () => {
  //  try {
  //    const addedRecord = await dnsApi.addRecord(newRecord);
  //    setDnsRecords([...dnsRecords, addedRecord]);
  //    setNewRecord({
  //      domain: "",
  //      type: "A",
  //      value: "",
  //      ttl: 3600,
  //    });
  //    handleCloseAddModal();
  //  } catch (error) {
  //    console.error("Error adding record:", error);
  //  }
  //};

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
      <Row className="mb-4">
        <Col className="d-flex justify-content-end">
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
        </Col>
      </Row>

      {/* Tabla de Registros DNS */}
      <div className="container mt-4">
        <DNSRecordsTable
          dnsRecords={dnsRecords}
          loading={loading}
          renderStatusBadge={renderStatusBadge}
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
