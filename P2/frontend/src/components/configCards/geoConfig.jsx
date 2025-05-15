import { Card, Form, Button } from "react-bootstrap";
import { Plus, Trash2 } from "lucide-react";

// Componente visual para la modificación de geo
const GeoConfig = ({ editedRecord, handleAddGeoDirection, handleGeoDirectionChange, handleRemoveGeoDirection }) => (
  <Card className="mb-3">
    <Card.Header>Configuración Geolocation</Card.Header>
    <Card.Body>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Label>Direcciones IP con ubicación</Form.Label>
        <Button variant="outline-primary" size="sm" onClick={handleAddGeoDirection}>
          <Plus size={16} className="me-1" /> Agregar IP con ubicación
        </Button>
      </div>

      {editedRecord.geoDirections?.map((item, index) => (
        <div key={index} className="d-flex mb-2">
          <Form.Control 
            type="text" 
            value={item.ip}
            onChange={(e) => handleGeoDirectionChange(index, 'ip', e.target.value)}
            placeholder="192.168.1.1"
            className="me-2"
          />
          <Form.Control 
            type="text" 
            value={item.country}
            onChange={(e) => handleGeoDirectionChange(index, 'country', e.target.value)}
            placeholder="US"
            className="me-2"
          />
          <Button variant="outline-danger" size="sm" onClick={() => handleRemoveGeoDirection(index)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Form.Text className="text-muted">Formato: IP y código de país (ejemplo: US, ES, MX)</Form.Text>
    </Card.Body>
  </Card>
);

export default GeoConfig;