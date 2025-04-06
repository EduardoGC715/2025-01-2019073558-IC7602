import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Card, Badge } from 'react-bootstrap';
import { databaseApi } from '../services/api';

const DatabaseModal = ({ show, handleClose }) => {
  const [databaseStatus, setDatabaseStatus] = useState({
    lastUpdate: '',
    recordCount: 0,
    version: '',
    status: 'unknown'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      fetchDatabaseStatus();
    }
  }, [show]);

  const fetchDatabaseStatus = async () => {
    try {
      const status = await databaseApi.getStatus();
      setDatabaseStatus(status);
    } catch (error) {
      console.error('Error fetching database status:', error);
    }
  };

  const handleUpdateDatabase = async () => {
    setLoading(true);
    try {
      await databaseApi.updateDatabase();
      await fetchDatabaseStatus();
    } catch (error) {
      console.error('Error updating database:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const blob = await databaseApi.downloadCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ip-to-country.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      try {
        await databaseApi.importCSV(file);
        await fetchDatabaseStatus();
      } catch (error) {
        console.error('Error importing CSV:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Gestión de Base de Datos IP to Country</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Desde aquí puedes gestionar la base de datos de IP to Country:</p>
        <Row className="mb-3">
          <Col>
            <Button 
              variant="primary" 
              className="me-2"
              onClick={handleUpdateDatabase}
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar Base de Datos'}
            </Button>
            <Button 
              variant="info" 
              className="me-2"
              onClick={handleDownloadCSV}
              disabled={loading}
            >
              Descargar CSV
            </Button>
            <Button 
              variant="warning"
              disabled={loading}
            >
              <label htmlFor="csv-import" className="mb-0">
                Importar CSV
              </label>
              <input
                id="csv-import"
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
              />
            </Button>
          </Col>
        </Row>
        <Row>
          <Col>
            <Card>
              <Card.Header>Información de la Base de Datos</Card.Header>
              <Card.Body>
                <p><strong>Última actualización:</strong> {databaseStatus.lastUpdate}</p>
                <p><strong>Número de registros:</strong> {databaseStatus.recordCount.toLocaleString()}</p>
                <p><strong>Versión:</strong> {databaseStatus.version}</p>
                <p>
                  <strong>Estado:</strong>{' '}
                  <Badge bg={databaseStatus.status === 'updated' ? 'success' : 'warning'}>
                    {databaseStatus.status === 'updated' ? 'Actualizada' : 'Necesita actualización'}
                  </Badge>
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DatabaseModal;
