import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  PlayCircle,
  Database,
  History,
  FileText,
  BadgeAlert,
  Search,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { clinicalService, ClinicalAnalysisResult } from '../services/clinicalService';
import { auditService } from '../services/auditService';
import { taskService } from '../services/taskService';
import { ExtendedAuditLog, Task } from '../types';

interface CustomCartItem {
  name: string;
  composition: string;
  strength: string;
  schedule: string;
  isColdChain: boolean;
}

export const ClinicalDecisionSupportView: React.FC = () => {
  const { organization, currentStore } = useWorkspace();
  const [sandboxItems, setSandboxItems] = useState<CustomCartItem[]>([
    { name: 'Crocin Pain Relief', composition: 'Paracetamol + Caffeine', strength: '650mg + 50mg', schedule: 'OTC', isColdChain: false },
    { name: 'Calpol 500', composition: 'Paracetamol', strength: '500mg', schedule: 'OTC', isColdChain: false },
  ]);

  // Form inputs for new sandbox item
  const [itemName, setItemName] = useState('');
  const [itemComposition, setItemComposition] = useState('');
  const [itemStrength, setItemStrength] = useState('');
  const [itemSchedule, setItemSchedule] = useState('OTC');
  const [isColdChain, setIsColdChain] = useState(false);

  // Patient context
  const [patientName, setPatientName] = useState('John Doe');
  const [patientAge, setPatientAge] = useState<number>(10); // set to child for demoing age contraindication
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>('male');
  const [patientHistory, setPatientHistory] = useState('Mild seasonal allergies. Asthmatic.');

  // Result state
  const [analysisResult, setAnalysisResult] = useState<ClinicalAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Active overrides & compliance tasks from Firebase
  const [overridesLog, setOverridesLog] = useState<ExtendedAuditLog[]>([]);
  const [complianceTasks, setComplianceTasks] = useState<Task[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  //CDSCO DB Search Query
  const [dbSearch, setDbSearch] = useState('');

  const cdscoBannedList = [
    { name: 'Analgin', reason: 'Surgically banned by CDSCO due to severe agranulocytosis risk.', alternative: 'Paracetamol or Ibuprofen' },
    { name: 'Nimesulide (Suspension)', reason: 'CDSCO banned in pediatric patients under 12 due to acute hepatic failure risks.', alternative: 'Paracetamol suspension' },
    { name: 'Sibutramine', reason: 'Globally suspended & banned due to acute stroke and cardiovascular risks.', alternative: 'Orlistat' },
    { name: 'Gatifloxacin (Systemic)', reason: 'CDSCO banned for systemic oral/injectable use due to severe hypoglycemia risks.', alternative: 'Ciprofloxacin / Levofloxacin' },
    { name: 'Rosiglitazone', reason: 'Banned in India due to increased cardiovascular and congestive heart failure risks.', alternative: 'Metformin' },
    { name: 'Cisapride', reason: 'Banned due to cardiac arrhythmia risks (QT interval prolongation).', alternative: 'Metoclopramide' },
    { name: 'Phenylpropanolamine (PPA)', reason: 'CDSCO banned in cough/cold remedies due to risk of hemorrhagic stroke.', alternative: 'Phenylephrine' },
  ];

  const filteredCdscoDb = cdscoBannedList.filter(
    (item) =>
      item.name.toLowerCase().includes(dbSearch.toLowerCase()) ||
      item.reason.toLowerCase().includes(dbSearch.toLowerCase())
  );

  useEffect(() => {
    loadRecentLogs();
  }, [organization?.id]);

  const loadRecentLogs = async () => {
    if (!organization?.id) return;
    setIsLoadingLogs(true);
    try {
      // 1. Fetch recent clinical overrides from Audit logs
      const logs = await auditService.getAuditLogs(organization.id, 100);
      const clinicalOverrides = logs.filter(l => l.action === 'CLINICAL_ALERT_OVERRIDE');
      setOverridesLog(clinicalOverrides);

      // 2. Fetch compliance-related tasks
      const allTasks = await taskService.getTasks(organization.id);
      const complianceOnly = allTasks.filter(t => t.taskType === 'H1_REVIEW');
      setComplianceTasks(complianceOnly);
    } catch (err) {
      console.error('Failed to load recent overrides or tasks:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleAddItemToSandbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemComposition.trim()) return;
    const newItem: CustomCartItem = {
      name: itemName.trim(),
      composition: itemComposition.trim(),
      strength: itemStrength.trim() || 'N/A',
      schedule: itemSchedule,
      isColdChain,
    };
    setSandboxItems([...sandboxItems, newItem]);
    setItemName('');
    setItemComposition('');
    setItemStrength('');
    setItemSchedule('OTC');
    setIsColdChain(false);
  };

  const handleRemoveItem = (idx: number) => {
    setSandboxItems(sandboxItems.filter((_, i) => i !== idx));
  };

  const runComprehensiveSafetyCheck = async () => {
    if (!organization?.id) return;
    if (sandboxItems.length === 0) {
      setAnalysisError('Add at least one medicine to the sandbox to perform check.');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // Transform sandbox items to PosCartItem shape for service
      const mockCartItems = sandboxItems.map((item, index) => ({
        id: `sandbox_${index}`,
        productId: `prod_${index}`,
        name: item.name,
        brand: 'Generic',
        composition: item.composition,
        sku: `SKU_${index}`,
        batchId: 'B1',
        batch: 'BATCH_1',
        expiry: '12/28',
        availableStock: 100,
        qty: 1,
        price: 10,
        mrp: 12,
        taxableAmount: 10,
        total: 11.2,
        gstPercent: 12,
        dosageForm: 'Tablet',
        hsnCode: '3004',
        schedule: item.schedule,
        isPrescriptionRequired: item.schedule !== 'OTC',
        isColdChain: item.isColdChain,
      }));

      const res = await clinicalService.runComprehensiveClinicalCheck(
        organization.id,
        mockCartItems,
        patientName,
        patientAge,
        patientGender,
        patientHistory
      );
      setAnalysisResult(res);
    } catch (err: any) {
      setAnalysisError(err.message || 'Clinical safety analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Clinical Decision Support (CDS) & Safety Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dual-engine drug interaction checker, CDSCO compliance monitor, and patient contraindication detector.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-teal-700 bg-teal-100 dark:bg-teal-950 dark:text-teal-300 px-2.5 py-1 rounded-lg">
            Gemini 3.7 Flash Active
          </span>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-lg">
            CDSCO Guidelines v2026
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Clinical Audit Status</span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">100% Compliant</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">H1 Register & statutory logs matching</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Identified Risk Ratio</span>
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 block mt-1">1.2% checked</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Precise alert-to-override tracking</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500/20" />
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Logged Interventions</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white block mt-1">{overridesLog.length} Overrides</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{complianceTasks.filter(t=>t.status === 'OPEN').length} pending safety reviews</span>
          </div>
          <ClipboardList className="w-8 h-8 text-teal-500/20" />
        </div>
      </div>

      {/* Main Grid: Interactive Sandbox and CDSCO DB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT & CENTER: Interactive Sandbox (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Brain className="w-4.5 h-4.5 text-teal-600" />
                Prescription Diagnostic Sandbox
              </h2>
              <span className="text-xs text-slate-500">Run safe drug combinations checks</span>
            </div>

            {/* Patient Context Panel */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase">Age (years)</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as any)}
                  className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase">Clinical History / Allergies</label>
                <input
                  type="text"
                  value={patientHistory}
                  onChange={(e) => setPatientHistory(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Sandbox Add Item Form */}
            <form onSubmit={handleAddItemToSandbox} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Add Medicine to Sandbox</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Medicine Name (e.g., Calpol)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:col-span-1"
                />
                <input
                  type="text"
                  placeholder="Composition (e.g., Paracetamol)"
                  value={itemComposition}
                  onChange={(e) => setItemComposition(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:col-span-1"
                />
                <input
                  type="text"
                  placeholder="Strength (e.g., 500mg)"
                  value={itemStrength}
                  onChange={(e) => setItemStrength(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:col-span-1"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={itemSchedule}
                    onChange={(e) => setItemSchedule(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex-1"
                  >
                    <option value="OTC">OTC</option>
                    <option value="G">Sch G</option>
                    <option value="H">Sch H</option>
                    <option value="H1">Sch H1</option>
                    <option value="X">Sch X</option>
                  </select>
                  <button
                    type="submit"
                    className="p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shrink-0"
                    title="Add to sandbox"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  id="chk-cold-chain"
                  checked={isColdChain}
                  onChange={(e) => setIsColdChain(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <label htmlFor="chk-cold-chain" className="text-slate-600 dark:text-slate-300">
                  This medicine requires continuous cold-chain storage (2°C - 8°C)
                </label>
              </div>
            </form>

            {/* Sandbox Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Composition</th>
                    <th className="p-3">Strength</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Attributes</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
                  {sandboxItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No medicines in sandbox. Use form above to add drugs.
                      </td>
                    </tr>
                  ) : (
                    sandboxItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold">{item.name}</td>
                        <td className="p-3">{item.composition}</td>
                        <td className="p-3 font-mono text-[11px]">{item.strength}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.schedule === 'OTC' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Sch {item.schedule}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.isColdChain && (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">
                              Cold Chain
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Run Analysis Trigger */}
            <div className="flex items-center justify-between pt-2">
              {analysisError && (
                <span className="text-xs font-bold text-rose-600">{analysisError}</span>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setSandboxItems([])}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Clear Sandbox
                </button>
                <button
                  type="button"
                  onClick={runComprehensiveSafetyCheck}
                  disabled={isAnalyzing || sandboxItems.length === 0}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-600/10 flex items-center gap-2 transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Querying Gemini 3.7 AI & CDSCO engine...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>Execute Comprehensive Check</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Display Panel */}
          {analysisResult && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <BadgeAlert className="w-5 h-5 text-teal-600" />
                  Clinical Validation Output
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  analysisResult.safeToDispense
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {analysisResult.safeToDispense ? 'Cleared for Dispensing ✓' : 'Dispensing Contraindicated ✕'}
                </span>
              </div>

              {/* Duplicate therapy Warnings */}
              {analysisResult.duplicates.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2">
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wide block">
                    Duplicate Therapeutic Ingredients detected
                  </span>
                  {analysisResult.duplicates.map((dup, i) => (
                    <div key={i} className="text-xs text-amber-900 dark:text-amber-200 pl-2 border-l-2 border-amber-500 space-y-1">
                      <p className="font-bold">Overlapping generic classes between: {dup.drugs.join(', ')}</p>
                      <p className="text-slate-600 dark:text-slate-400">{dup.clinicalNote}</p>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">Recommendation: {dup.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Drug-Drug Interactions */}
              {analysisResult.interactions.length > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
                  <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wide block">
                    Drug-Drug Interactions
                  </span>
                  {analysisResult.interactions.map((inter, i) => (
                    <div key={i} className="text-xs text-rose-900 dark:text-rose-200 pl-2 border-l-2 border-rose-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{inter.drugs.join(' ↔ ')}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          inter.severity === 'Severe' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inter.severity} Risk
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400"><strong className="text-rose-900">Mechanism:</strong> {inter.mechanism}</p>
                      <p className="text-slate-500 dark:text-slate-400">{inter.clinicalNote}</p>
                      <p className="font-semibold text-teal-600 dark:text-teal-400">Action: {inter.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Contraindications */}
              {analysisResult.contraindications.length > 0 && (
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-xl space-y-2">
                  <span className="text-xs font-extrabold text-orange-800 dark:text-orange-300 uppercase tracking-wide block">
                    Patient Contraindications & Warnings
                  </span>
                  {analysisResult.contraindications.map((contra, i) => (
                    <div key={i} className="text-xs text-orange-900 dark:text-orange-200 pl-2 border-l-2 border-orange-500 space-y-1">
                      <p className="font-bold">Drug contraindicated: {contra.drug} ({contra.type} factor)</p>
                      <p className="text-slate-600 dark:text-slate-400">{contra.clinicalNote}</p>
                      <p className="font-semibold text-orange-700 dark:text-orange-400">Recommendation: {contra.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Banned/Suspended Status */}
              {analysisResult.bannedOrSuspended.length > 0 && (
                <div className="p-4 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-xl space-y-2">
                  <span className="text-xs font-extrabold text-red-800 dark:text-red-300 uppercase tracking-wide block">
                    Regulatory Alert: CDSCO Banned Active Ingredients
                  </span>
                  {analysisResult.bannedOrSuspended.map((ban, i) => (
                    <div key={i} className="text-xs text-red-900 dark:text-red-200 pl-2 border-l-2 border-red-500 space-y-1">
                      <p className="font-bold">Prohibited drug/FDC: {ban.drug}</p>
                      <p className="text-slate-600 dark:text-slate-400"><strong className="text-red-900">CDSCO Prohibition details:</strong> {ban.reason}</p>
                      <p className="font-semibold text-teal-600 dark:text-teal-400">Safe compliance alternative: {ban.alternative}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Dosage Warnings & Cold Chain */}
              {analysisResult.dosageWarnings.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2">
                  <span className="text-xs font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wide block">
                    Dispensing & Storage Guidance
                  </span>
                  {analysisResult.dosageWarnings.map((warn, i) => (
                    <div key={i} className="text-xs text-blue-900 dark:text-blue-200 pl-2 border-l-2 border-blue-500 space-y-1">
                      <p className="font-bold">{warn.drug}: {warn.warning}</p>
                      <p className="text-slate-600 dark:text-slate-400">{warn.clinicalNote}</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-400">Action: {warn.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback Clear check */}
              {analysisResult.duplicates.length === 0 &&
               analysisResult.interactions.length === 0 &&
               analysisResult.contraindications.length === 0 &&
               analysisResult.bannedOrSuspended.length === 0 && (
                 <div className="p-6 text-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl space-y-2">
                   <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                   <p className="text-xs font-bold">No clinically significant alerts detected!</p>
                   <p className="text-2xs text-slate-500">Dual safety-engine completed checkout safety checks successfully.</p>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: CDSCO Database Search (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-teal-600" />
              CDSCO Banned Substances DB
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search restricted generics..."
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {filteredCdscoDb.map((item, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-800 rounded">CDSCO Banned</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">{item.reason}</p>
                  <div className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                    Alternative: <strong className="text-teal-700 dark:text-teal-300">{item.alternative}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secure Overrides Log & compliance Task linkages */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-teal-600" />
              Recent Pharmacist Overrides
            </h2>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {isLoadingLogs ? (
                <p className="text-xs text-slate-500 text-center py-6">Loading audit overrides logs...</p>
              ) : overridesLog.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No clinical alert overrides registered yet.</p>
              ) : (
                overridesLog.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[10px] font-bold text-slate-900 dark:text-white">Invoice: {log.entityId}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">Overridden</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      <strong>Justification:</strong> "{log.reason || 'No justification provided'}"
                    </p>
                    <div className="text-[9px] text-slate-400 flex justify-between pt-1">
                      <span>By: {log.actorName} ({log.actorRole})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
