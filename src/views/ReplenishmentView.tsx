import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { replenishmentService } from '../services/replenishmentService';
import { ReorderRecommendation } from '../types/replenishment';
import { Supplier } from '../types';
import { supplierService } from '../services/supplierService';
import { 
  RefreshCw, 
  AlertTriangle, 
  ShoppingBag, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Filter, 
  Search,
  Loader2,
  Package,
  Building2,
  CalendarClock
} from 'lucide-react';

export const ReplenishmentView: React.FC = () => {
  const { organization, currentStore, firestoreUser, hasPermission } = useWorkspace();
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (organization?.id && currentStore?.id) {
      loadData();
    }
  }, [organization?.id, currentStore?.id]);

  const loadData = async () => {
    if (!organization?.id || !currentStore?.id) return;
    setIsLoading(true);
    try {
      const [recs, sups] = await Promise.all([
        replenishmentService.getRecommendations(organization.id, currentStore.id),
        supplierService.getSuppliers(organization.id, 'active')
      ]);
      setRecommendations(recs);
      setSuppliers(sups);
    } catch (err) {
      console.error('Failed to load replenishment data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!organization?.id || !currentStore?.id || !firestoreUser?.uid) return;
    setIsRunning(true);
    try {
      await replenishmentService.runAnalysis(organization.id, currentStore.id, firestoreUser.uid);
      await loadData();
    } catch (err) {
      console.error('Analysis failed', err);
      alert('Analysis failed to run.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreatePO = async () => {
    if (!organization?.id || !currentStore?.id || !firestoreUser?.uid) return;
    if (selectedRecs.size === 0) return;

    // Group by supplier
    const selectedList = recommendations.filter(r => selectedRecs.has(r.id));
    const bySupplier = new Map<string, ReorderRecommendation[]>();
    
    selectedList.forEach(rec => {
      const sId = rec.preferredSupplierId;
      if (!sId) return; // Skip if no supplier (would need manual assignment in a full UI)
      if (!bySupplier.has(sId)) bySupplier.set(sId, []);
      bySupplier.get(sId)!.push(rec);
    });

    if (bySupplier.size === 0) {
      alert('Selected recommendations must have a preferred supplier.');
      return;
    }

    try {
      for (const [sId, recs] of bySupplier.entries()) {
        await replenishmentService.createPOFromRecommendations(
          organization.id,
          currentStore.id,
          recs.map(r => r.id),
          sId,
          { uid: firestoreUser.uid, email: firestoreUser.email, displayName: firestoreUser.displayName }
        );
      }
      alert('Purchase Orders created successfully! Check Purchases module.');
      setSelectedRecs(new Set());
      await loadData();
    } catch (err: any) {
      console.error('PO Creation failed', err);
      alert('Failed to create POs: ' + err.message);
    }
  };

  const filteredRecs = recommendations.filter(r => 
    r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.sku && r.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const criticalCount = recommendations.filter(r => r.urgency === 'CRITICAL').length;
  const highCount = recommendations.filter(r => r.urgency === 'HIGH').length;
  const totalValue = recommendations.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Automated Replenishment <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">Beta</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Data-driven inventory reordering engine and supplier forecasting
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('replenishment.run') && (
            <button
              onClick={handleRunAnalysis}
              disabled={isRunning}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Analysis...' : 'Run Replenishment Analysis'}
            </button>
          )}
          {hasPermission('purchases.create') && (
            <button
              onClick={handleCreatePO}
              disabled={selectedRecs.size === 0}
              className="px-4 py-2 bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-[#0D5C63]/10 transition-colors disabled:opacity-50"
            >
              <ShoppingBag className="w-4 h-4" />
              Create POs ({selectedRecs.size})
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Stockouts</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{criticalCount}</h3>
          </div>
        </div>
        
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{highCount}</h3>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Recommendations</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">{recommendations.length}</h3>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Est. Purchase Value</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search recommendations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Filter View</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-[#0D5C63] animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading recommendations engine...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-16 text-center max-w-md mx-auto space-y-3 bg-white rounded-2xl border border-slate-200 border-dashed">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full w-fit mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Inventory Levels Optimal</h3>
          <p className="text-sm text-slate-500">
            There are no products currently falling below their reorder points. Run a fresh analysis to check for any sudden demand spikes.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRecs(new Set(filteredRecs.map(r => r.id)));
                        else setSelectedRecs(new Set());
                      }}
                      checked={selectedRecs.size > 0 && selectedRecs.size === filteredRecs.length}
                      className="rounded text-[#0D5C63] focus:ring-[#0D5C63]"
                    />
                  </th>
                  <th className="p-4">Medicine Details</th>
                  <th className="p-4">Inventory Status</th>
                  <th className="p-4">Demand Forecast</th>
                  <th className="p-4">Recommended Qty</th>
                  <th className="p-4">Preferred Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecs.map((rec) => {
                  const isSelected = selectedRecs.has(rec.id);
                  return (
                    <tr 
                      key={rec.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedRecs);
                            if (e.target.checked) newSet.add(rec.id);
                            else newSet.delete(rec.id);
                            setSelectedRecs(newSet);
                          }}
                          className="rounded text-[#0D5C63] focus:ring-[#0D5C63]"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{rec.productName}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            {rec.brand && <span>{rec.brand}</span>}
                            {rec.sku && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{rec.sku}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-24">Available:</span>
                            <span className={`font-bold ${rec.effectiveAvailableStock <= 0 ? 'text-red-600' : 'text-slate-800'}`}>
                              {rec.effectiveAvailableStock}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-24">Reorder Pt:</span>
                            <span className="font-semibold text-slate-700">{rec.reorderPoint}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-24">Inbound PO:</span>
                            <span className="font-semibold text-blue-600">{rec.inboundStock}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-20">Avg Daily:</span>
                            <span className="font-bold text-slate-800">{rec.averageDailyDemand.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-20">Stock Days:</span>
                            <span className={`font-semibold px-1.5 py-0.5 rounded-md ${
                              rec.daysOfStockRemaining <= 3 ? 'bg-red-100 text-red-700' :
                              rec.daysOfStockRemaining <= 7 ? 'bg-orange-100 text-orange-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {rec.daysOfStockRemaining} days
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Confidence:</span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 rounded">
                              {rec.forecastConfidence}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-[#0D5C63]">{rec.recommendedQuantity}</span>
                          <span className="text-xs text-slate-500">units</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                          Est. ₹{rec.estimatedCost.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="p-4">
                        {rec.preferredSupplierId ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {rec.preferredSupplierName}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                              <CalendarClock className="w-3 h-3" />
                              Lead: {rec.supplierLeadTimeDays} days
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md font-semibold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5" /> No Supplier
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
