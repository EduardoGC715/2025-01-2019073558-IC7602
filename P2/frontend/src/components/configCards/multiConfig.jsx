import { Card, Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

const MultiConfig = ({ editedRecord, handleInputChange, handleAddDirection, handleDirectionChange, handleRemoveDirection }) => (
  <Card className="mb-3">
    <Card.Header>Configuración Multi</Card.Header>
    <Card.Body>
      <Form.Group className="mb-3">
        <Form.Label>Counter</Form.Label>
        <Form.Control 
          type="number" 
          name="counter"
          value={editedRecord.counter ?? ''}
          onChange={handleInputChange}
          placeholder="Ingrese un valor numérico" 
        />
      </Form.Group>
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Label>Direcciones IP</Form.Label>
        <Button variant="outline-primary" size="sm" onClick={handleAddDirection}>
          <Plus size={16} className="me-1" /> Agregar IP
        </Button>
      </div>

      {editedRecord.directions.map((direction, index) => (
        <div key={index} className="d-flex mb-2">
          <Form.Control 
            type="text" 
            value={direction}
            onChange={(e) => handleDirectionChange(index, e.target.value)}
            placeholder="192.168.1.1"
            className="me-2"
          />
          <Button variant="outline-danger" size="sm" onClick={() => handleRemoveDirection(index)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
    </Card.Body>
  </Card>
);

export default MultiConfig;