import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Store, Package, AlertTriangle, Plus, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { RebalanceRecommendation } from '../../types/transfer';
import { transferService } from '../../services/transferService';
import { useWorkspace } from '../../context/WorkspaceContext';

interface RebalanceRecommendationsPanelProps {
  onSelectRecommendation: (rec: RebalanceRecommendation) => void;
}

export const RebalanceRecommendationsPanel: React.FC<RebalanceRecommendationsPanelProps> = ({
  onSelectRecommendation,
}) => {
  const { organization } = useWorkspace();
  const [recommendations, setRecommendations] = useState<RebalanceRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRecommendations = async () => {
    if (!organization) return;
    try {
      setIsLoading(true);
      const recs = await transferService.getRebalancingRecommendations(organization.id);
      setRecommendations(recs);
    } catch (e) {
      console.error('Failed to calculate rebalance recommendations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [organization?.id]);

  return (
    <div className="bg-white rounded-xl border border-[#CBD5E1] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1F33]">Multi-Branch Stock Rebalancing Engine</h3>
            <p className="text-xs text-[#64748B]">
              Algorithmic rule-based stock redistribution to prevent branch stockouts and balance excess inventory.
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="xs"
          icon={RefreshCw}
          onClick={loadRecommendations}
          isLoading={isLoading}
        >
          Re-Analyze Stock
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-[#94A3B8]">
          Analyzing stock distribution across stores...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-6 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center space-y-1">
          <CheckCircle className="w-6 h-6 text-[#16A34A] mx-auto" />
          <p className="text-xs font-bold text-[#0B1F33]">Multi-Branch Inventory Perfectly Balanced</p>
          <p className="text-[11px] text-[#64748B]">
            No severe stock imbalances or branch shortages detected across your organization's stores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] hover:border-[#0D5C63]/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      rec.urgency === 'HIGH'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : rec.urgency === 'MEDIUM'
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {rec.urgency} Urgency
                  </span>
                  <span className="text-xs font-mono font-bold text-[#0D5C63]">
                    Transfer Qty: {rec.suggestedTransferQty} units
                  </span>
                </div>

                <p className="text-xs font-bold text-[#0B1F33]">{rec.productName}</p>
                <p className="text-[10px] text-[#64748B] font-mono">SKU: {rec.sku}</p>

                {/* Route Visualization */}
                <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0] flex items-center justify-between text-[11px] font-medium">
                  <div className="text-left">
                    <p className="text-[#64748B] text-[10px]">Source (Surplus)</p>
                    <p className="font-bold text-[#0B1F33]">{rec.sourceStoreName}</p>
                    <p className="font-mono text-[#16A34A] font-bold">{rec.sourceAvailableStock} units</p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#0D5C63]" />

                  <div className="text-right">
                    <p className="text-[#64748B] text-[10px]">Destination (Deficit)</p>
                    <p className="font-bold text-[#0B1F33]">{rec.destinationStoreName}</p>
                    <p className="font-mono text-[#DC2626] font-bold">
                      {rec.destinationCurrentStock === 0 ? 'Out of Stock' : `${rec.destinationCurrentStock} units`}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] italic">{rec.reason}</p>
              </div>

              <Button
                variant="primary"
                size="xs"
                icon={Plus}
                onClick={() => onSelectRecommendation(rec)}
                className="w-full justify-center"
              >
                Create Transfer Request ({rec.suggestedTransferQty} units)
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
