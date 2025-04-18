import { Card, Form } from "react-bootstrap";

const RoundTripConfig = ({ editedRecord, handleInputChange }) => (
  <Card className="mb-3">
    <Card.Header>Configuración Round-Trip</Card.Header>
    <Card.Body>
      <Form.Group>
        <Form.Label>Dirección IP y Latencia</Form.Label>
        <Form.Control 
          type="text" 
          name="direction"
          value={editedRecord.direction}
          onChange={handleInputChange}
          placeholder="192.168.1.1:50ms"
        />
        <Form.Text className="text-muted">
          Formato: IP:latencia (ejemplo: 192.168.1.1:50ms)
        </Form.Text>
      </Form.Group>
    </Card.Body>
  </Card>
);

export default RoundTripConfig;