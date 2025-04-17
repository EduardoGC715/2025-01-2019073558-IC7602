// src/components/DNSRecordsTable.jsx (ajusta la ruta según tu estructura)
import React from 'react';
import { Row, Col, Card, Table, Button, ListGroup } from 'react-bootstrap';
import { RotateCw, Edit2 } from "lucide-react";

const DNSRecordsTable = ({ dnsRecords, loading, renderStatusBadge, onRefreshStatus, onEditRecord }) => {
  const renderDirections = (record) => {
    if (record.type === "multi") {
      const directions = record.direction.split(",").map(d => d.trim());
      return (
        <div>
          {directions.map((dir, index) => (
            <div key={index}>
              {dir}
              {index < directions.length - 1 && <hr className="my-1" />}
            </div>
          ))}
        </div>
      );
    }
    return record.direction;
  };

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
              <Table striped bordered hover>
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
                      <td className="direction-cell">{renderDirections(record)}</td>
                      <td>{renderStatusBadge(record.status)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => onRefreshStatus(record.id, record.domain, record.direction)}
                          >
                            <RotateCw size={16} />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => onEditRecord(record)}
                          >
                            <Edit2 size={16} />
                          </Button>
                        </div>
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
