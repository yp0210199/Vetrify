import React, { useState, useEffect } from 'react';
import { Search, Plus, UserCheck, AlertTriangle, X, Check, CreditCard, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Customer } from '../../types';
import { customerService } from '../../services/customerService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { safeToFixed } from '../../lib/formatting/formatters';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomerId?: string | null;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  selectedCustomerId,
}) => {
  const { organization, currentStaff } = useWorkspace();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Add Customer State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCreditEnabled, setNewCreditEnabled] = useState(true);
  const [newCreditLimit, setNewCreditLimit] = useState(5000);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  useEffect(() => {
    if (isOpen && organization?.id) {
      loadCustomers();
    }
  }, [isOpen, organization?.id, searchQuery]);

  const loadCustomers = async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await customerService.getCustomers(organization.id, {
        searchQuery: searchQuery.trim() || undefined,
        limitCount: 20,
      });
      setCustomers(results);
    } catch (err: any) {
      console.error('Error searching customers:', err);
      setError('Failed to fetch customer directory.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;
    if (!newCustomerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!newCustomerPhone.trim()) {
      setError('Customer phone number is required.');
      return;
    }

    setIsSavingCustomer(true);
    setError(null);

    const callerObj = {
      uid: user?.uid || currentStaff?.uid || 'cashier',
      email: user?.email || currentStaff?.email,
      displayName: currentStaff?.displayName || user?.displayName,
    };

    try {
      const created = await customerService.createCustomer(organization.id, callerObj, {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        creditEnabled: newCreditEnabled,
        creditLimit: newCreditLimit,
      });

      onSelectCustomer(created);
      setIsQuickAddOpen(false);
      onClose();
    } catch (err: any) {
      console.error('Error creating customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to register customer.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Select Customer / Khata Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search registered customer directory or create a new credit account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isQuickAddOpen ? (
          /* Quick Add Customer Form */
          <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Quick Add New Customer
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsQuickAddOpen(false)}
                className="text-xs text-slate-500"
              >
                Back to Search
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9876543210"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newCreditEnabled}
                    onChange={(e) => setNewCreditEnabled(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                  />
                  Enable Credit / Khata Sales
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingCustomer}>
                Save & Select Customer
              </Button>
            </div>
          </form>
        ) : (
          /* Search & Directory List */
          <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQuickAddOpen(true)}
                className="shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New Customer
              </Button>
            </div>

            {/* Default Walk-in option */}
            <div
              onClick={() => {
                onSelectCustomer(null);
                onClose();
              }}
              className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Walk-in Customer (Cash / UPI / Card Only)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Standard retail checkout without Khata account recording
                  </p>
                </div>
              </div>
              {!selectedCustomerId && (
                <Badge variant="success" className="text-2xs">
                  Active Selection
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Searching customer directory...
                </div>
              ) : customers.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    No customers found matching &quot;{searchQuery}&quot;
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setNewCustomerName(searchQuery);
                      setIsQuickAddOpen(true);
                    }}
                  >
                    + Add &quot;{searchQuery}&quot; as New Customer
                  </Button>
                </div>
              ) : (
                customers.map((c) => {
                  const availableCredit = (c.creditLimit || 0) - (c.currentOutstanding || 0);
                  const isSelected = selectedCustomerId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-sm">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {c.name}
                            </h4>
                            {c.creditEnabled ? (
                              <Badge variant="success" className="text-3xs py-0">
                                Khata Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-3xs py-0">
                                Cash Only
                              </Badge>
                            )}
                            {c.status !== 'active' && (
                              <Badge variant="danger" className="text-3xs py-0">
                                {c.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {c.phone} {c.customerCode && `• ID: ${c.customerCode}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Outstanding: ₹{safeToFixed(c.currentOutstanding)}
                        </div>
                        <div className="text-3xs text-slate-500">
                          Limit: ₹{(c.creditLimit || 0).toLocaleString('en-IN')} | Avail: ₹
                          {safeToFixed(availableCredit)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
