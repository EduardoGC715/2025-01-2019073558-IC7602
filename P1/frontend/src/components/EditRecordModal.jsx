import React, { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

const EditRecordModal = ({ show, handleClose, record, onSave }) => {
  const [editedRecord, setEditedRecord] = useState({
    domain: "",
    type: "single",
    direction: "",
    directions: []
  });

  useEffect(() => {
    if (record) {
      let directions = [];
      if (record.type === "multi") {
        directions = record.direction.split(",").map(d => d.trim());
      }

      setEditedRecord({
        ...record,
        directions,
        direction: record.type === "multi" ? "" : record.direction
      });
    }
  }, [record]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedRecord(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDirection = () => {
    setEditedRecord(prev => ({
      ...prev,
      directions: [...prev.directions, ""]
    }));
  };

  const handleRemoveDirection = (index) => {
    setEditedRecord(prev => ({
      ...prev,
      directions: prev.directions.filter((_, i) => i !== index)
    }));
  };

  const handleDirectionChange = (index, value) => {
    setEditedRecord(prev => ({
      ...prev,
      directions: prev.directions.map((dir, i) => i === index ? value : dir)
    }));
  };

  const handleSave = () => {
    const updatedRecord = {
      ...editedRecord,
      direction: editedRecord.type === "multi" 
        ? editedRecord.directions.join(", ")
        : editedRecord.direction
    };
    onSave(updatedRecord);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Editar Registro DNS</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Dominio</Form.Label>
            <Form.Control 
              type="text" 
              name="domain"
              value={editedRecord.domain}
              onChange={handleInputChange}
              placeholder="ejemplo.com" 
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select 
              name="type"
              value={editedRecord.type}
              onChange={handleInputChange}
            >
              <option value="single">Single</option>
              <option value="multi">Multi</option>
              <option value="weight">Weight</option>
              <option value="geo">Geolocation</option>
              <option value="round-trip">Round-trip</option>
            </Form.Select>
          </Form.Group>

          {editedRecord.type === "multi" ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Form.Label>Direcciones IP</Form.Label>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={handleAddDirection}
                >
                  <Plus size={16} className="me-1" />
                  Agregar IP
                </Button>
              </div>
              
              {editedRecord.directions.map((direction, index) => (
                <div key={index} className="d-flex mb-2">
                  <Form.Control 
                    type="text" 
                    value={direction}
                    onChange={(e) => handleDirectionChange(index, e.target.value)}
                    placeholder="192.168.1.1"
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
          ) : (
            <Form.Group className="mb-3">
              <Form.Label>
                {editedRecord.type === "weight" ? "Dirección IP y Peso (IP:peso)" :
                 editedRecord.type === "geo" ? "Dirección IP y Ubicación (IP:ubicación)" :
                 editedRecord.type === "round-trip" ? "Dirección IP y Latencia (IP:latencia)" :
                 "Dirección IP"}
              </Form.Label>
              <Form.Control 
                type="text" 
                name="direction"
                value={editedRecord.direction}
                onChange={handleInputChange}
                placeholder={
                  editedRecord.type === "weight" ? "192.168.1.1:10" :
                  editedRecord.type === "geo" ? "192.168.1.1:US" :
                  editedRecord.type === "round-trip" ? "192.168.1.1:50ms" :
                  "192.168.1.1"
                }
              />
              {editedRecord.type === "weight" && (
                <Form.Text className="text-muted">
                  Formato: IP:peso (ejemplo: 192.168.1.1:10)
                </Form.Text>
              )}
              {editedRecord.type === "geo" && (
                <Form.Text className="text-muted">
                  Formato: IP:código_país (ejemplo: 192.168.1.1:US)
                </Form.Text>
              )}
              {editedRecord.type === "round-trip" && (
                <Form.Text className="text-muted">
                  Formato: IP:latencia (ejemplo: 192.168.1.1:50ms)
                </Form.Text>
              )}
            </Form.Group>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={
            editedRecord.type === "multi" 
              ? editedRecord.directions.length === 0 
              : !editedRecord.direction
          }
        >
          Guardar Cambios
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditRecordModal; 