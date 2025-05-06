import React from 'react';
import { Modal, Button } from 'react-bootstrap';

// Componente visual para eliminar registro
const DeleteConfirmationModal = ({ show, onHide, onConfirm, domain }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirmar Eliminación</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        ¿Está seguro que desea eliminar el dominio <strong>{domain}</strong>?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Borrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteConfirmationModal; 