import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

const IPToCountryFormModal = ({ show, onClose, onSubmit, onDelete, ipToCountry, isEditing }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onSubmit(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? 'Edit IPToCountry' : 'Add IPToCountry'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Country Name</Form.Label>
            <Form.Control
              name="country_name"
              value={ipToCountry.country_name || ''}
              onChange={handleChange}
              placeholder="Country Name"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Country ISO Code</Form.Label>
            <Form.Control
              name="country_iso_code"
              value={ipToCountry.country_iso_code || ''}
              onChange={handleChange}
              placeholder="Country ISO Code"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Continent</Form.Label>
            <Form.Select
              name="continent_code"
              value={ipToCountry.continent_code || 'AS'}
              onChange={e => {
                const code = e.target.value;
                const continentMap = {
                  AF: 'Africa', AN: 'Antarctica', AS: 'Asia',
                  EU: 'Europe', NA: 'North America', OC: 'Oceania', SA: 'South America'
                };
                onSubmit(prev => ({
                  ...prev,
                  continent_code: code,
                  continent_name: continentMap[code]
                }));
              }}>
              <option value="AF">Africa</option>
              <option value="AN">Antarctica</option>
              <option value="AS">Asia</option>
              <option value="EU">Europe</option>
              <option value="NA">North America</option>
              <option value="OC">Oceania</option>
              <option value="SA">South America</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Start IP</Form.Label>
            <Form.Control
              name="start_ip"
              value={ipToCountry.start_ip || ''}
              onChange={handleChange}
              placeholder="Start IP"
            />
          </Form.Group>
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
            <Button variant="primary" onClick={() => onClose(true)}>{isEditing ? 'Update' : 'Create'}</Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default IPToCountryFormModal;
