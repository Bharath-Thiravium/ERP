import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  Search,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Calendar,
  X,
  Save,
  Download,
  Trash2
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface InventoryAudit {
  id: number;
  audit_code: string;
  audit_name: string;
  warehouse_name: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  audit_date: string;
  total_items: number;
  discrepancies: number;
  accuracy_percentage: number;
  conducted_by: string;
  created_at: string;
}

const InventoryAudits: React.FC = () => {
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);

  // Debounced search function
  const debouncedLoadAudits = useCallback(
    debounce((query: string, status: string) => {
      loadAuditsWithParams(query, status);
    }, 300),
    []
  );
  const [formData, setFormData] = useState({
    audit_name: '',
    warehouse: '',
    audit_date: '',
    audit_type: 'full',
    notes: ''
  });

  useEffect(() => {
    loadAuditsWithParams('', ''); // Initial load
  }, []);

  useEffect(() => {
    if (searchQuery || selectedStatus) {
      debouncedLoadAudits(searchQuery, selectedStatus);
    }
  }, [searchQuery, selectedStatus, debouncedLoadAudits]);

  const loadAuditsWithParams = async (query: string, status: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.search = query.trim();
      if (status) params.status = status;
      
      const data = await inventoryApi.getInventoryAudits(params);
      setAudits(data.results || data);
    } catch (error) {
      console.error('Failed to load audits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAudits = () => {
    loadAuditsWithParams(searchQuery, selectedStatus);
  };

  const loadWarehouses = async () => {
    try {
      const data = await inventoryApi.getWarehousesDropdown();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      setWarehouses([]);
    }
  };

  const handleCreateAudit = async () => {
    await loadWarehouses();
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const auditData = {
        audit_name: formData.audit_name,
        warehouse: parseInt(formData.warehouse),
        audit_date: formData.audit_date || new Date().toISOString().split('T')[0],
        notes: formData.notes
      };

      await inventoryApi.createInventoryAudit(auditData);
      toast.success('Audit created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadAudits();
    } catch (error) {
      console.error('Failed to create audit:', error);
      toast.error('Failed to create audit');
    } finally {
      setModalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      audit_name: '',
      warehouse: '',
      audit_date: new Date().toISOString().split('T')[0],
      audit_type: 'full',
      notes: ''
    });
  };

  const handleViewAudit = (audit: InventoryAudit) => {
    setSelectedAudit(audit);
    setShowViewModal(true);
  };

  const handleEditAudit = async (audit: InventoryAudit) => {
    setSelectedAudit(audit);
    setFormData({
      audit_name: audit.audit_name,
      warehouse: audit.warehouse_name,
      audit_date: audit.audit_date,
      audit_type: 'full',
      notes: ''
    });
    await loadWarehouses();
    setShowEditModal(true);
  };

  const handleDeleteAudit = async (auditId: number) => {
    if (!confirm('Are you sure you want to delete this audit?')) return;
    
    try {
      await inventoryApi.deleteInventoryAudit(auditId);
      toast.success('Audit deleted successfully!');
      loadAudits();
    } catch (error) {
      toast.error('Failed to delete audit');
    }
  };

  const handleDownloadAudit = (audit: InventoryAudit) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Inventory Audit - ${audit.audit_code}</title></head>
          <body>
            <h1>Inventory Audit Report</h1>
            <p><strong>Audit Code:</strong> ${audit.audit_code}</p>
            <p><strong>Audit Name:</strong> ${audit.audit_name}</p>
            <p><strong>Warehouse:</strong> ${audit.warehouse_name}</p>
            <p><strong>Status:</strong> ${audit.status.toUpperCase()}</p>
            <p><strong>Audit Date:</strong> ${new Date(audit.audit_date).toLocaleDateString()}</p>
            <p><strong>Total Items:</strong> ${audit.total_items}</p>
            <p><strong>Discrepancies:</strong> ${audit.discrepancies}</p>
            <p><strong>Accuracy:</strong> ${audit.accuracy_percentage}%</p>
            <p><strong>Conducted by:</strong> ${audit.conducted_by}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleUpdateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;
    
    setModalLoading(true);
    try {
      const auditData = {
        audit_name: formData.audit_name,
        warehouse: parseInt(formData.warehouse),
        audit_date: formData.audit_date || new Date().toISOString().split('T')[0],
        notes: formData.notes
      };

      await inventoryApi.updateInventoryAudit(selectedAudit.id, auditData);
      toast.success('Audit updated successfully!');
      setShowEditModal(false);
      setSelectedAudit(null);
      resetForm();
      loadAudits();
    } catch (error) {
      toast.error('Failed to update audit');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Calendar className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 98) return 'text-green-600';
    if (percentage >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <ClipboardCheck className="w-8 h-8 text-green-500" />
            <span>Inventory Audits</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Physical stock counting and verification</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={handleCreateAudit}>
            <Plus className="w-4 h-4 mr-2" />
            Start Audit
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Audits</p>
              <p className="text-white text-2xl font-bold">{audits.length}</p>
            </div>
            <ClipboardCheck className="w-6 h-6 text-blue-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">In Progress</p>
              <p className="text-white text-2xl font-bold">{audits.filter(a => a.status === 'in_progress').length}</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Completed</p>
              <p className="text-white text-2xl font-bold">{audits.filter(a => a.status === 'completed').length}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Avg Accuracy</p>
              <p className="text-white text-2xl font-bold">
                {audits.length > 0 ? 
                  (audits.reduce((sum, a) => sum + a.accuracy_percentage, 0) / audits.length).toFixed(1) : 0
                }%
              </p>
            </div>
            <BarChart3 className="w-6 h-6 text-purple-200" />
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search audits..."
              value={searchQuery}
              onChange={(e) => {
                e.preventDefault();
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {audits.map((audit) => (
          <motion.div
            key={audit.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl text-white">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{audit.audit_name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{audit.audit_code} • {audit.warehouse_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${getStatusColor(audit.status)}`}>
                    {getStatusIcon(audit.status)}
                    <span>{audit.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Total Items</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{audit.total_items}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Discrepancies</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{audit.discrepancies}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Accuracy</p>
                  <p className={`font-semibold ${getAccuracyColor(audit.accuracy_percentage)}`}>
                    {audit.accuracy_percentage}%
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Audit Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{new Date(audit.audit_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Conducted by {audit.conducted_by}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewAudit(audit)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {audit.status !== 'completed' && (
                    <Button variant="outline" size="sm" onClick={() => handleEditAudit(audit)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleDownloadAudit(audit)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteAudit(audit.id)} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create Audit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowCreateModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Start New Audit</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Create a new inventory audit</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audit Name *</label>
                      <input
                        type="text"
                        value={formData.audit_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, audit_name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter audit name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warehouse</label>
                        <select
                          value={formData.warehouse}
                          onChange={(e) => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select Warehouse</option>
                          {Array.isArray(warehouses) && warehouses.map((warehouse: any) => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audit Date *</label>
                        <input
                          type="date"
                          value={formData.audit_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, audit_date: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audit Type</label>
                      <select
                        value={formData.audit_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, audit_type: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="full">Full Audit</option>
                        <option value="cycle">Cycle Count</option>
                        <option value="spot">Spot Check</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Additional notes or instructions"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={modalLoading}
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                    >
                      {modalLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Start Audit
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* View Audit Modal */}
      <AnimatePresence>
        {showViewModal && selectedAudit && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowViewModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audit Details</h2>
                  <button onClick={() => setShowViewModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>Audit Code:</strong> {selectedAudit.audit_code}</div>
                    <div><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedAudit.status)}`}>{selectedAudit.status.toUpperCase()}</span></div>
                    <div><strong>Audit Name:</strong> {selectedAudit.audit_name}</div>
                    <div><strong>Warehouse:</strong> {selectedAudit.warehouse_name}</div>
                    <div><strong>Audit Date:</strong> {new Date(selectedAudit.audit_date).toLocaleDateString()}</div>
                    <div><strong>Total Items:</strong> {selectedAudit.total_items}</div>
                    <div><strong>Discrepancies:</strong> {selectedAudit.discrepancies}</div>
                    <div><strong>Accuracy:</strong> {selectedAudit.accuracy_percentage}%</div>
                  </div>
                  <div><strong>Conducted by:</strong> {selectedAudit.conducted_by}</div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Audit Modal */}
      <AnimatePresence>
        {showEditModal && selectedAudit && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowEditModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Audit</h2>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateAudit} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audit Name *</label>
                      <input
                        type="text"
                        value={formData.audit_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, audit_name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warehouse</label>
                        <select
                          value={formData.warehouse}
                          onChange={(e) => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select Warehouse</option>
                          {Array.isArray(warehouses) && warehouses.map((warehouse: any) => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audit Date *</label>
                        <input
                          type="date"
                          value={formData.audit_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, audit_date: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={modalLoading}
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                    >
                      {modalLoading ? 'Updating...' : 'Update Audit'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryAudits;