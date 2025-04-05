import React from 'react';
import { Modal, Button, Row, Col, Card, Badge } from 'react-bootstrap';

const DatabaseModal = ({ show, handleClose }) => {
  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Gestión de Base de Datos IP to Country</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Desde aquí puedes gestionar la base de datos de IP to Country:</p>
        <Row className="mb-3">
          <Col>
            <Button variant="primary" className="me-2">Actualizar Base de Datos</Button>
            <Button variant="info" className="me-2">Descargar CSV</Button>
            <Button variant="warning">Importar CSV</Button>
          </Col>
        </Row>
        <Row>
          <Col>
            <Card>
              <Card.Header>Información de la Base de Datos</Card.Header>
              <Card.Body>
                <p><strong>Última actualización:</strong> 03/04/2025</p>
                <p><strong>Número de registros:</strong> 324,756</p>
                <p><strong>Versión:</strong> 2.5.3</p>
                <p><strong>Estado:</strong> <Badge bg="success">Actualizada</Badge></p>
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
