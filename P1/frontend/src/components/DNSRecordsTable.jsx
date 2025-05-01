import React from 'react';
import { Row, Col, Card, Table, Button } from 'react-bootstrap';
import { RotateCw, Edit2, Trash2 } from "lucide-react";

const DNSRecordsTable = ({ dnsRecords, loading, renderStatusBadge, onRefreshStatus, onEditRecord, onDeleteRecord }) => {
  // Permite devolver los registros en base al tipo donde se ordenan para la tabla
  const renderDirections = (record) => {
    // Cambia manejo dependiendo del tipo
    if (record.type === "multi" || record.type === "round-trip") {
      if (!record.direction) return;
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
    
    if (record.type === "weight") {
      if (!record.direction) return;
      const weightedDirections = record.direction.split(",").map(item => {
        const [ip, weight] = item.trim().split(":");
        return { ip, weight };
      });
      
      return (
        <div>
          {weightedDirections.map((item, index) => (
            <div key={index}>
              IP: {item.ip} - Peso: {item.weight}
              {index < weightedDirections.length - 1 && <hr className="my-1" />}
            </div>
          ))}
        </div>
      );
    }
  
    if (record.type === "geo") {
      if (!record.direction) return;
      const geoDirections = record.direction.split(",").map(item => {
        const [ip, country] = item.trim().split(":");
        return { ip, country };
      });
      
      return (
        <div>
          {geoDirections.map((item, index) => (
            <div key={index}>
              IP: {item.ip} - País: {item.country}
              {index < geoDirections.length - 1 && <hr className="my-1" />}
            </div>
          ))}
        </div>
      );
    }
    return record.direction ?? "Sin datos";
  };

  // Componente visual para la tabla de dominios
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
                    <th style={{ width: '120px' }}>Acciones</th>
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
                        <div className="d-flex gap-2 justify-content-center">
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
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => onDeleteRecord(record)}
                          >
                            <Trash2 size={16} />
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