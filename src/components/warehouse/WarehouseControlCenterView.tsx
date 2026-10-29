import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  Plus,
  Search,
  AlertTriangle,
  Package,
  ArrowLeftRight,
  RefreshCw,
  Snowflake,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { warehouseService } from '../../services/warehouseService';
import { Warehouse as WarehouseType } from '../../types/warehouse';
import { Button } from '../ui/Button';
import { AddWarehouseModal } from './AddWarehouseModal';

export const WarehouseControlCenterView: React.FC = () => {
  const { organization, hasPermission } = useWorkspace();
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);

  useEffect(() => {
    if (organization) {
      loadWarehouses();
    }
  }, [organization]);

  const loadWarehouses = async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await warehouseService.getWarehouses(organization.id);
      setWarehouses(data);
    } catch (err: any) {
      console.error('Failed to load warehouses', err);
      setError(err?.message || 'Failed to load warehouses from Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((wh) => {
      const matchesSearch =
        wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wh.address && wh.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (wh.gstin && wh.gstin.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = selectedType === 'ALL' || wh.type === selectedType;
      const matchesStatus = selectedStatus === 'ALL' || wh.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [warehouses, searchQuery, selectedType, selectedStatus]);

  const coldChainCount = useMemo(() => warehouses.filter((w) => w.coldChainEnabled).length, [warehouses]);
  const activeCount = useMemo(() => warehouses.filter((w) => w.status === 'ACTIVE').length, [warehouses]);
  const totalCapacity = useMemo(() => warehouses.reduce((acc, w) => acc + (w.capacity || 0), 0), [warehouses]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-[#0D5C63] rounded-lg">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Warehouse Control Center</h1>
              <p className="text-sm text-slate-500">
                Centralized multi-echelon distribution hubs, cold chain custody, and regional routing
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadWarehouses} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          {hasPermission('warehouse.create') && (
            <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Warehouse
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Notice</p>
              <p>{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadWarehouses}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Warehouses"
          value={warehouses.length}
          subtitle={`${activeCount} Active Facilities`}
          icon={<Warehouse className="w-5 h-5 text-[#0D5C63]" />}
          bgColor="bg-teal-50"
        />
        <KpiCard
          title="Cold Chain Hubs"
          value={coldChainCount}
          subtitle="Temperature Controlled (2°C-8°C)"
          icon={<Snowflake className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <KpiCard
          title="Aggregate Capacity"
          value={totalCapacity ? `${totalCapacity.toLocaleString()} units` : '0 units'}
          subtitle="Total volumetric space"
          icon={<Package className="w-5 h-5 text-indigo-600" />}
          bgColor="bg-indigo-50"
        />
        <KpiCard
          title="Compliance & Licensing"
          value={warehouses.filter((w) => w.gstin && w.drugLicense).length}
          subtitle="Full GSTIN & Yard Reg."
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Warehouse Directory Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, code, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
            >
              <option value="ALL">All Hub Types</option>
              <option value="DISTRIBUTION">Central Distribution</option>
              <option value="REGIONAL">Regional Hub</option>
              <option value="COLD_CHAIN">Cold Chain</option>
              <option value="QUARANTINE">Quarantine</option>
              <option value="TRANSIT">Transit Depot</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Warehouse Cards Grid / Table */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#0D5C63]" />
            <p className="text-sm">Loading warehouse network records...</p>
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Warehouse className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">No Warehouses Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
              {warehouses.length === 0
                ? 'Create your first central distribution warehouse or regional stock depot to begin managing multi-location inventory.'
                : 'No warehouses matched your search criteria.'}
            </p>
            {hasPermission('warehouse.create') && (
              <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Warehouse
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 uppercase bg-slate-50/80 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Facility & Code</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Location & Contact</th>
                  <th className="px-6 py-3.5">Capacity & Cold Chain</th>
                  <th className="px-6 py-3.5">Licenses</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWarehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{wh.name}</p>
                          <span className="inline-block font-mono text-xs text-[#0D5C63] font-medium bg-teal-50 px-2 py-0.5 rounded">
                            {wh.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {wh.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs text-slate-600">
                        {wh.address && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{wh.address}</span>
                          </div>
                        )}
                        {wh.contactName && (
                          <p className="text-slate-500 font-medium">{wh.contactName}</p>
                        )}
                        {wh.contactPhone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{wh.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-slate-800">
                          {wh.capacity ? `${wh.capacity.toLocaleString()} units` : 'Unspecified'}
                        </p>
                        {wh.coldChainEnabled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Snowflake className="w-3 h-3" />
                            Cold Chain (2-8°C)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Ambient Temp</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {wh.gstin ? (
                          <p className="font-mono text-slate-700">GST: {wh.gstin}</p>
                        ) : (
                          <span className="text-slate-400">No GSTIN</span>
                        )}
                        {wh.drugLicense && (
                          <p className="font-mono text-slate-600">Yard Reg: {wh.drugLicense}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          wh.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            wh.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {wh.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Warehouse Modal */}
      <AddWarehouseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadWarehouses}
      />
    </div>
  );
};

const KpiCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
}> = ({ title, value, subtitle, icon, bgColor }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-start gap-4">
    <div className={`p-3 ${bgColor} rounded-xl shrink-0`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
    </div>
  </div>
);
