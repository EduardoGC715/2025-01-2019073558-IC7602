import React, { useState, useEffect } from "react";
import { Row, Col, Card, Table, Button, Badge, Modal } from "react-bootstrap";
import { Edit2, Trash2 } from "lucide-react";
import { ref as firebaseRef, onValue, off } from "firebase/database";
import { database } from "../firebase";
import { Eye } from "lucide-react";

const DNSRecordsTable = ({
  dnsRecords,
  loading,
  onEditRecord,
  onDeleteRecord,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [modalDomain, setModalDomain] = useState(null);
  const [modalHealthData, setModalHealthData] = useState(null);

  useEffect(() => {
    if (!showModal || !modalDomain) return;
    const path = modalDomain.split(".").reverse().join("/");
    const recRef = firebaseRef(database, `/domains/${path}`);
    const unsubscribe = onValue(recRef, (snap) => {
      setModalHealthData(snap.val() || null);
    });
    return () => off(recRef);
  }, [showModal, modalDomain]);

  const getExtraCol = (policy) => {
    if (policy === "weight")
      return { label: "Peso", key: "weight", badgeBg: "info" };
    if (policy === "geo")
      return { label: "Región", key: "country", badgeBg: "secondary" };
    return null;
  };

  const renderDirections = (record) => {
    // Cambia manejo dependiendo del tipo
    if (record.type === "multi" || record.type === "round-trip") {
      if (!record.direction) return;
      const directions = record.direction.split(",").map((d) => d.trim());
      return (
        <div>
          {directions.map((dir, index) => (
            <div key={index}>
              {dir}
              {index < directions.length - 1 && <hr className="my-1" />}
            </div>
          ))}
        </div>
      );
    } else if (record.type === "weight") {
      if (!record.direction) return null;
      return record.direction
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [ip, weight] = pair.split(":");
          return (
            <div
              key={ip}
              className="d-flex align-items-center"
              style={{ gap: "10px" }}
            >
              {ip}
              <span>-</span>
              Peso: {weight}
            </div>
          );
        });
    } else if (record.type === "geo") {
      if (!record.direction) return null;
      return record.direction
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [ip, country] = pair.split(":");
          return (
            <div
              key={ip}
              className="d-flex align-items-center"
              style={{ gap: "10px" }}
            >
              {ip}
              <span>-</span>
              {country}
            </div>
          );
        });
    }
    return record.direction ?? "Sin datos";
  };

  // Componente visual para la tabla de dominios
  return (
    <Row>
      <Col>
        <Card>
          <Card.Header>Registros DNS</Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Dominio</th>
                    <th>Tipo</th>
                    <th>Dirección</th>
                    <th>Health Checks</th>
                    <th style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.id}</td>
                      <td>{record.domain}</td>
                      <td>{record.type}</td>
                      <td className="direction-cell">
                        {renderDirections(record)}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => {
                            setModalDomain(record.domain);
                            setModalHealthData(null);
                            setShowModal(true);
                          }}
                        >
                          <Eye size={16} className="me-1" />
                          Detalles
                        </Button>
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-center">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => onEditRecord(record)}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => onDeleteRecord(record)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {showModal && (
              <Modal
                show={true}
                onHide={() => setShowModal(false)}
                size="lg"
                centered
              >
                <Modal.Header closeButton>
                  <Modal.Title>Health Checks: {modalDomain}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {!modalHealthData ? (
                    <div>Cargando datos…</div>
                  ) : (
                    (() => {
                      const raw = modalHealthData;
                      const extra = getExtraCol(raw.routing_policy);

                      const entries = raw.ip
                        ? [raw.ip]
                        : raw.ips
                        ? Array.isArray(raw.ips)
                          ? raw.ips.map((ip) => ({ ...ip }))
                          : Object.entries(raw.ips).map(([country, ip]) => ({
                              ...ip,
                              country,
                            }))
                        : [];
                      return (
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Dirección</th>
                              {extra && <th>{extra.label}</th>}
                              <th>Estado</th>
                              <th>Resultados</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((ipEntry) => (
                              <tr key={ipEntry.address}>
                                <td>{ipEntry.address}</td>
                                {extra && (
                                  <td>
                                    <Badge bg={extra.badgeBg}>
                                      {ipEntry[extra.key]}
                                    </Badge>
                                  </td>
                                )}
                                <td>
                                  <Badge
                                    bg={ipEntry.health ? "success" : "danger"}
                                  >
                                    {ipEntry.health ? "healthy" : "unhealthy"}
                                  </Badge>
                                </td>
                                <td>
                                  {ipEntry.healthcheck_results &&
                                  Object.keys(ipEntry.healthcheck_results)
                                    .length > 0 ? (
                                    <Table size="sm" borderless>
                                      <thead>
                                        <tr>
                                          <th>Checker</th>
                                          <th>Duración</th>
                                          <th>Éxito</th>
                                          <th>Timestamp</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(
                                          ipEntry.healthcheck_results
                                        ).map(([checker, res]) => (
                                          <tr key={checker}>
                                            <td>{checker}</td>
                                            <td>
                                              {res.duration_ms.toFixed(2)} ms
                                            </td>
                                            <td>
                                              <Badge
                                                bg={
                                                  res.success
                                                    ? "success"
                                                    : "danger"
                                                }
                                              >
                                                {res.success.toString()}
                                              </Badge>
                                            </td>
                                            <td>{res.timestamp}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  ) : (
                                    <div>No hay resultados</div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      );
                    })()
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cerrar
                  </Button>
                </Modal.Footer>
              </Modal>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DNSRecordsTable;
