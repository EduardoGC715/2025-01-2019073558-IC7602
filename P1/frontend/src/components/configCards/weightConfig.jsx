import { Card, Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

const WeightConfig = ({ editedRecord, handleAddWeightedDirection, handleWeightedDirectionChange, handleRemoveWeightedDirection }) => (
  <Card className="mb-3">
    <Card.Header>Configuración Weight</Card.Header>
    <Card.Body>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Label>Direcciones IP con peso</Form.Label>
        <Button variant="outline-primary" size="sm" onClick={handleAddWeightedDirection}>
          <Plus size={16} className="me-1" /> Agregar IP con peso
        </Button>
      </div>

      {editedRecord.weightedDirections?.map((item, index) => (
        <div key={index} className="d-flex mb-2">
          <Form.Control 
            type="text" 
            value={item.ip}
            onChange={(e) => handleWeightedDirectionChange(index, 'ip', e.target.value)}
            placeholder="192.168.1.1"
            className="me-2"
          />
          <Form.Control 
            type="number" 
            value={item.weight}
            onChange={(e) => handleWeightedDirectionChange(index, 'weight', e.target.value)}
            placeholder="10"
            className="me-2"
          />
          <Button variant="outline-danger" size="sm" onClick={() => handleRemoveWeightedDirection(index)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Form.Text className="text-muted">Formato: IP y valor de peso numérico que juntos tienen que sumar 1</Form.Text>
    </Card.Body>
  </Card>
);

export default WeightConfig;