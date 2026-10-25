const fs = require('fs');
let code = fs.readFileSync('src/components/staff/InviteStaffModal.tsx', 'utf8');

if (!code.includes('const [existingInvite, setExistingInvite]')) {
  code = code.replace('const [createdInvite, setCreatedInvite] = useState<StaffInvitation | null>(null);', 
    'const [createdInvite, setCreatedInvite] = useState<StaffInvitation | null>(null);\n  const [existingInvite, setExistingInvite] = useState<StaffInvitation | null>(null);');
}

if (!code.includes('setExistingInvite(null);')) {
  code = code.replace('setCreatedInvite(null);', 'setCreatedInvite(null);\n    setExistingInvite(null);');
}

const submitLogic = `
    setIsSubmitting(true);

    try {
      const pending = await staffInvitationService.checkPendingInvitation(organization.id, emailClean);
      if (pending) {
         setExistingInvite(pending);
         setIsSubmitting(false);
         return;
      }

      const invitation = await staffInvitationService.createInvitation(`;

code = code.replace(/setIsSubmitting\(true\);\s*try\s*\{\s*const invitation = await staffInvitationService\.createInvitation\(/, submitLogic);

const existingView = `
      {existingInvite ? (
        <div className="space-y-5">
          <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#92400E]">
                Active Invitation Exists
              </h4>
              <p className="text-xs text-[#92400E] mt-0.5">
                An active invitation already exists for <span className="font-mono">{existingInvite.email}</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setExistingInvite(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const url = getInviteUrl(existingInvite);
                navigator.clipboard.writeText(url);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 3000);
                setExistingInvite(null);
                setCreatedInvite(existingInvite);
              }}
            >
              {copiedLink ? 'Copied' : 'Copy Existing Link'}
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  const newInv = await staffInvitationService.regenerateStaffInvitation(
                    organization!.id,
                    existingInvite.id,
                    currentStaff!
                  );
                  setExistingInvite(null);
                  setCreatedInvite(newInv);
                  onInvitationCreated(newInv);
                } catch (err: any) {
                  setErrorMsg(err?.message || 'Failed to regenerate invitation');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? 'Generating...' : 'Revoke & Generate New'}
            </Button>
          </div>
        </div>
      ) : createdInvite ? (
`;

code = code.replace(/\{createdInvite \? \(/, existingView);

fs.writeFileSync('src/components/staff/InviteStaffModal.tsx', code);
