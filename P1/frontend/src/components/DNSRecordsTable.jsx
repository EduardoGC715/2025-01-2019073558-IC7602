// src/components/DNSRecordsTable.jsx (ajusta la ruta según tu estructura)
import React, { useState } from 'react';
import { Row, Col, Card, Table, Button } from 'react-bootstrap';
import { dnsApi } from '../services/api';

const DNSRecordsTable = ({ dnsRecords, loading, renderStatusBadge, onUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editedRecord, setEditedRecord] = useState({});

  const handleEdit = (record) => {
    setEditingId(record.id);
    setEditedRecord({ ...record });
  };

  const handleSave = async (id) => {
    try {
      await dnsApi.updateRecord(id, editedRecord);
      setEditingId(null);
      onUpdate(); // Notify parent to refresh data
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      try {
        await dnsApi.deleteRecord(id);
        onUpdate(); // Notify parent to refresh data
      } catch (error) {
        console.error('Error deleting record:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedRecord({
      ...editedRecord,
      [name]: value,
    });
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
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Dominio</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>TTL</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>
                        {editingId === record.id ? (
                          <input
                            type="text"
                            name="domain"
                            value={editedRecord.domain}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          record.domain
                        )}
                      </td>
                      <td>
                        {editingId === record.id ? (
                          <select
                            name="type"
                            value={editedRecord.type}
                            onChange={handleInputChange}
                            className="form-control"
                          >
                            <option value="A">A</option>
                            <option value="AAAA">AAAA</option>
                            <option value="CNAME">CNAME</option>
                            <option value="MX">MX</option>
                            <option value="TXT">TXT</option>
                            <option value="NS">NS</option>
                            <option value="SOA">SOA</option>
                            <option value="SRV">SRV</option>
                          </select>
                        ) : (
                          record.type
                        )}
                      </td>
                      <td>
                        {editingId === record.id ? (
                          <input
                            type="text"
                            name="value"
                            value={editedRecord.value}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          record.value
                        )}
                      </td>
                      <td>
                        {editingId === record.id ? (
                          <input
                            type="number"
                            name="ttl"
                            value={editedRecord.ttl}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        ) : (
                          record.ttl
                        )}
                      </td>
                      <td>{renderStatusBadge(record.status)}</td>
                      <td>
                        {editingId === record.id ? (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              className="me-1"
                              onClick={() => handleSave(record.id)}
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              onClick={() => handleEdit(record)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
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
