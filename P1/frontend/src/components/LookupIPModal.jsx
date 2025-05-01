import React, { useState } from 'react';
import { Modal, Button, InputGroup, FormControl, Table } from 'react-bootstrap';
import { databaseApi } from '../services/api';

const ipToInteger = (ip) =>
  ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);

export default function LookupIPModal({ show, onHide }) {
  const [lookupIp, setLookupIp]         = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError]   = useState('');

  const handleLookup = async () => {
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await databaseApi.getCountryByIp(lookupIp);
      if (res && !res.error) {
        setLookupResult(res);
      } else {
        setLookupError('IP no encontrada en ningún rango');
      }
    } catch {
      setLookupError('Error al obtener IP');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Buscar dirección IP</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <InputGroup className="mb-3">
          <FormControl
            placeholder="Ej: 192.168.0.254"
            value={lookupIp}
            onChange={e => setLookupIp(e.target.value)}
          />
          <Button variant="primary" onClick={handleLookup}>
            Buscar
          </Button>
        </InputGroup>

        {lookupError && <div className="text-danger">{lookupError}</div>}

        {lookupResult && (
          <Table responsive striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                <th>ID</th>
                <th>País</th>
                <th>Código ISO</th>
                <th>Continente</th>
                <th>Código Continente</th>
                <th>IP Inicio</th>
                <th>IP Fin</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{lookupResult.id}</td>
                <td>{lookupResult.country_name}</td>
                <td>{lookupResult.country_iso_code}</td>
                <td>{lookupResult.continent_name}</td>
                <td>{lookupResult.continent_code}</td>
                <td>{lookupResult.start_ip}</td>
                <td>{lookupResult.end_ip}</td>
              </tr>
            </tbody>
          </Table>
        )}
      </Modal.Body>
    </Modal>
  );
}
