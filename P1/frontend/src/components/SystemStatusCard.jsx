import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { systemApi } from '../services/api';

const SystemStatusCard = ({ renderHealthIcon }) => {
  const [healthStatus, setHealthStatus] = useState({
    servers: 'unknown',
    database: 'unknown',
    api: 'unknown'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const status = await systemApi.getHealthStatus();
        setHealthStatus(status);
      } catch (error) {
        console.error('Error fetching health status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthStatus();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Estado del Sistema</Card.Header>
            <Card.Body>
              <div className="text-center p-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row className="mb-4">
      <Col>
        <Card>
          <Card.Header>Estado del Sistema</Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <div className="d-flex align-items-center">
                  {renderHealthIcon(healthStatus.servers)}
                  <span className="ms-2">Servidores DNS</span>
                </div>
              </Col>
              <Col md={4}>
                <div className="d-flex align-items-center">
                  {renderHealthIcon(healthStatus.database)}
                  <span className="ms-2">Base de Datos</span>
                </div>
              </Col>
              <Col md={4}>
                <div className="d-flex align-items-center">
                  {renderHealthIcon(healthStatus.api)}
                  <span className="ms-2">API</span>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SystemStatusCard;