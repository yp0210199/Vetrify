import { getAuth } from 'firebase/auth';
import { auditService } from './auditService';
import { taskService } from './taskService';
import { notificationService } from './notificationService';
import { PosCartItem } from '../types';

export interface ClinicalAnalysisResult {
  interactions: Array<{
    drugs: string[];
    severity: 'Mild' | 'Moderate' | 'Severe';
    mechanism: string;
    clinicalNote: string;
    recommendation: string;
  }>;
  duplicates: Array<{
    drugs: string[];
    therapeuticClass: string;
    clinicalNote: string;
    recommendation: string;
  }>;
  contraindications: Array<{
    drug: string;
    type: 'Age' | 'Gender' | 'Condition' | 'Allergy';
    clinicalNote: string;
    recommendation: string;
  }>;
  dosageWarnings: Array<{
    drug: string;
    warning: string;
    clinicalNote: string;
    recommendation: string;
  }>;
  bannedOrSuspended: Array<{
    drug: string;
    reason: string;
    alternative: string;
  }>;
  safeToDispense: boolean;
  engineType?: 'AI_ENHANCED' | 'LOCAL_ONLY';
  aiError?: string | null;
}

// CDSCO Banned Active Ingredients / FDCs list for high-fidelity deterministic checking
const BANNED_INGREDIENTS = [
  { name: 'analgin', reason: 'Surgically banned due to agranulocytosis risk.', alternative: 'Paracetamol or Ibuprofen' },
  { name: 'nimesulide', ageLimit: 12, reason: 'Banned in children under 12 years due to hepatotoxicity risk.', alternative: 'Paracetamol suspension' },
  { name: 'sibutramine', reason: 'Surgically banned globally due to high cardiovascular risks.', alternative: 'Orlistat (under doctor supervision)' },
  { name: 'gatifloxacin', reason: 'Banned in formulation for systemic use due to dysglycemia risk.', alternative: 'Ciprofloxacin or Levofloxacin' },
  { name: 'rosiglitazone', reason: 'Suspended/banned in India due to increased risk of congestive heart failure.', alternative: 'Pioglitazone or Metformin' },
];

