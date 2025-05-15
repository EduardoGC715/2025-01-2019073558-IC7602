import DNSRecordsTable from './DNSRecordsTable';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-light p-4 pt-16">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 text-center">
          UI Domains Resolver
        </h1>
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
