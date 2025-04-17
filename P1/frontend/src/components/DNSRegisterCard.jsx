import React from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

const DNSRegisterCard = ({ show, handleClose, newRecord, handleInputChange, handleAddRecord }) => {
  const handleAddDirection = () => {
    const updatedDirections = [...newRecord.directions, ""];
    handleInputChange({
      target: { name: "directions", value: updatedDirections }
    });
  };

  const handleRemoveDirection = (index) => {
    const updatedDirections = newRecord.directions.filter((_, i) => i !== index);
    handleInputChange({
      target: { name: "directions", value: updatedDirections }
    });
  };

  const handleDirectionChange = (index, value) => {
    const updatedDirections = [...newRecord.directions];
    updatedDirections[index] = value;
    handleInputChange({
      target: { name: "directions", value: updatedDirections }
    });
  };

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
              <option value="single">Single</option>
              <option value="multi">Multi</option>
              <option value="weight">Weight</option>
              <option value="geo">Geolocation</option>
              <option value="round-trip">Round-trip</option>
            </Form.Select>
          </Form.Group>

          {newRecord.type !== "multi" ? (
            <Form.Group className="mb-3">
              <Form.Label>Dirección IP</Form.Label>
              <Form.Control 
                type="text" 
                name="direction"
                value={newRecord.direction}
                onChange={handleInputChange}
                placeholder="000.000.0.0" 
              />
            </Form.Group>
          ) : newRecord.type === "multi" && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Label>Direcciones IP</Form.Label>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={handleAddDirection}
                  className="d-flex align-items-center"
                >
                  <Plus size={16} className="me-1" />
                  Agregar IP
                </Button>
              </div>
              
              {newRecord.directions.map((direction, index) => (
                <div key={index} className="d-flex mb-2">
                  <Form.Control 
                    type="text" 
                    value={direction}
                    onChange={(e) => handleDirectionChange(index, e.target.value)}
                    placeholder="000.000.0.0"
                    className="me-2"
                  />
                  <Button 
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleRemoveDirection(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleAddRecord}
          disabled={newRecord.type === "multi" && newRecord.directions.length === 0}
        >
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DNSRegisterCard;
