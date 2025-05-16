import DNSRecordsTable from './DNSRecordsTable';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleAddDomain = () => {
    navigate('/register-dns');
  };

  return (
    <div className="min-h-screen bg-light p-4 pt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            UI Domains Resolver
          </h1>
          <button
            onClick={handleAddDomain}
            className="px-4 py-2 bg-primary text-light rounded-md hover:bg-primary/80 transition-colors "
          >
            Agregar Dominio
          </button>
        </div>
        <DNSRecordsTable 
          dnsRecords={[]} 
          loading={false}
          onEditRecord={() => {}}
          onDeleteRecord={() => {}}
          getExtraCol={() => {}}
        />
      </div>
    </div>
  );
};

export default Dashboard;
