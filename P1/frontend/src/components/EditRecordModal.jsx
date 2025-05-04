import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Card } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";
import { dnsApi, databaseApi } from "../services/api";

import SingleConfig from "./configCards/singleConfig";
import MultiConfig from "./configCards/multiConfig";
import WeightConfig from "./configCards/weightConfig";
import GeoConfig from "./configCards/geoConfig";
import RoundTripConfig from "./configCards/roundTripConfig";

// Modelo visual para editar un dominio
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

      // Filtra por el tipo de dominio
      if (record.type === "multi" || record.type === "round-trip") {
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

      // Guarda la información del dominio
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

  // Valida que el dominio sea correcto
  const isValidDomain = (domain) => {
    const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;
    return domainRegex.test(domain);
  };

  // Valida que la dirección IP sea correcta
  const isValidIP = (ip) => {
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(ipRegex);
    
    if (!match) return false;
    
    // Verifica que cada octeto esté entre 0 y 255
    for (let i = 1; i <= 4; i++) {
      const octet = parseInt(match[i]);
      if (octet < 0 || octet > 255) return false;
    }
    
    return true;
  };

  const checkWeights = (weightedAddresses) => {
    let sum = 0;
    for (let i = 0; i < weightedAddresses.length; i++) {
      const address = weightedAddresses[i];
      if (address.weight === "" || address.ip === "") {
        return true; // Si hay un campo vacío, no es válido
      }
      const numWeight = Number(address.weight);
      if (isNaN(numWeight) || numWeight < 0) {
        return true; // Si no es un número o es negativo, no es válido
      }
      sum += numWeight;
    }
    return sum !== 1;
  };

  // Guarda la información y la valida antes de mandarla
  const handleSave = async () => {
    try {
      // Validar IPs según el tipo de registro
      if (editedRecord.type === "single" && !isValidIP(editedRecord.direction)) {
        alert("La dirección IP no tiene un formato válido");
        return;
      }

      if (editedRecord.type === "multi" || editedRecord.type === "round-trip") {
        for (const ip of editedRecord.directions) {
          if (!isValidIP(ip)) {
            alert(`La dirección IP "${ip}" no tiene un formato válido`);
            return;
          }
        }
      }

      if (editedRecord.type === "weight") {
        for (const { ip } of editedRecord.weightedDirections) {
          if (!isValidIP(ip)) {
            alert(`La dirección IP "${ip}" no tiene un formato válido`);
            return;
          }
        }
      }

      if (editedRecord.type === "geo") {
        for (const { ip } of editedRecord.geoDirections) {
          if (!isValidIP(ip)) {
            alert(`La dirección IP "${ip}" no tiene un formato válido`);
            return;
          }
        }
      }

      let recordData = {
        domain: editedRecord.domain,
        type: editedRecord.type,
        counter: editedRecord.counter,
        status: true,
        healthcheck_settings: {
          acceptable_codes: editedRecord.healthcheck_settings.acceptable_codes,
          crontab: editedRecord.healthcheck_settings.crontab,
          max_retries: parseInt(editedRecord.healthcheck_settings.max_retries),
          path: editedRecord.healthcheck_settings.path,
          port: parseInt(editedRecord.healthcheck_settings.port),
          timeout: parseInt(editedRecord.healthcheck_settings.timeout),
          type: editedRecord.healthcheck_settings.type
        }
      };
  
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
            direction: editedRecord.directions.join(","),
            counter: editedRecord.counter
          };
          break;
  
        case 'weight':
          recordData = {
            ...recordData,
            direction: editedRecord.weightedDirections
              .map(wd => `${wd.ip}:${wd.weight}`)
              .join(',')
          };
          break;
  
        case 'geo':
          for (let i = 0; i < editedRecord.geoDirections.length; i++) {
            const item = editedRecord.geoDirections[i];
            if (item.ip === "" || item.country === "") {
              alert("Por favor, completa todos los campos de las direcciones geográficas.");
              return;
            }
            try {
              const countryExists = await databaseApi.checkCountry(item.country);
              if (!countryExists) {
                alert(`El país "${item.country}" no es válido.`);
                return;
              }
            } catch (error) {
              console.error("Error al verificar el país:", error);
              alert("Ocurrió un error al verificar el país. Inténtalo de nuevo.");
              return;
            }
          }
          recordData = {
            ...recordData,
            direction: editedRecord.geoDirections
              .map(gd => `${gd.ip}:${gd.country}`)
              .join(',')
          };
          break;
  
        case 'round-trip':
          recordData = {
            ...recordData,
            direction: editedRecord.directions.join(",")
          };
          break;
  
        default:
          throw new Error('Tipo de registro no válido');
      }
      
      // Se publica con la base de datos
      const result = await dnsApi.editDNSRecord(recordData);
  
      if (result.success) {
        handleClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error al actualizar el registro:', error);
    }
  };

  // Componente visual
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
              handleAddDirection={handleAddDirection}
              handleDirectionChange={handleDirectionChange}
              handleRemoveDirection={handleRemoveDirection}
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
        // Boton desactivado hasta que cumpla las validaciones
        disabled={
          !isValidDomain(editedRecord.domain) || (
            editedRecord.type === "multi"
              ? editedRecord.directions.length === 0
              : editedRecord.type === "weight"
                ? !editedRecord.weightedDirections ||
                  editedRecord.weightedDirections.length === 0 || checkWeights(editedRecord.weightedDirections)
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