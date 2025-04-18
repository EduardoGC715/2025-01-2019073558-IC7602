import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Card } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

import SingleConfig from "./configCards/singleConfig";
import MultiConfig from "./configCards/multiConfig";
import WeightConfig from "./configCards/weightConfig";
import GeoConfig from "./configCards/geoConfig";
import RoundTripConfig from "./configCards/roundTripConfig";

const EditRecordModal = ({ show, handleClose, record, onSave }) => {
  const [editedRecord, setEditedRecord] = useState({
    domain: "",
    type: "single",
    direction: "",
    directions: [],
    counter: "",
    weightedDirections: [],
    geoDirections: []
  });

  useEffect(() => {
    if (record) {
      let directions = [];
      let weightedDirections = [];
      let geoDirections = [];

      if (record.type === "multi") {
        directions = record.direction.split(",").map(d => d.trim());
      } else if (record.type === "weight" && record.direction) {
        // Convertir de formato "ip:peso,ip:peso" a array de objetos
        weightedDirections = record.direction.split(",").map(item => {
          const [ip, weight] = item.trim().split(":");
          return { ip: ip || "", weight: weight || "" };
        });
      } else if (record.type === "geo" && record.direction) {
        // Convertir de formato "ip:país,ip:país" a array de objetos
        geoDirections = record.direction.split(",").map(item => {
          const [ip, country] = item.trim().split(":");
          return { ip: ip || "", country: country || "" };
        });
      }

      setEditedRecord({
        ...record,
        directions,
        weightedDirections,
        geoDirections,
        direction: ["multi", "weight", "geo"].includes(record.type) ? "" : record.direction
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

  // Handlers para direcciones múltiples (tipo "multi")
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

  // Handlers para tipo "weight"
  const handleAddWeightedDirection = () => {
    setEditedRecord(prev => ({
      ...prev,
      weightedDirections: [...(prev.weightedDirections || []), { ip: '', weight: '' }]
    }));
  };

  const handleWeightedDirectionChange = (index, field, value) => {
    const newDirections = [...editedRecord.weightedDirections];
    newDirections[index] = { ...newDirections[index], [field]: value };
    setEditedRecord(prev => ({
      ...prev,
      weightedDirections: newDirections
    }));
  };

  const handleRemoveWeightedDirection = (index) => {
    const newDirections = [...editedRecord.weightedDirections];
    newDirections.splice(index, 1);
    setEditedRecord(prev => ({
      ...prev,
      weightedDirections: newDirections
    }));
  };

  // Handlers para tipo "geo"
  const handleAddGeoDirection = () => {
    setEditedRecord(prev => ({
      ...prev,
      geoDirections: [...(prev.geoDirections || []), { ip: '', country: '' }]
    }));
  };

  const handleGeoDirectionChange = (index, field, value) => {
    const newDirections = [...editedRecord.geoDirections];
    newDirections[index] = { ...newDirections[index], [field]: value };
    setEditedRecord(prev => ({
      ...prev,
      geoDirections: newDirections
    }));
  };

  const handleRemoveGeoDirection = (index) => {
    const newDirections = [...editedRecord.geoDirections];
    newDirections.splice(index, 1);
    setEditedRecord(prev => ({
      ...prev,
      geoDirections: newDirections
    }));
  };

  const isValidDomain = (domain) => {
    const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;
    return domainRegex.test(domain);
  };

  const handleSave = () => {
    let updatedDirection = editedRecord.direction;

    if (editedRecord.type === "multi") {
      updatedDirection = editedRecord.directions.join(", ");
    } else if (editedRecord.type === "weight") {
      updatedDirection = editedRecord.weightedDirections
        .map(item => `${item.ip}:${item.weight}`)
        .join(", ");
    } else if (editedRecord.type === "geo") {
      updatedDirection = editedRecord.geoDirections
        .map(item => `${item.ip}:${item.country}`)
        .join(", ");
    }

    const updatedRecord = {
      ...editedRecord,
      direction: updatedDirection
    };

    onSave(updatedRecord);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Registro DNS</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Dominio <span style={{ color: "#6c757d" }}>(Debe terminar en .com, .net o similares)</span></Form.Label>
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

          {/* SINGLE */}
          {editedRecord.type === "single" && (
            <SingleConfig editedRecord={editedRecord} handleInputChange={handleInputChange} />
          )}

          {/* MULTI */}
          {editedRecord.type === "multi" && (
            <MultiConfig
              editedRecord={editedRecord}
              handleInputChange={handleInputChange}
              handleAddDirection={handleAddDirection}
              handleDirectionChange={handleDirectionChange}
              handleRemoveDirection={handleRemoveDirection}
            />
          )}

          {/* WEIGHT */}
          {editedRecord.type === "weight" && (
            <WeightConfig
              editedRecord={editedRecord}
              handleAddWeightedDirection={handleAddWeightedDirection}
              handleWeightedDirectionChange={handleWeightedDirectionChange}
              handleRemoveWeightedDirection={handleRemoveWeightedDirection}
            />
          )}

          {/* GEO */}
          {editedRecord.type === "geo" && (
            <GeoConfig
              editedRecord={editedRecord}
              handleAddGeoDirection={handleAddGeoDirection}
              handleGeoDirectionChange={handleGeoDirectionChange}
              handleRemoveGeoDirection={handleRemoveGeoDirection}
            />
          )}

          {/* ROUND-TRIP */}
          {editedRecord.type === "round-trip" && (
            <RoundTripConfig
              editedRecord={editedRecord}
              handleInputChange={handleInputChange}
            />
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
          !isValidDomain(editedRecord.domain) || (
            editedRecord.type === "multi"
              ? editedRecord.directions.length === 0
              : editedRecord.type === "weight"
                ? !editedRecord.weightedDirections || editedRecord.weightedDirections.length === 0
                : editedRecord.type === "geo"
                  ? !editedRecord.geoDirections || editedRecord.geoDirections.length === 0
                  : !editedRecord.direction
          )
        }
      >
          Guardar Cambios
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditRecordModal;