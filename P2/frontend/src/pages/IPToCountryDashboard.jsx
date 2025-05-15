import React, { useState, useEffect } from "react";
import {
  Table,
  Form,
  InputGroup,
  FormControl,
  Button,
  Modal,
} from "react-bootstrap";
import { ArrowDown, Pencil, Trash2, Plus } from "lucide-react";
import IPToCountryFormModal from "./../components/IPToCountryFormModal";
import LookupIPModal from "../components/LookupIPModal";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ArrowLeftCircle } from "lucide-react";
import { databaseApi } from "../services/api";

const ipToInteger = (ip) => {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
};

const IPToCountryDashboard = () => {
  const navigate = useNavigate();

  // Estados para búsquedas y filtros
  const [searchValue, setSearchValue] = useState("");
  const [searchColumn, setSearchColumn] = useState("all");

  // Estados para el modal de edición y creación
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIPToCountry, setSelectedIPToCountry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Estados para ordenar la tabla
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // Estados para la eliminación de registros
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const [showLookupModal, setShowLookupModal] = useState(false);

  const [records, setRecords] = useState([]);
  const [clickedSortColumn, setClickedSortColumn] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await databaseApi.getAllIPToCountryRecords();
      setRecords(data);
    };
    load();
  }, []);

  const handleRecordSaved = (newRecord, oldId) => {
    setRecords((prev) => {
      const lookupId =
        oldId != null && oldId !== newRecord.id ? oldId : newRecord.id;
      const idx = prev.findIndex((r) => r.id === lookupId);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = newRecord;
        return next;
      }
      return [...prev, newRecord];
    });
  };

  const filteredData = records.filter((item) => {
    if (!searchValue) return true;
    if (searchColumn === "all") {
      return Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchValue.toLowerCase())
      );
    } else if (searchColumn === "ip") {
      return (
        item.start_ip.includes(searchValue) ||
        item.end_ip.includes(searchValue) ||
        String(item.id).includes(searchValue)
      );
    } else {
      return String(item[searchColumn] || "")
        .toLowerCase()
        .includes(searchValue.toLowerCase());
    }
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let aValue = a[sortField];
    let bValue = b[sortField];
    if (sortField === "start_ip" || sortField === "end_ip") {
      aValue = ipToInteger(aValue);
      bValue = ipToInteger(bValue);
    }
    if (sortField === "id") {
      aValue = parseInt(aValue, 10);
      bValue = parseInt(bValue, 10);
    }
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field, visualColumn = field) => {
    setClickedSortColumn(visualColumn);
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const openCreateModal = () => {
    setSelectedIPToCountry({});
    setIsEditing(false);
    setModalOpen(true);
  };

  const openEditModal = (ipToCountry) => {
    setSelectedIPToCountry(ipToCountry);
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleModalSubmit = (updatedIPToCountry) => {
    setSelectedIPToCountry(updatedIPToCountry);
  };

  const handleModalClose = (save) => {
    if (save) {
      console.log("Saved:", selectedIPToCountry);
    }
    setModalOpen(false);
  };

  const handleDelete = (item) => {
    setDeleteCandidate(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) {
      setShowDeleteModal(false);
      return;
    }

    const result = await databaseApi.deleteIPToCountryRecord(
      deleteCandidate.id
    );
    if (result.error) {
      toast.error(
        `Error deleting ${deleteCandidate.country_name}: ${result.error}`
      );
    } else {
      toast.success(result.message);
      setRecords((prev) => prev.filter((r) => r.id !== deleteCandidate.id));
    }

    setShowDeleteModal(false);
    setDeleteCandidate(null);
    setModalOpen(false);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteCandidate(null);
  };

  const renderPagination = () => {
    const pages = [];
    const maxToShow = 5;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(start + maxToShow - 1, totalPages);

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "primary" : "outline-primary"}
          onClick={() => handlePageChange(i)}
          className="me-1"
        >
          {i}
        </Button>
      );
    }

    if (end < totalPages) {
      pages.push(
        <span key="ellipsis" className="mx-2">
          …
        </span>
      );
      pages.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? "primary" : "outline-primary"}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="container py-4">
      {/* Controles de filtro y búsquedas */}
      <div className="d-flex gap-2 mb-3 align-items-center justify-content-between">
        <div className="d-flex gap-2 align-items-center">
          <Button
            variant="link"
            className="p-0 me-4 text-dark"
            onClick={() => navigate("/")}
          >
            <ArrowLeftCircle size={24} />
          </Button>
          <InputGroup>
            <FormControl
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setCurrentPage(1);
              }}
            />
          </InputGroup>
          <Form.Select
            defaultValue="all"
            style={{ maxWidth: "200px" }}
            onChange={(e) => {
              setSearchColumn(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="id">ID</option>
            <option value="country_name">País</option>
            <option value="continent_name">Continente</option>
            <option value="ip">IP</option>
          </Form.Select>
        </div>
        <div className="d-flex gap-2">
          <Button variant="success" onClick={openCreateModal}>
            <Plus size={16} className="me-1" /> Agregar IPToCountry
          </Button>
          <Button variant="info" onClick={() => setShowLookupModal(true)}>
            Buscar IP
          </Button>
        </div>
      </div>

      {/* Tabla para desplegar datos */}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th className="cursor-pointer" onClick={() => handleSort("id")}>
              ID{" "}
              {clickedSortColumn === "id" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => handleSort("country_name")}
            >
              País{" "}
              {clickedSortColumn === "country_name" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => handleSort("country_iso_code")}
            >
              Código ISO{" "}
              {clickedSortColumn === "country_iso_code" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => handleSort("continent_name")}
            >
              Continente{" "}
              {clickedSortColumn === "continent_name" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => handleSort("continent_code")}
            >
              Código continente{" "}
              {clickedSortColumn === "continent_code" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => handleSort("id", "start_ip")}
            >
              IP inicial{" "}
              {clickedSortColumn === "start_ip" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => handleSort("id", "end_ip")}
            >
              IP final{" "}
              {clickedSortColumn === "end_ip" &&
                (sortOrder === "asc" ? (
                  <ArrowDown size={14} />
                ) : (
                  <ArrowDown
                    size={14}
                    style={{ transform: "rotate(180deg)" }}
                  />
                ))}
            </th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item, index) => (
            <tr key={index}>
              <td>{item.id}</td>
              <td>{item.country_name}</td>
              <td>{item.country_iso_code}</td>
              <td>{item.continent_name}</td>
              <td>{item.continent_code}</td>
              <td>{item.start_ip}</td>
              <td>{item.end_ip}</td>
              <td className="text-center">
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(item);
                  }}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex justify-content-center mt-3">
        {renderPagination()}
      </div>

      <IPToCountryFormModal
        show={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onDelete={handleDelete}
        onSaved={handleRecordSaved}
        ipToCountry={selectedIPToCountry || {}}
        isEditing={isEditing}
      />

      {/* Modal confirmación de eliminación*/}
      <Modal show={showDeleteModal} onHide={cancelDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteCandidate && (
            <p>
              ¿Está seguro de que desea eliminar el país{" "}
              {deleteCandidate.country_name} con rango{" "}
              {deleteCandidate.start_ip} - {deleteCandidate.end_ip}?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDelete}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Borrar
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Modal Búsqueda IP */}
      <LookupIPModal
        show={showLookupModal}
        onHide={() => setShowLookupModal(false)}
      />
    </div>
  );
};

export default IPToCountryDashboard;
