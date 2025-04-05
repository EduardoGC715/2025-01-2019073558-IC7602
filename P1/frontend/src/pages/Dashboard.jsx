import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Badge, 
  Button, 
  Container, 
  Row, 
  Col, 
  Card, 
  Modal, 
  Form 
} from 'react-bootstrap';
import { PlusCircle, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import SystemStatusCard from '../components/SystemStatusCard';
import DatabaseModal from '../components/DatabaseModal';
import DNSRecordsTable from '../components/DNSRecordsTable';
import DNSRegisterCard from '../components/DNSRegisterCard';


const Dashboard = () => {
  // Estados para los datos y modales
  const [dnsRecords, setDnsRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [healthStatus, setHealthStatus] = useState({
    servers: 'healthy',
    database: 'healthy',
    api: 'warning'
  });


  
  // Estado para el nuevo registro
  const [newRecord, setNewRecord] = useState({
    domain: '',
    type: 'A',
    value: '',
    ttl: 3600
  });

  // Simulación de carga de datos
  useEffect(() => {
    // Aquí harías la llamada a tu API real
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulando datos de ejemplo
        const mockData = [
          { id: 1, domain: 'ejemplo.com', type: 'A', value: '192.168.1.1', ttl: 3600, status: 'active' },
          { id: 2, domain: 'test.com', type: 'CNAME', value: 'ejemplo.com', ttl: 1800, status: 'active' },
          { id: 3, domain: 'mail.ejemplo.com', type: 'MX', value: 'mail.ejemplo.com', ttl: 7200, status: 'warning' },
          { id: 4, domain: 'api.ejemplo.com', type: 'A', value: '192.168.1.2', ttl: 3600, status: 'error' },
          { id: 5, domain: 'dev.ejemplo.com', type: 'A', value: '192.168.1.3', ttl: 600, status: 'active' },
        ];
        
        // Simular tiempo de carga
        setTimeout(() => {
          setDnsRecords(mockData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching DNS records:", error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Manejadores para modales
  const handleCloseAddModal = () => setShowAddModal(false);
  const handleShowAddModal = () => setShowAddModal(true);
  const handleCloseDatabaseModal = () => setShowDatabaseModal(false);
  const handleShowDatabaseModal = () => setShowDatabaseModal(true);


  // Manejador para cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecord({
      ...newRecord,
      [name]: value
    });
  };

  // Manejador para añadir un nuevo registro
  const handleAddRecord = () => {
    // Aquí harías la llamada a tu API para añadir el registro
    const newId = dnsRecords.length + 1;
    const recordWithId = {
      id: newId,
      ...newRecord,
      status: 'active'
    };
    
    setDnsRecords([...dnsRecords, recordWithId]);
    setNewRecord({
      domain: '',
      type: 'A',
      value: '',
      ttl: 3600
    });
    handleCloseAddModal();
  };

  // Función para renderizar el indicador de estado
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge bg="success">Activo</Badge>;
      case 'warning':
        return <Badge bg="warning">Advertencia</Badge>;
      case 'error':
        return <Badge bg="danger">Error</Badge>;
      default:
        return <Badge bg="secondary">Desconocido</Badge>;
    }
  };

  // Función para renderizar el icono de estado de salud
  const renderHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="text-success" />;
      case 'warning':
        return <AlertTriangle className="text-warning" />;
      case 'error':
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
        <SystemStatusCard healthStatus={healthStatus} renderHealthIcon={renderHealthIcon} />
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
        renderStatusBadge={renderStatusBadge} />
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