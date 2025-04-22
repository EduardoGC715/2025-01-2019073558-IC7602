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
        setLookupError('IP not found in any range');
      }
    } catch {
      setLookupError('Error fetching IP');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Lookup IP Address</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <InputGroup className="mb-3">
          <FormControl
            placeholder="Enter IP (e.g. 1.0.1.2)"
            value={lookupIp}
            onChange={e => setLookupIp(e.target.value)}
          />
          <Button variant="primary" onClick={handleLookup}>
            Go
          </Button>
        </InputGroup>

        {lookupError && <div className="text-danger">{lookupError}</div>}

        {lookupResult && (
          <Table responsive striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                <th>ID</th>
                <th>Country</th>
                <th>Country ISO Code</th>
                <th>Continent</th>
                <th>Continent Code</th>
                <th>Start IP</th>
                <th>End IP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{ipToInteger(lookupResult.ip)}</td>
                <td>{lookupResult.country_name}</td>
                <td>{lookupResult.country_iso_code}</td>
                <td>{lookupResult.continent_name}</td>
                <td>{lookupResult.continent_code}</td>
                <td>{lookupResult.matched_range.split(' - ')[0]}</td>
                <td>{lookupResult.matched_range.split(' - ')[1]}</td>
              </tr>
            </tbody>
          </Table>
        )}
      </Modal.Body>
    </Modal>
  );
}
