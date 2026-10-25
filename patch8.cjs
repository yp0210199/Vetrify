const fs = require('fs');
let code = fs.readFileSync('src/views/settings/StaffManagementView.tsx', 'utf8');

const oldCode = `                      {inv.status === 'expired' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]">
                          Expired
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-[#D97706]">
                          Awaiting Accept
                        </span>
                      )}`;

const newCode = `                      {inv.status === 'expired' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]">
                          Expired
                        </span>
                      ) : inv.status === 'revoked' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-[#D97706]">
                          Awaiting Accept
                        </span>
                      )}`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/views/settings/StaffManagementView.tsx', code);
