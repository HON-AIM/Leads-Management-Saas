import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import 'leaflet/dist/leaflet.css'

export function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (mapInstanceRef.current) return

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return

      const L = await import('leaflet')

      const map = L.map(mapRef.current, {
        center: [39.8283, -98.5795],
        zoom: 4,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      const routePoints: [number, number][] = [
        [40.7128, -74.006],   // NYC
        [41.8781, -87.6298],  // Chicago
        [39.7392, -104.9903], // Denver
        [34.0522, -118.2437], // Los Angeles
      ]

      const markers = L.layerGroup()

      routePoints.forEach((point) => {
        const marker = L.marker(point)
        marker.bindPopup(`<b>${point[0].toFixed(2)}, ${point[1].toFixed(2)}</b>`)
        markers.addLayer(marker)
      })

      map.addLayer(markers)

      L.polyline(routePoints, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(map)

      const deliveryAreas: [number, number][][] = [
        [
          [40.7484, -73.9856],
          [40.7484, -73.9756],
          [40.7384, -73.9756],
          [40.7384, -73.9856],
        ],
        [
          [41.8881, -87.6398],
          [41.8881, -87.6198],
          [41.8681, -87.6198],
          [41.8681, -87.6398],
        ],
      ]

      deliveryAreas.forEach((area) => {
        L.polygon(area, {
          color: '#22c55e',
          weight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.15,
        }).addTo(map)
      })

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery Route Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="h-[600px] w-full rounded-lg border" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block h-3 w-6 rounded bg-blue-500 opacity-70" />
              <span className="text-muted-foreground">Optimized Route</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">NYC &rarr; Chicago &rarr; Denver &rarr; LA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block h-3 w-6 rounded border-2 border-emerald-500 bg-emerald-500/15" />
              <span className="text-muted-foreground">Delivery Zones</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Manual delivery area polygons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block h-3 w-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Lead Locations</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Geocoded lead positions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
