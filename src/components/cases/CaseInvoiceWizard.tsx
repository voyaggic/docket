import React, { useState } from 'react';
import { X, Check, DollarSign, PiggyBank, Receipt, FileSpreadsheet, Loader2, Award, Printer } from 'lucide-react';
import { Case, Client } from '../../types';

interface FeeNote {
  id: string;
  date: string;
  lawyerName: string;
  description: string;
  hours: number;
  rate: number;
  status: 'unbilled' | 'billed';
}

interface Disbursement {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy: string;
  status: 'unbilled' | 'billed';
}

interface CaseInvoiceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  caseRef: string;
  client: Client;
  firmName: string;
  unbilledFees: FeeNote[];
  unbilledDisbursements: Disbursement[];
  onInvoiceGenerated: (newInvoice: any, billedFeeIds: string[], billedDisbursementIds: string[]) => void;
}

export default function CaseInvoiceWizard({
  isOpen, onClose, caseRef, client, firmName, unbilledFees, unbilledDisbursements, onInvoiceGenerated
}: CaseInvoiceWizardProps) {
  const [selectedFees, setSelectedFees] = useState<string[]>(unbilledFees.map(f => f.id));
  const [selectedDisbursements, setSelectedDisbursements] = useState<string[]>(unbilledDisbursements.map(d => d.id));
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modifiers
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(15); // e.g. 15% VAT

  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${caseRef || 'DK'}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const toggleFee = (id: string) => {
    setError('');
    setSelectedFees(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const toggleDisbursement = (id: string) => {
    setError('');
    setSelectedDisbursements(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  // Calculations
  const calculatedFeesSub = unbilledFees
    .filter(f => selectedFees.includes(f.id))
    .reduce((sum, f) => sum + (f.hours * f.rate), 0);

  const calculatedDisbSub = unbilledDisbursements
    .filter(d => selectedDisbursements.includes(d.id))
    .reduce((sum, d) => sum + d.amount, 0);

  const subtotal = calculatedFeesSub + calculatedDisbSub;
  const discountAmount = discount > 0 ? (subtotal * (discount / 100)) : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * (taxRate / 100));
  const grandTotal = afterDiscount + taxAmount;

  const handleGenerate = () => {
    if (selectedFees.length === 0 && selectedDisbursements.length === 0) {
      setError("Please check at least one billing item to generate.");
      return;
    }
    setError('');

    setSaving(true);
    setTimeout(() => {
      setSaving(false);

      const items = [
        ...unbilledFees.filter(f => selectedFees.includes(f.id)).map(f => ({
          desc: `${f.description} (Logged by ${f.lawyerName} - ${f.hours} hours @ £${f.rate}/hr)`,
          amount: f.hours * f.rate
        })),
        ...unbilledDisbursements.filter(d => selectedDisbursements.includes(d.id)).map(d => ({
          desc: `${d.description} (Incurred expense - Paid by ${d.paidBy})`,
          amount: d.amount
        }))
      ];

      const newInvoice = {
        id: 'inv-' + Date.now(),
        invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate,
        lineItems: items,
        subtotal,
        discount,
        tax: taxAmount,
        total: grandTotal,
        status: 'pending'
      };

      onInvoiceGenerated(newInvoice, selectedFees, selectedDisbursements);
      setSuccessMessage("Invoice statement successfully compiled and dispatched!");
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    }, 1800);
  };

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-64 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto relative p-6 flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Legal Fee Invoicing Panel</h3>
              <p className="text-[10px] text-slate-400">Compile unbilled timesheets and disbursements into a client statement.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body Layout */}
        <div className="flex-1 overflow-y-auto mb-4 grid grid-cols-1 lg:grid-cols-12 gap-5 pr-1">
          
          {/* List items chooser (Left pane) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Timesheets */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Select Unbilled Hours / Fee Notes</span>
              {unbilledFees.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xxs border rounded-xl bg-slate-50">
                  No unbilled timesheets found on matter ledger.
                </div>
              ) : (
                <div className="space-y-1 max-h-[160px] overflow-y-auto p-1 bg-slate-50 border rounded-xl">
                  {unbilledFees.map(fee => {
                    const isChecked = selectedFees.includes(fee.id);
                    return (
                      <div 
                        key={fee.id}
                        onClick={() => toggleFee(fee.id)}
                        className={`p-2 rounded-lg border text-xxs flex justify-between items-center cursor-pointer select-none transition ${
                          isChecked ? 'border-emerald-300 bg-emerald-50/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={isChecked} onChange={() => {}} className="h-3.5 w-3.5 rounded-full accent-emerald-600" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 line-clamp-1">{fee.description}</span>
                            <span className="text-[10px] text-slate-400 block">{fee.lawyerName} &bull; {fee.hours} hrs @ £{fee.rate}/hr</span>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-700 font-mono">£{fee.hours * fee.rate}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expenses */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Select Unbilled Disbursements</span>
              {unbilledDisbursements.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xxs border rounded-xl bg-slate-50">
                  No logged disbursements active for billing.
                </div>
              ) : (
                <div className="space-y-1 max-h-[140px] overflow-y-auto p-1 bg-slate-50 border rounded-xl">
                  {unbilledDisbursements.map(disb => {
                    const isChecked = selectedDisbursements.includes(disb.id);
                    return (
                      <div 
                        key={disb.id}
                        onClick={() => toggleDisbursement(disb.id)}
                        className={`p-2 rounded-lg border text-xxs flex justify-between items-center cursor-pointer select-none transition ${
                          isChecked ? 'border-emerald-300 bg-emerald-50/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" checked={isChecked} onChange={() => {}} className="h-3.5 w-3.5 rounded-full accent-emerald-600" />
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 line-clamp-1">{disb.description}</span>
                            <span className="text-[9px] text-slate-400 block">Date: {disb.date} &bull; Paid by {disb.paidBy}</span>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-700 font-mono">£{disb.amount}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Properties Inputs */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Invoice Serial ID</label>
                <input 
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full text-xxs p-2 bg-white border rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Payment Terms / Due Date</label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full text-xxs p-1.5 bg-white border rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Apply Firm Offer Discount (%)</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={e => setDiscount(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full text-xxs p-2 bg-white border rounded-lg outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">VAT / Tax Rate (%)</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={e => setTaxRate(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full text-xxs p-2 bg-white border rounded-lg outline-none font-bold"
                />
              </div>
            </div>

          </div>

          {/* Interactive Letterhead Visualizer (Right pane) */}
          <div className="lg:col-span-5 bg-slate-100 p-4 rounded-xl border flex flex-col justify-between max-h-[460px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 text-center">Receipt Statement Preview</span>
            
            <div className="bg-white p-4 rounded-lg border shadow-xs text-[10px] font-sans flex-1 overflow-y-auto space-y-3 relative">
              {/* Draft banner watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none rotate-12">
                <span className="text-6xl font-black tracking-widest uppercase">Invoice Draft</span>
              </div>

              {/* Letterhead */}
              <div className="border-b pb-2 flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">{firmName || "Docket Legal LLC"}</h4>
                  <p className="text-[8px] text-slate-400">10 Downing St, London, UK</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold bg-slate-100 p-0.5 px-1.5 rounded">{invoiceNumber}</span>
                  <p className="text-[8px] text-slate-400 mt-0.5">Due: {dueDate}</p>
                </div>
              </div>

              {/* Client Info */}
              <div>
                <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Presented to client:</span>
                <span className="font-extrabold text-slate-800 text-[11px]">{client.fullName}</span>
                <p className="text-[8px] text-slate-400">{client.email || 'No email design'}</p>
              </div>

              {/* Items checklist */}
              <div className="space-y-1.5 border-t border-b py-2 my-2">
                <div className="flex justify-between font-bold text-slate-400 uppercase text-[8px] border-b pb-0.5">
                  <span>Logged Matter Item Description</span>
                  <span>Amount</span>
                </div>

                {unbilledFees.filter(f => selectedFees.includes(f.id)).map(fee => (
                  <div key={fee.id} className="flex justify-between text-slate-700">
                    <span className="truncate max-w-[140px] font-medium">{fee.description}</span>
                    <span className="font-mono">£{fee.hours * fee.rate}</span>
                  </div>
                ))}

                {unbilledDisbursements.filter(d => selectedDisbursements.includes(d.id)).map(disb => (
                  <div key={disb.id} className="flex justify-between text-slate-700">
                    <span className="truncate max-w-[140px] font-medium">{disb.description}</span>
                    <span className="font-mono">£{disb.amount}</span>
                  </div>
                ))}

                {(selectedFees.length === 0 && selectedDisbursements.length === 0) && (
                  <p className="text-center py-4 text-[9px] text-slate-300 italic block">Empty Invoice - Select items on the left side.</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-[10px] font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">£{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-650 text-rose-600">
                    <span>Discount Included ({discount}%):</span>
                    <span className="font-mono">-£{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT ({taxRate}%):</span>
                  <span className="font-mono">£{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-800 border-t pt-1.5 mt-1">
                  <span>Grand Total Due:</span>
                  <span className="font-mono text-emerald-700 text-sm">£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Print trigger indicator */}
            <p className="text-[9px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1">
              <Printer className="h-3 w-3 shrink-0 text-slate-400" />
              <span>Statement outputs will format automatically with firm letterhead presets.</span>
            </p>
          </div>

        </div>

        {/* Banners for Validation & Progress */}
        <div className="space-y-2 select-none">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-2 mb-2">
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-2 mb-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleGenerate}
            disabled={saving || (selectedFees.length === 0 && selectedDisbursements.length === 0)}
            className="p-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl shadow cursor-pointer transition flex items-center gap-1.5 min-h-[44px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Generating bill statement...</span>
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 shrink-0" />
                <span>Confirm invoice compile & send</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
