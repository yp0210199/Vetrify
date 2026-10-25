import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  CreditCard,
  FileText,
  Edit2,
  Phone,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Customer, CustomerPayment } from '../../types';
import { customerService } from '../../services/customerService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { safeToFixed } from '../../lib/formatting/formatters';
import { CustomerEditModal } from './CustomerEditModal';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { CustomerRecordPaymentModal } from './CustomerRecordPaymentModal';
import { CustomerPaymentReceiptModal } from './CustomerPaymentReceiptModal';

export const CustomerManagement: React.FC = () => {
  const { organization } = useWorkspace();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'credit_enabled' | 'has_outstanding' | 'suspended'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  const [completedPayment, setCompletedPayment] = useState<CustomerPayment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const loadCustomers = useCallback(async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomers(organization.id, {
        searchQuery: searchQuery.trim() || undefined,
        limitCount: 100,
      });
      setCustomers(data);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError('Failed to fetch customer directory.');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  // Compute Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.currentOutstanding || 0), 0);
    const creditActiveCount = customers.filter((c) => c.creditEnabled).length;
    const overLimitCount = customers.filter(
      (c) => c.creditEnabled && (c.currentOutstanding || 0) > (c.creditLimit || 0)
    ).length;

    return { totalCustomers, totalOutstanding, creditActiveCount, overLimitCount };
  }, [customers]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === 'credit_enabled') return c.creditEnabled;
      if (statusFilter === 'has_outstanding') return (c.currentOutstanding || 0) > 0;
      if (statusFilter === 'suspended') return c.status === 'suspended';
      return true;
    });
  }, [customers, statusFilter]);

  const handleOpenPaymentFromLedger = (cust: Customer) => {
    setIsLedgerModalOpen(false);
    setSelectedCustomerForPayment(cust);
    setIsRecordPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (payment: CustomerPayment) => {
    setCompletedPayment(payment);
    setIsReceiptModalOpen(true);
    loadCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Module Title Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Customer Master & Khata Credit Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage retail customer profiles, credit accounts, ledgers, and payment collections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCustomers} className="flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedCustomerForEdit(null);
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Customers
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.totalCustomers}
          </div>
          <p className="text-3xs text-slate-400">Registered retail clients</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Khata Dues (Org)
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            ₹{safeToFixed(metrics.totalOutstanding)}
          </div>
          <p className="text-3xs text-rose-500 font-medium">Outstanding credit across all accounts</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Khata Active Accounts
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.creditActiveCount}
          </div>
          <p className="text-3xs text-emerald-500 font-medium">Credit facility enabled</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Over Credit Limit Accounts
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.overLimitCount}
          </div>
          <p className="text-3xs text-amber-500 font-medium">Requires payment or credit limit review</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or customer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('credit_enabled')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors ${
                statusFilter === 'credit_enabled'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Khata Active
            </button>
            <button
              onClick={() => setStatusFilter('has_outstanding')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors ${
                statusFilter === 'has_outstanding'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Has Dues
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors ${
                statusFilter === 'suspended'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
            Loading customer directory...
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-rose-500">{error}</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              No customers found in directory
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCustomerForEdit(null);
                setIsEditModalOpen(true);
              }}
            >
              + Register New Customer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-3xs tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Khata Status</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Current Dues</th>
                  <th className="py-3 px-4 text-right">Available Credit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.map((c) => {
                  const availableCredit = (c.creditLimit || 0) - (c.currentOutstanding || 0);
                  const isOverLimit = (c.currentOutstanding || 0) > (c.creditLimit || 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {c.name}
                            </div>
                            <div className="text-3xs text-slate-400 font-mono font-normal">
                              {c.customerCode || c.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.creditEnabled ? (
                            <Badge variant="success" className="text-3xs py-0">
                              Khata Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-3xs py-0">
                              Disabled
                            </Badge>
                          )}
                          {c.status !== 'active' && (
                            <Badge variant="danger" className="text-3xs py-0">
                              {c.status}
                            </Badge>
                          )}
                          {isOverLimit && (
                            <Badge variant="warning" className="text-3xs py-0">
                              Over Limit
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                        ₹{(c.creditLimit || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-black text-sm ${
                            (c.currentOutstanding || 0) > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          ₹{safeToFixed(c.currentOutstanding)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            availableCredit < 0
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          ₹{safeToFixed(availableCredit)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomerForPayment(c);
                              setIsRecordPaymentModalOpen(true);
                            }}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Payment
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomerForLedger(c);
                              setIsLedgerModalOpen(true);
                            }}
                            className="text-xs text-slate-600 dark:text-slate-300"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" /> Ledger
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomerForEdit(c);
                              setIsEditModalOpen(true);
                            }}
                            className="text-xs text-slate-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      <CustomerEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={selectedCustomerForEdit}
        onCustomerSaved={loadCustomers}
      />

      {/* Ledger Modal */}
      <CustomerLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        customer={selectedCustomerForLedger}
        onOpenRecordPayment={handleOpenPaymentFromLedger}
      />

      {/* Record Payment Modal */}
      <CustomerRecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        customer={selectedCustomerForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Payment Receipt Modal */}
      <CustomerPaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={completedPayment}
      />
    </div>
  );
};
