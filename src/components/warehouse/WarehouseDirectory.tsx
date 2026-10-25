import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { warehouseService } from '../../services/warehouseService';
import { Warehouse as WarehouseType } from '../../types/warehouse';
import { Button } from '../ui/Button';
import { Plus } from 'lucide-react';

export const WarehouseDirectory: React.FC = () => {
  const { organization } = useWorkspace();
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadWarehouses();
    }
  }, [organization]);

  const loadWarehouses = async () => {
    setIsLoading(true);
    try {
      const data = await warehouseService.getWarehouses(organization!.id);
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Warehouse Directory</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Warehouse
        </Button>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map(w => (
              <tr key={w.id} className="bg-white border-b">
                <td className="px-6 py-4 font-medium">{w.code}</td>
                <td className="px-6 py-4">{w.name}</td>
                <td className="px-6 py-4">{w.type}</td>
                <td className="px-6 py-4">{w.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
