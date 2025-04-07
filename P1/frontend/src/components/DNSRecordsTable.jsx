// src/components/DNSRecordsTable.jsx (ajusta la ruta según tu estructura)
import React from 'react';
import { Row, Col, Card, Table, Button } from 'react-bootstrap';
import { ArrowClockwise } from 'react-bootstrap-icons';

const DNSRecordsTable = ({ dnsRecords, loading, renderStatusBadge, onRefreshStatus }) => {
  return (
    <Row>
      <Col>
        <Card>
          <Card.Header>Registros DNS</Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Dominio</th>
                    <th>Tipo</th>
                    <th>Dirección</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{record.domain}</td>
                      <td>{record.type}</td>
                      <td>{record.direction}</td>
                      <td>{renderStatusBadge(record.status)}</td>
                      <td>
                        <Button 
                          variant="outline-info" 
                          size="sm" 
                          className="me-1"
                          onClick={() => onRefreshStatus(record.id, record.domain, record.direction)}
                          title="Verificar estado"
                        >
                          <ArrowClockwise />
                        </Button>
                        <Button variant="outline-primary" size="sm" className="me-1">Editar</Button>
                        <Button variant="outline-danger" size="sm">Eliminar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DNSRecordsTable;