export const clinicalService = {
  /**
   * Run high-performance deterministic checks locally before querying AI
   */
  runLocalDeterministicChecks(
    cartItems: PosCartItem[],
    patientAge?: number,
    patientGender?: 'male' | 'female' | 'other'
  ): ClinicalAnalysisResult {
    const interactions: ClinicalAnalysisResult['interactions'] = [];
    const duplicates: ClinicalAnalysisResult['duplicates'] = [];
    const contraindications: ClinicalAnalysisResult['contraindications'] = [];
    const dosageWarnings: ClinicalAnalysisResult['dosageWarnings'] = [];
    const bannedOrSuspended: ClinicalAnalysisResult['bannedOrSuspended'] = [];

    const compositionMap = new Map<string, PosCartItem[]>();

    // Parse compositions to find duplicates and banned ingredients
    cartItems.forEach((item) => {
      const compositionText = (item.composition || '').toLowerCase();
      
      // 1. Check duplicate generic salts / ingredients
      if (compositionText) {
        // Simple extraction of salts (splitting by + or , or Advance)
        const salts = compositionText.split(/[\+,]/).map(s => s.trim().replace(/\d+\s*(mg|g|ml|mcg|iu)/g, '').trim());
        salts.forEach(salt => {
          if (salt.length > 2) {
            const existing = compositionMap.get(salt) || [];
            existing.push(item);
            compositionMap.set(salt, existing);
          }
        });
      }

      // 2. Check Banned CDSCO Drugs
      BANNED_INGREDIENTS.forEach((banned) => {
        if (compositionText.includes(banned.name)) {
          if (banned.ageLimit && patientAge !== undefined && patientAge >= banned.ageLimit) {
            // Age limit matches, not banned for this age
            return;
          }
          bannedOrSuspended.push({
            drug: item.name,
            reason: banned.reason,
            alternative: banned.alternative,
          });
        }
      });

      // 3. Age constraints (e.g. Aspirin in pediatric patients <12 yrs)
      if (patientAge !== undefined && patientAge < 12) {
        if (compositionText.includes('aspirin') || compositionText.includes('acetylsalicylic')) {
          contraindications.push({
            drug: item.name,
            type: 'Age',
            clinicalNote: 'Aspirin use in children under 12 is associated with Reye Syndrome (severe encephalopathy and liver damage).',
            recommendation: 'Replace with Paracetamol or Ibuprofen for fever/pain relief.',
          });
        }
      }

      // 4. Storage temperature alerts
      if ((item as any).isColdChain) {
        dosageWarnings.push({
          drug: item.name,
          warning: 'Cold Chain Storage Required (2°C - 8°C)',
          clinicalNote: 'This medicine requires continuous cold-chain maintenance to preserve stability and efficacy.',
          recommendation: 'Ensure product is dispensed in an insulated pouch with gel ice packs and instruct the patient to refrigerate immediately.',
        });
      }
    });

    // Populate generic duplications
    compositionMap.forEach((items, salt) => {
      if (items.length > 1) {
        duplicates.push({
          drugs: items.map(i => i.name),
          therapeuticClass: `Generic Component Overlap: "${salt.toUpperCase()}"`,
          clinicalNote: `Multiple medicines containing the active ingredient "${salt}" are in the cart. This presents an acute risk of accidental overdose.`,
          recommendation: 'Verify prescription and dispense only one brand containing this active generic ingredient.',
        });
      }
    });

    const safeToDispense = bannedOrSuspended.length === 0 && contraindications.length === 0;

    return {
      interactions,
      duplicates,
      contraindications,
      dosageWarnings,
      bannedOrSuspended,
      safeToDispense,
    };
  },

  /**
   * Run secure, server-side AI Analysis using Gemini
   */
  async runAIPoweredSafetyCheck(
    organizationId: string,
    cartItems: PosCartItem[],
    patientName: string,
    patientAge: number,
    patientGender: 'male' | 'female' | 'other',
    patientHistory = ''
  ): Promise<ClinicalAnalysisResult> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required for secure clinical AI queries');
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/clinical/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId,
          cartItems,
          patientName,
          patientAge,
          patientGender,
          patientHistory,
        }),
      });

      if (!response.ok) {
        const errObj = await response.json().catch(() => ({}));
        throw new Error(errObj.error || `Server query failed with status ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.result) {
        return resJson.result as ClinicalAnalysisResult;
      }
      throw new Error('Malformed server-side clinical safety response');
    } catch (err: any) {
      console.error('AIPoweredSafetyCheck Error:', err);
      throw err; // Rethrow so caller can gracefully catch and fallback without double-merging
    }
  },

  /**
   * Combined Clinical Check (Local Deterministic + AI-powered)
   */
  async runComprehensiveClinicalCheck(
    organizationId: string,
    cartItems: PosCartItem[],
    patientName: string,
    patientAge: number,
    patientGender: 'male' | 'female' | 'other',
    patientHistory = ''
  ): Promise<ClinicalAnalysisResult> {
    // 1. Execute instant local checks
    const local = this.runLocalDeterministicChecks(cartItems, patientAge, patientGender);

    let aiResult: ClinicalAnalysisResult | null = null;
    let aiError: string | null = null;

    try {
      // 2. Query secure clinical AI
      aiResult = await this.runAIPoweredSafetyCheck(
        organizationId,
        cartItems,
        patientName,
        patientAge,
        patientGender,
        patientHistory
      );
    } catch (err: any) {
      console.error('AI safety check failed or timed out:', err);
      aiError = err?.message || 'Clinical AI service offline or unconfigured';
    }

    // 3. Merge results gracefully
    if (aiResult) {
      return {
        interactions: [...local.interactions, ...aiResult.interactions],
        duplicates: [...local.duplicates, ...aiResult.duplicates],
        contraindications: [...local.contraindications, ...aiResult.contraindications],
        dosageWarnings: [...local.dosageWarnings, ...aiResult.dosageWarnings],
        bannedOrSuspended: [...local.bannedOrSuspended, ...aiResult.bannedOrSuspended],
        safeToDispense: local.safeToDispense && aiResult.safeToDispense,
        engineType: 'AI_ENHANCED',
        aiError: null,
      };
    } else {
      // AI check failed or timed out: fall back to local rules
      return {
        ...local,
        engineType: 'LOCAL_ONLY',
        aiError: aiError || 'Clinical AI safety engine offline',
      };
    }
  },

  /**
   * Log critical clinical events to the Audit Centre
   */
  async logClinicalOverride(
    organizationId: string,
    storeId: string,
    invoiceNumber: string,
    overrideReason: string,
    severity: 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>,
    actor: { uid: string; displayName?: string | null; roleId?: string | null }
  ): Promise<void> {
    await auditService.logAuditEvent({
      organizationId,
      storeId,
      actorUid: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.roleId || 'pharmacist',
      action: 'CLINICAL_ALERT_OVERRIDE',
      entityType: 'invoice',
      entityId: invoiceNumber,
      severity,
      reason: overrideReason,
      module: 'pos',
      metadata: {
        invoiceNumber,
        overrideReason,
        severity,
        alertsOverridden: details,
      },
    });

    // Create a mandatory system audit task for clinical review
    await taskService.createTask(organizationId, {
      organizationId,
      storeId,
      title: `Clinical Safety Override Review: Inv #${invoiceNumber}`,
      description: `A clinical safety alert of severity ${severity} was overridden during checkout. Overrider Reason: "${overrideReason}". Please review patient safety records immediately.`,
      taskType: 'H1_REVIEW',
      module: 'compliance',
      priority: severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
      status: 'OPEN',
      assignedTo: null,
      assignedRole: 'owner',
      createdBy: 'system',
      createdByName: 'Clinical Safety Monitor',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      relatedEntityType: 'invoice',
      relatedEntityId: invoiceNumber,
      relatedEntityLabel: `Override: ${invoiceNumber}`,
      relatedRoute: 'compliance',
      parentTaskId: null,
      sourceEventId: invoiceNumber,
      correlationId: `clinical_${Date.now()}`,
      completionNotes: null,
      attachments: [],
    });
  }
};
