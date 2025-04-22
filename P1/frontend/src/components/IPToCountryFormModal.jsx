import React, { useState } from 'react';
import { Modal, Form, Button, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { databaseApi } from '../services/api';

const IPToCountryFormModal = ({ show, onClose, onSubmit, onDelete, onSaved, ipToCountry, isEditing }) => {
  const [conflictRecords, setConflictRecords] = useState([]);

  const continentMap = {
    AF: 'Africa',
    AN: 'Antarctica',
    AS: 'Asia',
    EU: 'Europe',
    NA: 'North America',
    OC: 'Oceania',
    SA: 'South America'
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    onSubmit(prev => ({ ...prev, [name]: value }));
  };

    // when user picks a continent, set both code + name
  const handleContinentChange = (e) => {
    const code = e.target.value;
    onSubmit(prev => ({
      ...prev,
      continent_code: code,
      continent_name: continentMap[code]
    }));
  };

  const handleSave = async () => {

  setConflictRecords([]);

  const fn = isEditing
    ? databaseApi.updateIPToCountryRecord
    : databaseApi.createIPToCountryRecord;

    // prepare payload
    const payload = {
      start_ip:         ipToCountry.start_ip,
      end_ip:           ipToCountry.end_ip,
      continent_code:   ipToCountry.continent_code,
      continent_name:   ipToCountry.continent_name,
      country_iso_code: ipToCountry.country_iso_code,
      country_name:     ipToCountry.country_name,
      ...(isEditing && { original_start_ip: ipToCountry.id })
    };

    const result = await fn(payload);

    if (result.error) {
      if (result.conflict) {
        setConflictRecords([result.conflict]);
        toast.error('Overlap detected with existing range');
      } else {
        toast.error(result.error);
      }
    } else {
      toast.success(result.message);
      console.log(result.record)
      onSaved(result.record, ipToCountry.id);
      onClose(true);
    }
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static" size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? 'Edit IPToCountry' : 'Add IPToCountry'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <div className="mx-auto" style={{ maxWidth: '500px' }}>
      <Form>
        {isEditing && (
          <Form.Group className="mb-3">
            <Form.Label>ID</Form.Label>
            <Form.Control
              type="text"
              value={ipToCountry.id || ''}
              readOnly
            />
          </Form.Group>
          )}
          {/* Country Name */}
          <Form.Group className="mb-3">
            <Form.Label>Country Name</Form.Label>
            <Form.Control
              name="country_name"
              value={ipToCountry.country_name || ''}
              onChange={handleChange}
              placeholder="Country Name"
            />
          </Form.Group>

          {/* Country ISO Code */}
          <Form.Group className="mb-3">
            <Form.Label>Country ISO Code</Form.Label>
            <Form.Control
              name="country_iso_code"
              value={ipToCountry.country_iso_code || ''}
              onChange={handleChange}
              placeholder="Country ISO Code"
            />
          </Form.Group>
          
          {/* Continent Pick */}
          <Form.Group className="mb-3">
            <Form.Label>Continent</Form.Label>
            <Form.Select
              value={ipToCountry.continent_code || 'AS'}
              onChange={handleContinentChange}
            >
              {Object.entries(continentMap).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          
          {/* Start IP */}
          <Form.Group className="mb-3">
            <Form.Label>Start IP</Form.Label>
            <Form.Control
              name="start_ip"
              value={ipToCountry.start_ip || ''}
              onChange={handleChange}
              placeholder="Start IP"
            />
          </Form.Group>

          {/* End IP */}
          <Form.Group className="mb-3">
            <Form.Label>End IP</Form.Label>
            <Form.Control
              name="end_ip"
              value={ipToCountry.end_ip || ''}
              onChange={handleChange}
              placeholder="End IP"
            />
          </Form.Group>
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="primary" onClick={handleSave}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </Form>
      </div>
        {/* ── Conflicts Display ───────────────────────────────────── */}
        {conflictRecords.length > 0 && (
          <>
            <h5 className="mt-4">Conflicting Ranges</h5>
            <Table striped bordered hover size="sm" responsive>
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
                {conflictRecords.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.country_name}</td>
                    <td>{r.country_iso_code}</td>
                    <td>{r.continent_name}</td>
                    <td>{r.continent_code}</td>
                    <td>{r.start_ip}</td>
                    <td>{r.end_ip}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {conflictRecords.length > 1 && (
              <div className="text-muted">
                And {conflictRecords.length - 1} more conflict(s)
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default IPToCountryFormModal;