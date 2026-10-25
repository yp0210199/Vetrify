const fs = require('fs');
let code = fs.readFileSync('src/components/staff/StaffDetailsDrawer.tsx', 'utf8');

code = code.replace(
  'await staffInvitationService.resendStaffInvitation(',
  'await staffInvitationService.regenerateStaffInvitation('
);

// Add Delete action logic
if (!code.includes('handleDeleteInvite')) {
  const deleteAction = `
  const handleDeleteInvite = async () => {
    if (!organization?.id || !invitation || !currentStaff) return;
    if (!window.confirm(\`Are you sure you want to permanently remove this invitation?\`)) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await staffInvitationService.deleteStaffInvitation(
        organization.id,
        invitation.id,
        currentStaff
      );
      onStaffStatusChanged();
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeInvite
`;
  code = code.replace('const handleRevokeInvite', deleteAction);
}

// Add the Delete Button UI
if (!code.includes('onClick={handleDeleteInvite}')) {
  const buttonsHtml = `
            {invitation.status !== 'accepted' && (
              <Button
                variant="secondary"
                size="sm"
                icon={Trash2}
                disabled={isProcessing}
                onClick={handleDeleteInvite}
                className="text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5]"
              >
                Remove
              </Button>
            )}
`;
  // Let's find the closing tag for the Revoke Button or something, and inject the delete button
  code = code.replace(
    /<\/Button>\s*<\/div>\s*\)\}\s*\{\/\* Staff Control Actions \*\/\}/g,
    `</Button>
${buttonsHtml}
            </div>
          )}
          {/* Staff Control Actions */}`
  );
}

// Add Trash2 to imports
if (!code.includes('Trash2')) {
  code = code.replace('AlertTriangle,', 'AlertTriangle, Trash2,');
}

fs.writeFileSync('src/components/staff/StaffDetailsDrawer.tsx', code);
