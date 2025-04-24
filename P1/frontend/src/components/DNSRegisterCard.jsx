import React, { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";

import SingleConfig from "./configCards/singleConfig";
import MultiConfig from "./configCards/multiConfig";
import WeightConfig from "./configCards/weightConfig";
import GeoConfig from "./configCards/geoConfig";
import RoundTripConfig from "./configCards/roundTripConfig";
import { dnsApi} from "../services/api";


const DNSRegisterCard = ({
  show,
  handleClose,
  newRecord,
  handleInputChange
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

  const handleAddRecord = async () => {
    try {
      // Objeto base para todos los tipos
      let recordData = {
        domain: localRecord.domain,
        type: localRecord.type,
        status: true // Todos los registros nuevos inician como activos
      };

      // Estructurar los datos según el tipo de registro
      switch (localRecord.type) {
        case 'single':
          recordData = {
            ...recordData,
            direction: localRecord.direction
          };
          break;

        case 'multi':
          recordData = {
            ...recordData,
            direction: localRecord.directions, 
            counter: localRecord.counter
          };
          break;

        case 'weight':
          recordData = {
            ...recordData,
            direction: localRecord.weightedDirections.map(wd => wd.ip),
            weight: localRecord.weightedDirections.map(wd => wd.weight.toString())
          };
          break;

        case 'geo':
          const geoDirectionsObj = {};
          localRecord.geoDirections.forEach(gd => {
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
            direction: localRecord.directions // Array de direcciones
          };
          break;

        default:
          throw new Error('Tipo de registro no válido');
      }

      // Llamar a la API para crear el registro
      const result = await dnsApi.createDNSRecord(recordData);

      if (result.success) {
        window.location.reload();

      } else {
        alert(`Error al crear el registro: ${result.message}`);
      }
    } catch (error) {
      console.error('Error al crear el registro:', error);
      alert('Error al crear el registro DNS');
    }
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
            <Form.Label>Routing Policy</Form.Label>
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
            <RoundTripConfig
              editedRecord={localRecord}
              handleInputChange={handleLocalInputChange}
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
            name="acceptable_codes"
            placeholder="200, 304"
            value={localRecord.healthcheck_settings?.acceptable_codes || "200, 304"}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Crontab</Form.Label>
          <Form.Control
            type="text"
            name="crontab"
            placeholder="*/1 * * * *"
            value={localRecord.healthcheck_settings?.crontab || "*/1 * * * *"}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Número de reintentos</Form.Label>
          <Form.Control
            type="number"
            name="max_retries"
            placeholder="3"
            value={localRecord.healthcheck_settings?.max_retries || 3}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Path</Form.Label>
          <Form.Control
            type="text"
            name="path"
            placeholder="/"
            value={localRecord.healthcheck_settings?.path || "/"}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Port</Form.Label>
          <Form.Control
            type="number"
            name="port"
            placeholder="80"
            value={localRecord.healthcheck_settings?.port || 80}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Timeout (ms)</Form.Label>
          <Form.Control
            type="number"
            name="timeout"
            placeholder="5000"
            value={localRecord.healthcheck_settings?.timeout || 5000}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Tipo de request</Form.Label>
          <Form.Select
            name="type"
            value={localRecord.healthcheck_settings?.type || "http"}
            onChange={handleLocalInputChange}
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
          onClick={() => {
            handleAddRecord();
          }}
          disabled={
            !isValidDomain(localRecord.domain) ||
            (localRecord.type === "single" && !localRecord.direction) ||
            (localRecord.type === "multi" && (!localRecord.directions || localRecord.directions.length === 0)) ||
            (localRecord.type === "weight" && (!localRecord.weightedDirections || localRecord.weightedDirections.length === 0 || 
                localRecord.weightedDirections.some(dir => !dir.ip || !dir.weight))) ||
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