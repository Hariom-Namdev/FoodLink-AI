import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Filter, X, MapPin, Store, HeartHandshake, Package } from 'lucide-react';
import { restaurants, ngos, latestDonations } from '../data/content';

// Fix default marker icon for Leaflet in bundler environments
const greenIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 3px rgba(34,197,94,.3),0 0 12px rgba(34,197,94,.6);border:2px solid #fff;"></div>`,
  className: 'foodlink-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const amberIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.3),0 0 12px rgba(245,158,11,.6);border:2px solid #fff;"></div>`,
  className: 'foodlink-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const skyIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.3),0 0 12px rgba(56,189,248,.6);border:2px solid #fff;"></div>`,
  className: 'foodlink-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Approx lat/lng for Indian cities
const cityLatLng: Record<string, [number, number]> = {
  Delhi: [28.6139, 77.209], Mumbai: [19.076, 72.8777], Pune: [18.5204, 73.8567],
  Bengaluru: [12.9716, 77.5946], Hyderabad: [17.385, 78.4867], Chennai: [13.0827, 80.2707],
  Ahmedabad: [23.0225, 72.5714], Jaipur: [26.9124, 75.7873], Lucknow: [26.8467, 80.9462],
  Bhopal: [23.2599, 77.4126], Indore: [22.7196, 75.8577], Nagpur: [21.1458, 79.0882],
  Patna: [25.5941, 85.1376], Kolkata: [22.5726, 88.3639], Surat: [21.1702, 72.8311],
  Chandigarh: [30.7333, 76.7794], Noida: [28.5355, 77.391], Gurugram: [28.4595, 77.0266],
  Kochi: [9.9312, 76.2673], Visakhapatnam: [17.6868, 83.2185], Mysuru: [12.2958, 76.6394],
  Coimbatore: [11.0168, 76.9558], Varanasi: [25.3176, 82.9739], Prayagraj: [25.4358, 81.8463],
  Kanpur: [26.4499, 80.3319], Udaipur: [24.5854, 73.7125], Jodhpur: [26.2389, 73.0243],
  Raipur: [21.2514, 81.6296], Ranchi: [23.3441, 85.3096], Guwahati: [26.1445, 91.7362],
  Amritsar: [31.634, 74.8723],
};

type MarkerData = {
  type: 'restaurant' | 'ngo' | 'donation';
  name: string;
  city: string;
  lat: number;
  lng: number;
  desc: string;
  status?: string;
};

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 6, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export default function LiveMap() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'restaurant' | 'ngo' | 'donation'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');

  const allMarkers: MarkerData[] = useMemo(() => {
    const markers: MarkerData[] = [];
    restaurants.forEach((r) => {
      const ll = cityLatLng[r.city];
      if (ll) markers.push({ type: 'restaurant', name: r.name, city: r.city, lat: ll[0], lng: ll[1], desc: `${r.category} · ${r.meals} meals capacity` });
    });
    ngos.forEach((n) => {
      const ll = cityLatLng[n.city];
      if (ll) markers.push({ type: 'ngo', name: n.name, city: n.city, lat: ll[0], lng: ll[1], desc: `${n.served.toLocaleString('en-IN')} meals served` });
    });
    latestDonations.forEach((d) => {
      const ll = cityLatLng[d.city];
      if (ll) markers.push({ type: 'donation', name: d.restaurant, city: d.city, lat: ll[0], lng: ll[1], desc: `${d.food} · ${d.meals} meals`, status: d.status });
    });
    return markers;
  }, []);

  const filtered = useMemo(() => {
    return allMarkers.filter((m) => {
      if (filter !== 'all' && m.type !== filter) return false;
      if (selectedCity && m.city !== selectedCity) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.city.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allMarkers, filter, selectedCity, search]);

  const center: [number, number] = selectedCity && cityLatLng[selectedCity]
    ? cityLatLng[selectedCity]
    : [22.5, 80];

  const getIcon = (type: string, status?: string) => {
    if (type === 'donation') {
      if (status === 'available') return greenIcon;
      if (status === 'claimed') return amberIcon;
      return skyIcon;
    }
    if (type === 'restaurant') return amberIcon;
    return greenIcon;
  };

  const counts = {
    all: allMarkers.length,
    restaurant: allMarkers.filter((m) => m.type === 'restaurant').length,
    ngo: allMarkers.filter((m) => m.type === 'ngo').length,
    donation: allMarkers.filter((m) => m.type === 'donation').length,
  };

  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-3xl glass">
      {/* Search + filter bar */}
      <div className="absolute left-4 right-4 top-4 z-[1000] flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants, NGOs, cities..."
            className="w-full rounded-xl glass px-10 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${showFilters ? 'bg-primary text-white' : 'glass text-slate-200'}`}
        >
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="absolute left-4 right-4 top-16 z-[1000] rounded-2xl glass p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Filter by type</div>
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'all', label: 'All', icon: MapPin, count: counts.all },
              { id: 'restaurant', label: 'Restaurants', icon: Store, count: counts.restaurant },
              { id: 'ngo', label: 'NGOs', icon: HeartHandshake, count: counts.ngo },
              { id: 'donation', label: 'Donations', icon: Package, count: counts.donation },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  filter === f.id ? 'bg-primary text-white' : 'glass-soft text-slate-300 hover:text-white'
                }`}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Filter by city</div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="" className="bg-ink-soft">All cities</option>
            {Object.keys(cityLatLng).sort().map((c) => (
              <option key={c} value={c} className="bg-ink-soft">{c}</option>
            ))}
          </select>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">{filtered.length} markers shown</span>
            <button
              onClick={() => { setFilter('all'); setSelectedCity(''); setSearch(''); }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-wrap gap-3 rounded-xl glass px-4 py-2.5 text-xs text-slate-300">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white/20" /> Restaurant</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white/20" /> NGO</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-white/20" /> Donation</span>
      </div>

      {/* Leaflet map */}
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: '#0B1120' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="foodlink-dark-tiles"
        />
        <MapController center={center} />
        {filtered.map((m, i) => (
          <Marker key={`${m.type}-${m.name}-${i}`} position={[m.lat, m.lng]} icon={getIcon(m.type, m.status)}>
            <Popup className="foodlink-popup">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  {m.type === 'restaurant' && <Store className="h-3.5 w-3.5" />}
                  {m.type === 'ngo' && <HeartHandshake className="h-3.5 w-3.5" />}
                  {m.type === 'donation' && <Package className="h-3.5 w-3.5" />}
                  {m.name}
                </div>
                <div className="text-xs text-slate-500">{m.city}</div>
                <div className="text-xs text-slate-700">{m.desc}</div>
                {m.status && (
                  <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-700">
                    {m.status}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
