import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { TDS_SECTIONS } from './types';

interface Props {
  invoiceId: number;
  sessionKey: string;
  tdsApplicable: boolean;
  tdsSection: string;
  tdsRate: number;
  onSaved: (applicable: boolean, section: string, rate: number) => void;
}

const TDSConfigPanel: React.FC<Props> = ({
  invoiceId, sessionKey, tdsApplicable, tdsSection, tdsRate, onSaved,
}) => {
  const [editing, setEditing] = useState(!tdsApplicable && tdsSection === '');
  const [applicable, setApplicable] = useState(tdsApplicable);
  const [section, setSection]     = useState(tdsSection);
  const [rate, setRate]           = useState(tdsRate);
  const [saving, setSaving]       = useState(false);

  const handleSectionChange = (val: string) => {
    setSection(val);
    const found = TDS_SECTIONS.find(s => s.value === val);
    if (found) setRate(found.rate);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { default: api } = await import('../../../../../lib/api');
      await api.patch(
        `/api/finance/invoices/${invoiceId}/tds-config/`,
        { tds_applicable: applicable, tds_section: applicable ? section : '', tds_rate: applicable ? rate : 0 },
        { params: { session_key: sessionKey } },
      );
      onSaved(applicable, applicable ? section : '', applicable ? rate : 0);
      setEditing(false);
    } catch {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Failed to save TDS config');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-orange-800 dark:text-orange-200">TDS</span>
          {tdsApplicable
            ? <span className="text-orange-700 dark:text-orange-300">{tdsSection} · {tdsRate}%</span>
            : <span className="text-gray-400">Not applicable</span>}
        </div>
        <button
          type="button"
          onClick={() => { setApplicable(tdsApplicable); setSection(tdsSection); setRate(tdsRate); setEditing(true); }}
          className="flex items-center gap-1 text-orange-600 hover:text-orange-800 font-medium"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="border border-orange-200 dark:border-orange-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20">
        <span className="text-xs font-semibold text-orange-800 dark:text-orange-200">TDS Configuration</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-orange-600 dark:text-orange-300">Applicable</span>
          <div
            onClick={() => setApplicable(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${applicable ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${applicable ? 'translate-x-4' : ''}`} />
          </div>
        </label>
      </div>

      {applicable && (
        <div className="px-3 py-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Section *</label>
            <select
              value={section}
              onChange={e => handleSectionChange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select</option>
              {TDS_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (%)</label>
            <input
              type="number" step="0.01" min="0" value={rate}
              onChange={e => setRate(parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button" disabled={saving || (applicable && !section)}
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium"
        >
          <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
        </button>
        {(tdsApplicable || tdsSection) && (
          <button
            type="button" onClick={() => setEditing(false)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default TDSConfigPanel;
