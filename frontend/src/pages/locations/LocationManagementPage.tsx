import { useState } from 'react'
import { LocationsDashboard } from './LocationsDashboard'
import { CountriesPage } from './CountriesPage'
import { RegionsPage } from './RegionsPage'
import { TerritoriesPage } from './TerritoriesPage'
import { NormalizationPage } from './NormalizationPage'
import { AnalyticsPage } from './AnalyticsPage'
import { MapPage } from './MapPage'
import { Separator } from '@/components/ui/separator'

type Tab = 'dashboard' | 'countries' | 'regions' | 'territories' | 'normalization' | 'analytics' | 'map'

const tabs: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'countries', label: 'Countries' },
  { key: 'regions', label: 'Regions' },
  { key: 'territories', label: 'Territories' },
  { key: 'normalization', label: 'Normalization' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'map', label: 'Map' },
]

export function LocationManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Location Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage countries, regions, territories, and normalize lead addresses
        </p>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <LocationsDashboard />}
      {activeTab === 'countries' && <CountriesPage />}
      {activeTab === 'regions' && <RegionsPage />}
      {activeTab === 'territories' && <TerritoriesPage />}
      {activeTab === 'normalization' && <NormalizationPage />}
      {activeTab === 'analytics' && <AnalyticsPage />}
      {activeTab === 'map' && <MapPage />}
    </div>
  )
}
