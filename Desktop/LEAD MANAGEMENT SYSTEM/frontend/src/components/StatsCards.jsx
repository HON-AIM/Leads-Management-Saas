import { useEffect, useState } from 'react';
import { statsAPI } from '../services/api';

const StatsCards = () => {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalClients: 0,
    leadsToday: 0,
    unassignedLeads: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await statsAPI.get();
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      label: 'Total Leads',
      value: stats.totalLeads,
      icon: '📋',
      color: 'blue'
    },
    {
      label: 'Active Clients',
      value: stats.totalClients,
      icon: '👥',
      color: 'green'
    },
    {
      label: 'Leads Today',
      value: stats.leadsToday,
      icon: '📈',
      color: 'purple'
    },
    {
      label: 'Unassigned Leads',
      value: stats.unassignedLeads,
      icon: '⚠️',
      color: 'red'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`w-12 h-12 bg-${card.color}-100 rounded-full flex items-center justify-center text-2xl`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
