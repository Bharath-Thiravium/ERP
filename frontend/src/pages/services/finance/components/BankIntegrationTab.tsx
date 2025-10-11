import React, { useState, useEffect } from 'react';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { CheckCircle, XCircle, Clock, Upload, Download, Eye } from 'lucide-react';
import { apiClient } from '../../../../lib/api';
import toast from 'react-hot-toast';

interface Customer {
  id: number;
  name: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  bank_branch: string;
  account_holder_name: string;
  bank_verification_status: 'pending' | 'verified' | 'failed';
  bank_verified_date: string | null;
  statement_import_enabled: boolean;
  last_statement_import: string | null;
}

interface ReconciliationData {
  total_statements: number;
  matched_count: number;
  unmatched_count: number;
  matched_statements: Array<{
    id: number;
    date: string;
    amount: number;
    description: string;
    payment_number: string | null;
    confidence: number;
  }>;
  unmatched_statements: Array<{
    id: number;
    date: string;
    amount: number;
    description: string;
    reference: string;
  }>;
}

const BankIntegrationTab: React.FC = () => {
  const { sessionKey } = useServiceUserStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    if (!sessionKey) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get('/api/finance/integration/customers/');
      setCustomers(response.data.customers);
    } catch (error: any) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBankDetails = async (customer: Customer) => {
    if (!sessionKey) return;
    
    try {
      await apiClient.post('/api/finance/integration/verify-bank/', {
        customer_id: customer.id
      });
      
      toast.success('Bank details verification completed');
      loadCustomers(); // Refresh data
    } catch (error: any) {
      toast.error('Bank verification failed');
    }
  };

  const handleImportStatement = async () => {
    if (!sessionKey || !selectedCustomer || !uploadFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('customer_id', selectedCustomer.id.toString());
      formData.append('file', uploadFile);
      
      const response = await apiClient.post('/api/finance/integration/import-statement/', formData);
      
      toast.success(`Imported ${response.data.imported_transactions} transactions, matched ${response.data.matched_payments} payments`);
      setShowImportModal(false);
      setUploadFile(null);
      loadCustomers();
    } catch (error: any) {
      toast.error('Statement import failed');
    } finally {
      setImporting(false);
    }
  };

  const loadReconciliationData = async (customer: Customer) => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.get('/api/finance/integration/reconciliation/', {
        params: { customer_id: customer.id }
      });
      setReconciliationData(response.data);
      setSelectedCustomer(customer);
      setShowReconciliationModal(true);
    } catch (error: any) {
      toast.error('Failed to load reconciliation data');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'failed':
        return <Badge variant="error"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bank Integration</h2>
        <Button onClick={loadCustomers}>
          <Download className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No customers with bank details found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Add bank details to customers to enable bank integration.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">{customer.name}</h3>
                    {getStatusBadge(customer.bank_verification_status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Bank:</span>
                      <p className="font-medium">{customer.bank_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Account:</span>
                      <p className="font-medium">****{customer.bank_account_number.slice(-4)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">IFSC:</span>
                      <p className="font-medium">{customer.bank_ifsc_code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Branch:</span>
                      <p className="font-medium">{customer.bank_branch}</p>
                    </div>
                  </div>
                  
                  {customer.last_statement_import && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last import: {new Date(customer.last_statement_import).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {customer.bank_verification_status !== 'verified' && (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyBankDetails(customer)}
                    >
                      Verify Details
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowImportModal(true);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import Statement
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadReconciliationData(customer)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Reconciliation
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Import Statement Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Bank Statement"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Customer: <strong>{selectedCustomer?.name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Upload CSV file with columns: Date, Amount, Description, Reference
            </p>
          </div>
          
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportStatement}
              disabled={!uploadFile || importing}
            >
              {importing ? 'Importing...' : 'Import Statement'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reconciliation Modal */}
      <Modal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
        title="Bank Reconciliation"
        size="lg"
      >
        {reconciliationData && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Customer: <strong>{selectedCustomer?.name}</strong>
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {reconciliationData.total_statements}
                  </div>
                  <div className="text-sm text-gray-600">Total Statements</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {reconciliationData.matched_count}
                  </div>
                  <div className="text-sm text-gray-600">Matched</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {reconciliationData.unmatched_count}
                  </div>
                  <div className="text-sm text-gray-600">Unmatched</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-600">Matched Transactions</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reconciliationData.matched_statements.map((stmt) => (
                    <div key={stmt.id} className="p-3 bg-green-50 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">₹{stmt.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{stmt.description}</p>
                          <p className="text-xs text-gray-500">{stmt.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-green-600">{stmt.confidence}% match</p>
                          {stmt.payment_number && (
                            <p className="text-xs text-gray-500">{stmt.payment_number}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-red-600">Unmatched Transactions</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reconciliationData.unmatched_statements.map((stmt) => (
                    <div key={stmt.id} className="p-3 bg-red-50 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">₹{stmt.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{stmt.description}</p>
                          <p className="text-xs text-gray-500">{stmt.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{stmt.reference}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankIntegrationTab;