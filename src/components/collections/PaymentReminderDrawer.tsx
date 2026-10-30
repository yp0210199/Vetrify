import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Copy, ExternalLink, Check, Smartphone } from 'lucide-react';
import { CustomerAgingSummary } from '../../types/collections';
import { collectionsService } from '../../services/collectionsService';

interface PaymentReminderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CustomerAgingSummary | null;
  showroomName?: string;
  upiId?: string;
}

export const PaymentReminderDrawer: React.FC<PaymentReminderDrawerProps> = ({
  isOpen,
  onClose,
  summary,
  showroomName = 'Royal Ceramics & Tiles',
  upiId = 'royalceramics@icici',
}) => {
  if (!isOpen || !summary) return null;

  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (summary) {
      const generated = collectionsService.generateReminderMessage(summary, showroomName, upiId);
      setMessageText(generated);
    }
  }, [summary, showroomName, upiId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = (summary.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Site Material Payment Reminder</h3>
              <p className="text-[11px] text-slate-400">WhatsApp & SMS formatted template</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-900">{summary.customerName}</span>
              <p className="text-[11px] text-slate-500 font-mono">{summary.phone}</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900">₹{summary.currentOutstanding.toLocaleString('en-IN')}</span>
              {summary.totalOverdue > 0 && (
                <p className="text-[10px] text-rose-600 font-bold">Overdue: ₹{summary.totalOverdue.toLocaleString('en-IN')}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
              Editable Reminder Message
            </label>
            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
