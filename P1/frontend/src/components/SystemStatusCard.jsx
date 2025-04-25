import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const SystemStatusCard = ({ healthStatus, renderHealthIcon }) => {
  return (
    <Row className="mb-4">
      <Col>
        <Card>
          <Card.Header>Estado del Sistema</Card.Header>
          <Card.Body>
            <Row className="justify-content-center">
              <Col md={4}>
                <div className="d-flex align-items-center justify-content-center">
                  {renderHealthIcon(healthStatus.database)}
                  <span className="ms-2">Base de Datos</span>
                </div>
              </Col>
              <Col md={4}>
                <div className="d-flex align-items-center justify-content-center">
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