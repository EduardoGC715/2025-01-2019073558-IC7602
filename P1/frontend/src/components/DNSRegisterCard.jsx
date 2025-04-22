import React, { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

import SingleConfig from "./configCards/singleConfig";
import MultiConfig from "./configCards/multiConfig";
import WeightConfig from "./configCards/weightConfig";
import GeoConfig from "./configCards/geoConfig";
import RoundTripConfig from "./configCards/roundTripConfig";

const DNSRegisterCard = ({
  show,
  handleClose,
  newRecord,
  handleInputChange,
  handleAddRecord
}) => {
  // Inicializar estado local para manejar el formulario
  const [localRecord, setLocalRecord] = useState({
    domain: "",
    type: "single",
    direction: "",
    directions: [],
    counter: "",
    weightedDirections: [],
    geoDirections: []
  });

  // Sincronizar con props
  useEffect(() => {
    setLocalRecord({
      domain: newRecord.domain || "",
      type: newRecord.type || "single",
      direction: newRecord.direction || "",
      directions: newRecord.directions || [],
      counter: newRecord.counter ?? "",
      weightedDirections: newRecord.weightedDirections || [],
      geoDirections: newRecord.geoDirections || []
    });
  }, [newRecord]);

  
  // Handlers para actualizar estado local y propagar cambios
  const handleLocalInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "domain" && !value.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      console.log("Dominio no válido");
    }

    setLocalRecord(prev => ({
      ...prev,
      [name]: value
    }));
    handleInputChange(e);
  };

  // Handlers MULTI
  const handleAddDirection = () => {
    const updatedDirections = [...(localRecord.directions || []), ""];
    setLocalRecord(prev => ({
      ...prev,
      directions: updatedDirections
    }));
    handleInputChange({ target: { name: "directions", value: updatedDirections } });
  };

  const handleDirectionChange = (index, value) => {
    const updatedDirections = [...localRecord.directions];
    updatedDirections[index] = value;
    setLocalRecord(prev => ({
      ...prev,
      directions: updatedDirections
    }));
    handleInputChange({ target: { name: "directions", value: updatedDirections } });
  };

  const handleRemoveDirection = (index) => {
    const updatedDirections = localRecord.directions.filter((_, i) => i !== index);
    setLocalRecord(prev => ({
      ...prev,
      directions: updatedDirections
    }));
    handleInputChange({ target: { name: "directions", value: updatedDirections } });
  };

  // Handlers WEIGHT
  const handleAddWeightedDirection = () => {
    const updated = [...(localRecord.weightedDirections || []), { ip: "", weight: "" }];
    setLocalRecord(prev => ({
      ...prev,
      weightedDirections: updated
    }));
    handleInputChange({ target: { name: "weightedDirections", value: updated } });
  };

  const handleWeightedDirectionChange = (index, field, value) => {
    const updated = [...localRecord.weightedDirections];
    updated[index] = { ...updated[index], [field]: value };
    setLocalRecord(prev => ({
      ...prev,
      weightedDirections: updated
    }));
    handleInputChange({ target: { name: "weightedDirections", value: updated } });
  };

  const handleRemoveWeightedDirection = (index) => {
    const updated = localRecord.weightedDirections.filter((_, i) => i !== index);
    setLocalRecord(prev => ({
      ...prev,
      weightedDirections: updated
    }));
    handleInputChange({ target: { name: "weightedDirections", value: updated } });
  };

  // Handlers GEO
  const handleAddGeoDirection = () => {
    const updated = [...(localRecord.geoDirections || []), { ip: "", country: "" }];
    setLocalRecord(prev => ({
      ...prev,
      geoDirections: updated
    }));
    handleInputChange({ target: { name: "geoDirections", value: updated } });
  };

  const handleGeoDirectionChange = (index, field, value) => {
    const updated = [...localRecord.geoDirections];
    updated[index] = { ...updated[index], [field]: value };
    setLocalRecord(prev => ({
      ...prev,
      geoDirections: updated
    }));
    handleInputChange({ target: { name: "geoDirections", value: updated } });
  };

  const handleRemoveGeoDirection = (index) => {
    const updated = localRecord.geoDirections.filter((_, i) => i !== index);
    setLocalRecord(prev => ({
      ...prev,
      geoDirections: updated
    }));
    handleInputChange({ target: { name: "geoDirections", value: updated } });
  };

  const isValidDomain = (domain) => {
    const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;
    return domainRegex.test(domain);
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
    return sum !== 1; // Si todo es válido, retorna false
  };

  // Función para preparar y enviar el registro con el formato adecuado
  const handleSaveRecord = () => {
    // Copia del registro local para modificaciones
    let recordToSave = { ...localRecord };

    // Procesar direcciones según el tipo de registro
    if (localRecord.type === "multi") {
      // Convertir array de direcciones a string separado por comas
      recordToSave.direction = localRecord.directions.join(", ");
    } 
    else if (localRecord.type === "weight") {
      // Convertir array de objetos {ip, weight} a string con formato "ip:weight, ip:weight"
      recordToSave.direction = localRecord.weightedDirections
        .map(item => `${item.ip}:${item.weight}`)
        .join(", ");
    } 
    else if (localRecord.type === "geo") {
      // Convertir array de objetos {ip, country} a string con formato "ip:country, ip:country"
      recordToSave.direction = localRecord.geoDirections
        .map(item => `${item.ip}:${item.country}`)
        .join(", ");
    }
    
    // Actualizar el estado direction antes de guardar
    handleInputChange({ target: { name: "direction", value: recordToSave.direction } });
    
    // Añadir un pequeño retraso para asegurar que el estado se actualizó
    setTimeout(() => {
      handleAddRecord();
    }, 100);
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Crear Nuevo Registro DNS</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Dominio <span style={{ color: "#6c757d" }}>(Debe terminar en .com, .net o similares)</span></Form.Label>
            <Form.Control
              type="text"
              name="domain"
              value={localRecord.domain}
              onChange={handleLocalInputChange}
              placeholder="ejemplo.com"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select
              name="type"
              value={localRecord.type}
              onChange={handleLocalInputChange}
            >
              <option value="single">Single</option>
              <option value="multi">Multi</option>
              <option value="weight">Weight</option>
              <option value="geo">Geolocation</option>
              <option value="round-trip">Round-trip</option>
            </Form.Select>
          </Form.Group>

          {localRecord.type === "single" && (
            <SingleConfig editedRecord={localRecord} handleInputChange={handleLocalInputChange} />
          )}

          {localRecord.type === "multi" && (
            <MultiConfig
              editedRecord={localRecord}
              handleInputChange={handleLocalInputChange}
              handleAddDirection={handleAddDirection}
              handleDirectionChange={handleDirectionChange}
              handleRemoveDirection={handleRemoveDirection}
            />
          )}

          {localRecord.type === "weight" && (
            <WeightConfig
              editedRecord={localRecord}
              handleInputChange={handleLocalInputChange}
              handleAddWeightedDirection={handleAddWeightedDirection}
              handleWeightedDirectionChange={handleWeightedDirectionChange}
              handleRemoveWeightedDirection={handleRemoveWeightedDirection}
            />
          )}

          {localRecord.type === "geo" && (
            <GeoConfig
              editedRecord={localRecord}
              handleInputChange={handleLocalInputChange}
              handleAddGeoDirection={handleAddGeoDirection}
              handleGeoDirectionChange={handleGeoDirectionChange}
              handleRemoveGeoDirection={handleRemoveGeoDirection}
            />
          )}

          {localRecord.type === "round-trip" && (
            <RoundTripConfig editedRecord={localRecord} handleInputChange={handleLocalInputChange} />
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            console.log(localRecord.domain);
            console.log(localRecord.weightedDirections);
            console.log(localRecord.directions);
            handleAddRecord();
          }}
          disabled={
            !isValidDomain(localRecord.domain) ||
            (localRecord.type === "single" && !localRecord.direction) ||
            (localRecord.type === "multi" && (!localRecord.directions || localRecord.directions.length === 0)) ||
            (localRecord.type === "weight" && (!localRecord.weightedDirections || localRecord.weightedDirections.length === 0 || 
                localRecord.weightedDirections.some(dir => !dir.ip || !dir.weight) || checkWeights(localRecord.weightedDirections)))  ||
            (localRecord.type === "geo" && (!localRecord.geoDirections || localRecord.geoDirections.length === 0 || 
                localRecord.geoDirections.some(dir => !dir.ip || !dir.country)))
          }
        >
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DNSRegisterCard;