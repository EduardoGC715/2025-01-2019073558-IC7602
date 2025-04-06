import React, { useState } from 'react';
import { Table, Form, InputGroup, FormControl, Button, Modal } from 'react-bootstrap';
import { ArrowDown, Pencil, Trash2, Plus } from 'lucide-react';
import IPToCountryFormModal from './../components/IPToCountryFormModal';
import { toast } from 'react-toastify';

const ipToInteger = (ip) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
};

const IPToCountryDashboard = () => {
  // States for search/filtering
  const [searchValue, setSearchValue] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');

  // States for modal and editing
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIPToCountry, setSelectedIPToCountry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // States for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Adjust as needed

  // States for sorting
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // States for deletion confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Dummy data defined as an object with keys as the id
  const dummyData = {
    "16777472": {
      continent_code: "AS",
      continent_name: "Asia",
      country_iso_code: "CN",
      country_name: "China",
      start_ip: "1.0.1.0",
      end_ip: "1.0.3.255"
    },
    "33554432": {
      continent_code: "EU",
      continent_name: "Europe",
      country_iso_code: "DE",
      country_name: "Germany",
      start_ip: "2.16.0.0",
      end_ip: "2.16.255.255"
    },
    "50331648": {
      continent_code: "SA",
      continent_name: "South America",
      country_iso_code: "BR",
      country_name: "Brazil",
      start_ip: "177.0.0.0",
      end_ip: "177.255.255.255"
    },
    "67108864": {
      continent_code: "NA",
      continent_name: "North America",
      country_iso_code: "US",
      country_name: "United States",
      start_ip: "3.0.0.0",
      end_ip: "3.255.255.255"
    }
  };

  const dummyDataArray = Object.entries(dummyData).map(([id, item]) => ({ id, ...item }));

  const filteredData = dummyDataArray.filter(item => {
    if (!searchValue) return true;
    if (searchColumn === 'all') {
      return Object.values(item).some(val =>
        String(val).toLowerCase().includes(searchValue.toLowerCase())
      );
    } else if (searchColumn === 'ip') {
      try {
        const ipValue = ipToInteger(searchValue);
        const start = ipToInteger(item.start_ip);
        const end = ipToInteger(item.end_ip);
        return ipValue >= start && ipValue <= end;
      } catch (error) {
        return false;
      }
    } else {
      return String(item[searchColumn] || '').toLowerCase().includes(searchValue.toLowerCase());
    }
  });

  // Sorting logic
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let aValue = a[sortField];
    let bValue = b[sortField];
    // For IP fields, convert to integer
    if (sortField === 'start_ip' || sortField === 'end_ip') {
      aValue = ipToInteger(aValue);
      bValue = ipToInteger(bValue);
    }
    // For id, compare numerically
    if (sortField === 'id') {
      aValue = parseInt(aValue, 10);
      bValue = parseInt(bValue, 10);
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handlers for sorting, pagination, and modal actions
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
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
      console.log('Saved:', selectedIPToCountry);
    }
    setModalOpen(false);
  };

  // When delete is clicked, set the candidate and show the deletion confirmation modal
  const handleDelete = (item) => {
    setDeleteCandidate(item);
    setShowDeleteModal(true);
  };

  // Called when the user confirms deletion
  const confirmDelete = () => {
    if (deleteCandidate) {
      console.log('Deleted:', deleteCandidate);
      toast.success(`IPToCountry ${deleteCandidate.country_name} deleted successfully`);
      // Optionally: remove the item from your data source.
    }
    setShowDeleteModal(false);
    setDeleteCandidate(null);
    setModalOpen(false);
  };

  // Called when the user cancels deletion
  const cancelDelete = () => {
    toast.info('Deletion cancelled');
    setShowDeleteModal(false);
    setDeleteCandidate(null);
  };

  const renderPagination = () => {
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? 'primary' : 'outline-primary'}
          onClick={() => handlePageChange(i)}
          className="me-1"
        >
          {i}
        </Button>
      );
    }
    return pages;
  };

  return (
    <div className="container py-4">
      {/* Search and filter controls */}
      <div className="d-flex gap-2 mb-3 align-items-center justify-content-between">
        <div className="d-flex gap-2 align-items-center">
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
            style={{ maxWidth: '200px' }}
            onChange={(e) => {
              setSearchColumn(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="id">ID</option>
            <option value="country_name">Country</option>
            <option value="continent_name">Continent</option>
            <option value="ip">IP</option>
          </Form.Select>
        </div>
        <Button variant="success" onClick={openCreateModal}>
          <Plus size={16} className="me-1" /> Add IPToCountry
        </Button>
      </div>

      {/* Table displaying the data */}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th className="cursor-pointer" onClick={() => handleSort('id')}>
              ID {sortField === 'id' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('country_name')}>
              Country Name {sortField === 'country_name' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('country_iso_code')}>
              Country ISO Code {sortField === 'country_iso_code' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('continent_name')}>
              Continent Name {sortField === 'continent_name' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('continent_code')}>
              Continent Code {sortField === 'continent_code' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('start_ip')}>
              Start IP {sortField === 'start_ip' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
            </th>
            <th className="cursor-pointer" onClick={() => handleSort('end_ip')}>
              End IP {sortField === 'end_ip' && (sortOrder === 'asc' ? <ArrowDown size={14} /> : <ArrowDown size={14} style={{ transform: 'rotate(180deg)' }} />)}
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
                  onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
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
        ipToCountry={selectedIPToCountry || {}}
        isEditing={isEditing}
      />

      {/* Deletion Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={cancelDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteCandidate && (
            <p>Are you sure you want to delete IPToCountry {deleteCandidate.country_name}?</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDelete}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default IPToCountryDashboard;
