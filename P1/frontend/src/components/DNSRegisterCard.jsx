import React from "react";
import { Modal, Form, Button } from "react-bootstrap";

const DNSRegisterCard = ({ show, handleClose, newRecord, handleInputChange, handleAddRecord }) => {
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Añadir Nuevo Registro DNS</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Dominio</Form.Label>
            <Form.Control 
              type="text" 
              name="domain"
              value={newRecord.domain}
              onChange={handleInputChange}
              placeholder="ejemplo.com" 
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select 
              name="type"
              value={newRecord.type}
              onChange={handleInputChange}
            >
              <option value="A">A</option>
              <option value="AAAA">AAAA</option>
              <option value="CNAME">CNAME</option>
              <option value="MX">MX</option>
              <option value="TXT">TXT</option>
              <option value="NS">NS</option>
              <option value="SOA">SOA</option>
              <option value="SRV">SRV</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Valor</Form.Label>
            <Form.Control 
              type="text" 
              name="value"
              value={newRecord.value}
              onChange={handleInputChange}
              placeholder="192.168.1.1" 
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>TTL (segundos)</Form.Label>
            <Form.Control 
              type="number" 
              name="ttl"
              value={newRecord.ttl}
              onChange={handleInputChange}
              placeholder="60" 
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleAddRecord}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DNSRegisterCard;
