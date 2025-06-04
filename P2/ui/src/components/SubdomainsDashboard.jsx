import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SubdomainsRecordsTable from './SubdomainsRecordsTable';
import { getSubdomainsByDomain } from '../services/subdomain';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

function SubdomainsDashboard() {
    const { domain } = useParams();            
    const navigate = useNavigate();
    const [subdomains, setSubdomains] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchSubdomains();
    }, [domain]);

    const fetchSubdomains = async () => {
        setIsLoading(true);
        try {
          const dataObj = await getSubdomainsByDomain(domain);
          const records = Object.entries(dataObj).map(([full, info]) => {
          let sub;
          let root = false;
          if (full === domain) {
            sub = "";      
            root = true;                
          } else {
            const suffix = `.${domain}`;
            sub = full.endsWith(suffix) ? full.slice(0, full.length - suffix.length): full;
          }
            return { subdomain: sub, isRoot: root, domain, ...info };
          });
          setSubdomains(records);
        } catch (err) {
            toast.error(`Error al cargar los subdominios: ${err.message}`);
        } finally {
        setIsLoading(false);
        }
    };

    const handleDelete = (rec) => {
        setSubdomains(prev =>
          prev.filter(
            s => s.subdomain !== rec.subdomain || s.isRoot !== rec.isRoot
          )
        );
    };
    
    return (
        <div className="min-h-screen bg-light p-4 pt-16">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-lightgrey2 rounded-full transition-colors"
                        >
                            <ArrowLeft size={24} className="text-secondary" />
                        </button>
                        <h1 className="text-3xl font-bold text-secondary">
                            Subdominios de {domain}
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate(`/domains/${domain}/subdomains/register`)}
                        className="px-4 py-2 bg-primary text-light rounded-md hover:bg-secondary transition-colors hover:cursor-pointer"
                    >
                        Agregar Subdominio
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin h-8 w-8 border-b-2 border-secondary rounded-full"></div>
                    </div>
                ) : (
                    <SubdomainsRecordsTable 
                        subdomains={subdomains} 
                        onDelete={handleDelete} 
                    />
                )}
            </div>
        </div>
    );
}

export default SubdomainsDashboard;
