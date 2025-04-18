import { Card, Form } from "react-bootstrap";

const SingleConfig = ({ editedRecord, handleInputChange }) => (
  <Card className="mb-3">
    <Card.Header>Configuración Single</Card.Header>
    <Card.Body>
      <Form.Group>
        <Form.Label>Dirección IP</Form.Label>
        <Form.Control 
          type="text" 
          name="direction"
          value={editedRecord.direction}
          onChange={handleInputChange}
          placeholder="192.168.1.1" 
        />
      </Form.Group>
    </Card.Body>
  </Card>
);

export default SingleConfig;