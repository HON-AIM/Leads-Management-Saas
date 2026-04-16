import { useEffect, useState } from 'react';
import { clientsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const ClientsTable = () => {
  const [clients, setClients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientsAPI.getAll();
        setClients(response.data);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
    const interval = setInterval(fetchClients, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      full: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.inactive}`}>
        {status?.toUpperCase() || 'INACTIVE'}
      </span>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Clients</h2>
        <button
          onClick={() => navigate('/clients')}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          View All →
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">State</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Cap</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Received</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Remaining</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.slice(0, 5).map((client) => (
              <tr key={client._id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{client.state}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{client.leadCap}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{client.leadsReceived}</td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  <span className={client.leadCap - client.leadsReceived <= 0 ? 'text-red-600 font-medium' : ''}>
                    {Math.max(0, client.leadCap - client.leadsReceived)}
                  </span>
                </td>
                <td className="py-3 px-4">{getStatusBadge(client.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="text-center py-8 text-gray-500">No clients yet</p>
        )}
      </div>
    </div>
  );
};

export default ClientsTable;
