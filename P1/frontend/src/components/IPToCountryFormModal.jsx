import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { databaseApi } from '../services/api';

const IPToCountryFormModal = ({ show, onClose, onSubmit, onDelete, onSaved, ipToCountry, isEditing }) => {
  const [conflictRecords, setConflictRecords] = useState([]);
  const [allCountries, setAllCountries] = useState([]);

  const continentMap = {
    AF: 'Africa',
    AN: 'Antarctica',
    AS: 'Asia',
    EU: 'Europe',
    NA: 'North America',
    OC: 'Oceania',
    SA: 'South America'
  };

  useEffect(() => {
    if (show) {
      databaseApi.getAllCountries()
        .then(countries => {
          const sorted = countries.sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          setAllCountries(sorted);
        })
        .catch(err => {
          console.error("Error al cargar países:", err);
          toast.error("No se pudo cargar la lista de países");
        });
    }
  }, [show]);
  
  const ipToInt = (ip) => {
    const parts = ip.split(".");
    if (parts.length !== 4) throw new Error("Formato de IP inválido");
    return parts.reduce((acc, part) => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error("Formato de IP inválido");
      }
      return (acc << 8) + num;
    }, 0);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    onSubmit(prev => ({ ...prev, [name]: value }));
  };

  const handleContinentChange = (e) => {
    const code = e.target.value;
    onSubmit(prev => ({
      ...prev,
      continent_code: code,
      continent_name: continentMap[code]
    }));
  };

  const handleSave = async () => {
  setConflictRecords([]);

  const {
    start_ip,
    end_ip,
    continent_code,
    continent_name,
    country_iso_code,
    country_name
  } = ipToCountry;

  // Validar campos obligatorios
  if (!start_ip || !end_ip) {
    toast.error("Se necesitan 'IP de inicio' y 'IP de fin'");
    return;
  }

  let startInt, endInt;
  try {
    startInt = ipToInt(start_ip);
    endInt = ipToInt(end_ip);
  } catch {
    toast.error("Formato de IP inválido");
    return;
  }

  if (startInt >= endInt) {
    toast.error("'IP de inicio' debe ser menor que 'IP de fin'");
    return;
  }

  const requiredFields = {
    "código del continente": continent_code,
    "nombre del continente": continent_name,
    "código del país": country_iso_code,
    "nombre del país": country_name
  };

  const missing = Object.entries(requiredFields).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    toast.error(`Faltan los siguientes campos: ${missing.join(", ")}`);
    return;
  }

  if (!ipToCountry.country_iso_code || !ipToCountry.country_name) {
    toast.error("Por favor seleccione un país.");
    return;
  }
  
  if (!ipToCountry.continent_code || !ipToCountry.continent_name) {
    toast.error("Por favor seleccione un continente.");
    return;
  }

  const fn = isEditing
    ? databaseApi.updateIPToCountryRecord
    : databaseApi.createIPToCountryRecord;

    // prepare payload
    const payload = {
      start_ip:         ipToCountry.start_ip,
      end_ip:           ipToCountry.end_ip,
      continent_code:   ipToCountry.continent_code,
      continent_name:   ipToCountry.continent_name,
      country_iso_code: ipToCountry.country_iso_code,
      country_name:     ipToCountry.country_name,
      ...(isEditing && { original_start_ip: ipToCountry.id })
    };
    
    const result = await fn(payload);

    if (result.error) {
      if (result.conflict) {
        setConflictRecords([result.conflict]);
        toast.error('Rango en conflicto con uno existente');
      } else {
        toast.error(result.error);
      }
    } else {
      toast.success(result.message);
      console.log(result.record)
      onSaved(result.record, ipToCountry.id);
      onClose(true);
    }
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static" size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? 'Editar IPToCountry' : 'Agregar IPToCountry'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <div className="mx-auto" style={{ maxWidth: '500px' }}>
      <Form>
        {isEditing && (
          <Form.Group className="mb-3">
            <Form.Label>ID</Form.Label>
            <Form.Control
              type="text"
              value={ipToCountry.id || ''}
              readOnly
            />
          </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>País</Form.Label>
            <Form.Select
              value={ipToCountry.country_iso_code || ''}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const selected = allCountries.find(c => c.code === selectedCode);
                if (selected) {
                  onSubmit(prev => ({
                    ...prev,
                    country_iso_code: selected.code,
                    country_name: selected.name,
                  }));
                }
              }}
            >
              <option value="">-- Seleccione un país --</option>
              {allCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Continente</Form.Label>
            <Form.Select
              value={ipToCountry.continent_code || ''}
              onChange={handleContinentChange}
            >
              <option value="">-- Seleccione un continente --</option>
              {Object.entries(continentMap).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>IP de inicio</Form.Label>
            <Form.Control
              name="start_ip"
              value={ipToCountry.start_ip || ''}
              onChange={handleChange}
              placeholder="Ej: 192.168.0.1"
              />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>IP de fin</Form.Label>
            <Form.Control
              name="end_ip"
              value={ipToCountry.end_ip || ''}
              onChange={handleChange}
              placeholder="Ej: 192.168.0.254"
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="primary" onClick={handleSave}>
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </div>
        {conflictRecords.length > 0 && (
          <>
            <h5 className="mt-4">Rangos en conflicto</h5>
            <Table striped bordered hover size="sm" responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>País</th>
                  <th>Código ISO</th>
                  <th>Continente</th>
                  <th>Código Continente</th>
                  <th>IP Inicio</th>
                  <th>IP Fin</th>
                </tr>
              </thead>
              <tbody>
                {conflictRecords.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.country_name}</td>
                    <td>{r.country_iso_code}</td>
                    <td>{r.continent_name}</td>
                    <td>{r.continent_code}</td>
                    <td>{r.start_ip}</td>
                    <td>{r.end_ip}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {conflictRecords.length > 1 && (
              <div className="text-muted">
                Y {conflictRecords.length - 1} conflicto(s) más
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default IPToCountryFormModal;