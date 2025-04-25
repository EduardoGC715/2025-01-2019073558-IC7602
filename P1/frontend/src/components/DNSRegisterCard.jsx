import React, { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";

import SingleConfig from "./configCards/singleConfig";
import MultiConfig from "./configCards/multiConfig";
import WeightConfig from "./configCards/weightConfig";
import GeoConfig from "./configCards/geoConfig";
import RoundTripConfig from "./configCards/roundTripConfig";
import { dnsApi, databaseApi} from "../services/api";


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

  // Sincronizar con props
  useEffect(() => {
    setLocalRecord({
      domain: newRecord.domain || "",
      type: newRecord.type || "single",
      direction: newRecord.direction || "",
      directions: newRecord.directions || [],
      counter: newRecord.counter ?? "",
      weightedDirections: newRecord.weightedDirections || [],
      geoDirections: newRecord.geoDirections || [],
      healthcheck_settings: newRecord.healthcheck_settings || {
        acceptable_codes: "200, 304",
        crontab: "*/1 * * * *",
        max_retries: 3,
        path: "/",
        port: 80,
        timeout: 5000,
        type: "http"
      }
    });
  }, [newRecord]);

  
  // Handlers para actualizar estado local y propagar cambios
  const handleLocalInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "domain" && !value.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      console.log("Dominio no válido");
    }

    // Check if the input is a healthcheck setting
    if (name.startsWith('healthcheck_')) {
      const settingName = name.replace('healthcheck_', '');
      setLocalRecord(prev => ({
        ...prev,
        healthcheck_settings: {
          ...prev.healthcheck_settings,
          [settingName]: value
        }
      }));
    } else {
      setLocalRecord(prev => ({
        ...prev,
        [name]: value
      }));
      handleInputChange(e);
    }
  };

  const handleAddRecord = async () => {
    try {
      let recordData = {
        domain: localRecord.domain,
        type: localRecord.type,
        status: true,
        healthcheck_settings: {
          acceptable_codes: localRecord.healthcheck_settings.acceptable_codes,
          crontab: localRecord.healthcheck_settings.crontab,
          max_retries: parseInt(localRecord.healthcheck_settings.max_retries),
          path: localRecord.healthcheck_settings.path,
          port: parseInt(localRecord.healthcheck_settings.port),
          timeout: parseInt(localRecord.healthcheck_settings.timeout),
          type: localRecord.healthcheck_settings.type
        }
      };
  
      const requiredHealthcheckFields = ['acceptable_codes', 'crontab', 'max_retries', 'path', 'port', 'timeout', 'type'];
      const missingFields = requiredHealthcheckFields.filter(field => !recordData.healthcheck_settings[field]);
  
      if (missingFields.length > 0) {
        throw new Error(`Faltan campos requeridos de healthcheck: ${missingFields.join(', ')}`);
      }
  
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
            direction: localRecord.directions.join(","),
            counter: localRecord.counter
          };
          break;
  
        case 'weight':
          recordData = {
            ...recordData,
            direction: localRecord.weightedDirections
              .map(wd => `${wd.ip}:${wd.weight}`)
              .join(',')
          };
          break;
  
        case 'geo':
          for (let i = 0; i < localRecord.geoDirections.length; i++) {
            const item = localRecord.geoDirections[i];
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
            direction: localRecord.geoDirections
              .map(gd => `${gd.ip}:${gd.country}`)
              .join(',')
          };
          break;
  
        case 'round-trip':
          recordData = {
            ...recordData,
            direction: localRecord.directions.join(",")
          };
          break;
  
        default:
          throw new Error('Tipo de registro no válido');
      }
  
      const result = await dnsApi.createDNSRecord(recordData);
  
      if (result.success) {
        window.location.reload();
      } else {
        alert(`Error al crear el registro: ${result.message || 'Error desconocido'}`);
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
            name="healthcheck_acceptable_codes"
            placeholder="200, 304"
            value={localRecord.healthcheck_settings.acceptable_codes}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Crontab</Form.Label>
          <Form.Control
            type="text"
            name="healthcheck_crontab"
            placeholder="*/1 * * * *"
            value={localRecord.healthcheck_settings.crontab}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Número de reintentos</Form.Label>
          <Form.Control
            type="number"
            name="healthcheck_max_retries"
            placeholder="3"
            value={localRecord.healthcheck_settings.max_retries}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Path</Form.Label>
          <Form.Control
            type="text"
            name="healthcheck_path"
            placeholder="/"
            value={localRecord.healthcheck_settings.path}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Port</Form.Label>
          <Form.Control
            type="number"
            name="healthcheck_port"
            placeholder="80"
            value={localRecord.healthcheck_settings.port}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Timeout (ms)</Form.Label>
          <Form.Control
            type="number"
            name="healthcheck_timeout"
            placeholder="5000"
            value={localRecord.healthcheck_settings.timeout}
            onChange={handleLocalInputChange}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Tipo de request</Form.Label>
          <Form.Select
            name="healthcheck_type"
            value={localRecord.healthcheck_settings.type}
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