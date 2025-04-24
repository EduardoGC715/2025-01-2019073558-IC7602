import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Card } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";
import { dnsApi } from "../services/api";

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
    geoDirections: [],
    healthcheck_settings: {
      acceptable_codes: "200, 304",
      crontab: "*/1 * * * *",
      max_retries: 3,
      path: "/",
      port: 80,
      timeout: 5000,
      type: "http"
    }
  });

  useEffect(() => {
    if (record) {
      let directions = [];
      let weightedDirections = [];
      let geoDirections = [];

      if (record.type === "multi") {
        directions = record.direction.split(",").map(d => d.trim());
      } else if (record.type === "weight" && record.direction) {
        weightedDirections = record.direction.split(",").map(item => {
          const [ip, weight] = item.trim().split(":");
          return { ip: ip || "", weight: weight || "" };
        });
      } else if (record.type === "geo" && record.direction) {
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
        direction: ["multi", "weight", "geo"].includes(record.type) ? "" : record.direction,
        healthcheck_settings: record.healthcheck_settings || {
          acceptable_codes: "200, 304",
          crontab: "*/1 * * * *",
          max_retries: 3,
          path: "/",
          port: 80,
          timeout: 5000,
          type: "http"
        }
      });
    }
  }, [record]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('healthcheck_')) {
      const settingName = name.replace('healthcheck_', '');
      setEditedRecord(prev => ({
        ...prev,
        healthcheck_settings: {
          ...prev.healthcheck_settings,
          [settingName]: value
        }
      }));
    } else {
      setEditedRecord(prev => ({
        ...prev,
        [name]: value
      }));
    }
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

  const handleSave = async () => {
    try {
      let recordData = {
        domain: editedRecord.domain,
        type: editedRecord.type,
        status: true,
        healthcheck_settings: {
          acceptable_codes: editedRecord.healthcheck_settings.acceptable_codes,
          crontab: editedRecord.healthcheck_settings.crontab,
          max_retries: parseInt(editedRecord.healthcheck_settings.max_retries),
          path: editedRecord.healthcheck_settings.path,
          port: parseInt(editedRecord.healthcheck_settings.port),
          timeout: parseInt(editedRecord.healthcheck_settings.timeout),
          tipoRequest: editedRecord.healthcheck_settings.type
        }
      };

      // Estructurar los datos según el tipo de registro
      switch (editedRecord.type) {
        case 'single':
          recordData = {
            ...recordData,
            direction: editedRecord.direction
          };
          break;

        case 'multi':
          recordData = {
            ...recordData,
            direction: editedRecord.directions,
            counter: editedRecord.counter
          };
          break;

        case 'weight':
          recordData = {
            ...recordData,
            direction: editedRecord.weightedDirections.map(wd => wd.ip),
            weight: editedRecord.weightedDirections.map(wd => wd.weight.toString())
          };
          break;

        case 'geo':
          const geoDirectionsObj = {};
          editedRecord.geoDirections.forEach(gd => {
            geoDirectionsObj[gd.country] = gd.ip;
          });
          
          recordData = {
            ...recordData,
            direction: geoDirectionsObj
          };
          break;

        case 'round-trip':
          recordData = {
            ...recordData,
            direction: editedRecord.directions
          };
          break;
      }

      const result = await dnsApi.editDNSRecord(recordData);

      if (result.success) {
        handleClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error al actualizar el registro:', error);
    }
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

          <hr />
          <h6>Configuración del Healthcheck</h6>

          <Form.Group className="mb-3">
            <Form.Label>Códigos aceptados</Form.Label>
            <Form.Control
              type="text"
              name="healthcheck_acceptable_codes"
              placeholder="200, 304"
              value={editedRecord.healthcheck_settings.acceptable_codes}
              onChange={handleInputChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Crontab</Form.Label>
            <Form.Control
              type="text"
              name="healthcheck_crontab"
              placeholder="*/1 * * * *"
              value={editedRecord.healthcheck_settings.crontab}
              onChange={handleInputChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Número de reintentos</Form.Label>
            <Form.Control
              type="number"
              name="healthcheck_max_retries"
              placeholder="3"
              value={editedRecord.healthcheck_settings.max_retries}
              onChange={handleInputChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Path</Form.Label>
            <Form.Control
              type="text"
              name="healthcheck_path"
              placeholder="/"
              value={editedRecord.healthcheck_settings.path}
              onChange={handleInputChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Port</Form.Label>
            <Form.Control
              type="number"
              name="healthcheck_port"
              placeholder="80"
              value={editedRecord.healthcheck_settings.port}
              onChange={handleInputChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Timeout (ms)</Form.Label>
            <Form.Control
              type="number"
              name="healthcheck_timeout"
              placeholder="5000"
              value={editedRecord.healthcheck_settings.timeout}
              onChange={handleInputChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo de request</Form.Label>
            <Form.Select
              name="healthcheck_type"
              value={editedRecord.healthcheck_settings.type}
              onChange={(e) => {
                const { value } = e.target;
                setEditedRecord(prev => ({
                  ...prev,
                  healthcheck_settings: {
                    ...prev.healthcheck_settings,
                    type: value
                  }
                }));
              }}
            >
              <option value="http">HTTP</option>
              <option value="tcp">TCP</option>
            </Form.Select>
          </Form.Group>
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