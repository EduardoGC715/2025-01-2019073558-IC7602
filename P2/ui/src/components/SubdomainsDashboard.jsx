import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SubdomainsRecordsTable from './SubdomainsRecordsTable';
import { getSubdomainsByDomain } from '../services/subdomain';
import { ArrowLeft } from 'lucide-react';

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
        const records = await getSubdomainsByDomain(domain);
        setSubdomains(records);
        } catch (err) {
        console.error('Error fetching subdomains:', err);
        } finally {
        setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-light p-4 pt-16">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                    <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">
                    Subdominios de {domain}
                    </h1>
                </div>
                <button
                    onClick={() => navigate(`/domains/${domain}/subdomains/register`)}
                    className="px-4 py-2 bg-primary text-secundary rounded-md hover:bg-primary/80 transition-colors hover:cursor-pointer"
                >
                    Agregar Subdominio
                </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-10">
                    <div className="animate-spin h-8 w-8 border-b-2 rounded-full"></div>
                    </div>
                ) : (
                    <SubdomainsRecordsTable subdomains={subdomains} />
                )}
            </div>
        </div>
    );
}

export default SubdomainsDashboard;
