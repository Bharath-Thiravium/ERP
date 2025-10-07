import React, { useState, useEffect } from 'react';
import { multiCompanyApi, Branch, TDSSection, ReverseChargeTransaction, ImportExportTransaction, AdvancedTDSDeductee } from '../../../../services/multiCompanyApi';
import { DataTable } from '../../../../components/ui/DataTable';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

const MultiCompanyManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Branch Management State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({
    branch_code: '',
    branch_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_code: '',
    pincode: '',
    country: 'India',
    gstin: '',
    phone: '',
    email: '',
    is_active: true,
    is_head_office: false
  });

  // TDS Deductee State
  const [tdsDeductees, setTdsDeductees] = useState<AdvancedTDSDeductee[]>([]);
  const [showTDSModal, setShowTDSModal] = useState(false);
  const [tdsForm, setTdsForm] = useState({
    deductee_name: '',
    deductee_type: 'company',
    pan_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    default_tds_section: '',
    annual_threshold: 0,
    is_active: true
  });

  // Reverse Charge State
  const [reverseChargeTransactions, setReverseChargeTransactions] = useState<ReverseChargeTransaction[]>([]);
  const [showReverseChargeModal, setShowReverseChargeModal] = useState(false);
  const [reverseChargeForm, setReverseChargeForm] = useState({
    transaction_type: 'import_services',
    supplier_name: '',
    supplier_gstin: '',
    invoice_number: '',
    invoice_date: '',
    taxable_value: 0,
    cgst_rate: 0,
    sgst_rate: 0,
    igst_rate: 18,
    branch: ''
  });

  // Import/Export State
  const [importExportTransactions, setImportExportTransactions] = useState<ImportExportTransaction[]>([]);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importExportForm, setImportExportForm] = useState({
    transaction_type: 'import' as 'import' | 'export',
    counterparty_name: '',
    counterparty_country: '',
    counterparty_address: '',
    invoice_number: '',
    invoice_date: '',
    foreign_currency: 'USD',
    foreign_amount: 0,
    exchange_rate: 83.0,
    igst_rate: 18,
    branch: ''
  });

  const [tdsSections, setTdsSections] = useState<TDSSection[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadTDSSections();
  }, []);

  useEffect(() => {
    if (activeTab === 'branches') {
      loadBranches();
    } else if (activeTab === 'tds-deductees') {
      loadTDSDeductees();
    } else if (activeTab === 'reverse-charge') {
      loadReverseChargeTransactions();
    } else if (activeTab === 'import-export') {
      loadImportExportTransactions();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await multiCompanyApi.getMultiCompanyDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await multiCompanyApi.getBranches();
      setBranches(response.results);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadTDSSections = async () => {
    try {
      const response = await multiCompanyApi.getTDSSections();
      setTdsSections(response.results);
    } catch (error) {
      console.error('Error loading TDS sections:', error);
    }
  };

  const loadTDSDeductees = async () => {
    try {
      const response = await multiCompanyApi.getTDSDeductees();
      setTdsDeductees(response.results);
    } catch (error) {
      console.error('Error loading TDS deductees:', error);
    }
  };

  const loadReverseChargeTransactions = async () => {
    try {
      const response = await multiCompanyApi.getReverseChargeTransactions();
      setReverseChargeTransactions(response.results);
    } catch (error) {
      console.error('Error loading reverse charge transactions:', error);
    }
  };

  const loadImportExportTransactions = async () => {
    try {
      const response = await multiCompanyApi.getImportExportTransactions();
      setImportExportTransactions(response.results);
    } catch (error) {
      console.error('Error loading import/export transactions:', error);
    }
  };

  const handleCreateBranch = async () => {
    try {
      await multiCompanyApi.createBranch(branchForm);
      setShowBranchModal(false);
      setBranchForm({
        branch_code: '',
        branch_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        state_code: '',
        pincode: '',
        country: 'India',
        gstin: '',
        phone: '',
        email: '',
        is_active: true,
        is_head_office: false
      });
      loadBranches();
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const handleCreateTDSDeductee = async () => {
    try {
      await multiCompanyApi.createTDSDeductee(tdsForm);
      setShowTDSModal(false);
      setTdsForm({
        deductee_name: '',
        deductee_type: 'company',
        pan_number: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        default_tds_section: '',
        annual_threshold: 0,
        is_active: true
      });
      loadTDSDeductees();
    } catch (error) {
      console.error('Error creating TDS deductee:', error);
    }
  };

  const handleCreateReverseCharge = async () => {
    try {
      await multiCompanyApi.createReverseChargeTransaction(reverseChargeForm);
      setShowReverseChargeModal(false);
      setReverseChargeForm({
        transaction_type: 'import_services',
        supplier_name: '',
        supplier_gstin: '',
        invoice_number: '',
        invoice_date: '',
        taxable_value: 0,
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 18,
        branch: ''
      });
      loadReverseChargeTransactions();
    } catch (error) {
      console.error('Error creating reverse charge transaction:', error);
    }
  };

  const handleCreateImportExport = async () => {
    try {
      await multiCompanyApi.createImportExportTransaction(importExportForm);
      setShowImportExportModal(false);
      setImportExportForm({
        transaction_type: 'import',
        counterparty_name: '',
        counterparty_country: '',
        counterparty_address: '',
        invoice_number: '',
        invoice_date: '',
        foreign_currency: 'USD',
        foreign_amount: 0,
        exchange_rate: 83.0,
        igst_rate: 18,
        branch: ''
      });
      loadImportExportTransactions();
    } catch (error) {
      console.error('Error creating import/export transaction:', error);
    }
  };

  const branchColumns = [
    { key: 'branch_code', header: 'Branch Code' },
    { key: 'branch_name', header: 'Branch Name' },
    { key: 'city', header: 'City' },
    { key: 'state', header: 'State' },
    { key: 'gstin', header: 'GSTIN' },
    { 
      key: 'is_head_office', 
      header: 'Head Office',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'error'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  const tdsDeducteeColumns = [
    { key: 'deductee_name', header: 'Deductee Name' },
    { key: 'deductee_type', header: 'Type' },
    { key: 'pan_number', header: 'PAN Number' },
    { key: 'tds_section_name', header: 'TDS Section' },
    { 
      key: 'applicable_tds_rate', 
      header: 'TDS Rate',
      render: (value: number) => `${value}%`
    },
    { 
      key: 'annual_threshold', 
      header: 'Annual Threshold',
      render: (value: number) => `₹${value.toLocaleString()}`
    }
  ];

  const reverseChargeColumns = [
    { key: 'transaction_type', header: 'Type' },
    { key: 'supplier_name', header: 'Supplier' },
    { key: 'invoice_number', header: 'Invoice No.' },
    { key: 'invoice_date', header: 'Date' },
    { 
      key: 'taxable_value', 
      header: 'Taxable Value',
      render: (value: number) => `₹${value.toLocaleString()}`
    },
    { 
      key: 'total_tax', 
      header: 'Total Tax',
      render: (value: number) => `₹${value.toLocaleString()}`
    },
    { 
      key: 'is_filed_in_gstr2', 
      header: 'GSTR2 Filed',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Filed' : 'Pending'}
        </Badge>
      )
    }
  ];

  const importExportColumns = [
    { key: 'transaction_type', header: 'Type' },
    { key: 'counterparty_name', header: 'Counterparty' },
    { key: 'counterparty_country', header: 'Country' },
    { key: 'invoice_number', header: 'Invoice No.' },
    { key: 'foreign_currency', header: 'Currency' },
    { 
      key: 'foreign_amount', 
      header: 'Foreign Amount',
      render: (value: number, row: ImportExportTransaction) => 
        `${row.foreign_currency} ${value.toLocaleString()}`
    },
    { 
      key: 'inr_amount', 
      header: 'INR Amount',
      render: (value: number) => `₹${value.toLocaleString()}`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Multi-Company & Advanced Features</h2>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="branches">Branch Management</TabsTrigger>
          <TabsTrigger value="tds-deductees">TDS Deductees</TabsTrigger>
          <TabsTrigger value="reverse-charge">Reverse Charge</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardData && (
              <>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Branches</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {dashboardData.branch_statistics?.total_branches || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardData.branch_statistics?.active_branches || 0} Active
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Inter-State Transactions</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {dashboardData.transaction_statistics?.interstate_transactions?.count || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    ₹{(dashboardData.transaction_statistics?.interstate_transactions?.total_value || 0).toLocaleString()}
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Reverse Charge</h3>
                  <div className="text-3xl font-bold text-orange-600">
                    {dashboardData.transaction_statistics?.reverse_charge_transactions?.count || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    ₹{(dashboardData.transaction_statistics?.reverse_charge_transactions?.total_value || 0).toLocaleString()}
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">TDS Deductees</h3>
                  <div className="text-3xl font-bold text-purple-600">
                    {dashboardData.compliance_statistics?.total_tds_deductees || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardData.compliance_statistics?.active_tds_sections || 0} TDS Sections
                  </p>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="branches">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Branch Management</h3>
              <Button onClick={() => setShowBranchModal(true)}>
                Add Branch
              </Button>
            </div>

            <DataTable
              data={branches}
              columns={branchColumns}
            />
          </div>
        </TabsContent>

        <TabsContent value="tds-deductees">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">TDS Deductees</h3>
              <Button onClick={() => setShowTDSModal(true)}>
                Add TDS Deductee
              </Button>
            </div>

            <DataTable
              data={tdsDeductees}
              columns={tdsDeducteeColumns}
            />
          </div>
        </TabsContent>

        <TabsContent value="reverse-charge">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Reverse Charge Transactions</h3>
              <Button onClick={() => setShowReverseChargeModal(true)}>
                Add Transaction
              </Button>
            </div>

            <DataTable
              data={reverseChargeTransactions}
              columns={reverseChargeColumns}
            />
          </div>
        </TabsContent>

        <TabsContent value="import-export">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Import/Export Transactions</h3>
              <Button onClick={() => setShowImportExportModal(true)}>
                Add Transaction
              </Button>
            </div>

            <DataTable
              data={importExportTransactions}
              columns={importExportColumns}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Branch Modal */}
      <Modal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title="Add Branch"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Branch Code"
              value={branchForm.branch_code}
              onChange={(e) => setBranchForm({...branchForm, branch_code: e.target.value})}
            />
            <Input
              placeholder="Branch Name"
              value={branchForm.branch_name}
              onChange={(e) => setBranchForm({...branchForm, branch_name: e.target.value})}
            />
          </div>
          
          <Input
            placeholder="Address Line 1"
            value={branchForm.address_line1}
            onChange={(e) => setBranchForm({...branchForm, address_line1: e.target.value})}
          />
          
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="City"
              value={branchForm.city}
              onChange={(e) => setBranchForm({...branchForm, city: e.target.value})}
            />
            <Input
              placeholder="State"
              value={branchForm.state}
              onChange={(e) => setBranchForm({...branchForm, state: e.target.value})}
            />
            <Input
              placeholder="State Code"
              value={branchForm.state_code}
              onChange={(e) => setBranchForm({...branchForm, state_code: e.target.value})}
            />
          </div>
          
          <Input
            placeholder="GSTIN"
            value={branchForm.gstin}
            onChange={(e) => setBranchForm({...branchForm, gstin: e.target.value})}
          />
          
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setShowBranchModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch}>
              Create Branch
            </Button>
          </div>
        </div>
      </Modal>

      {/* TDS Deductee Modal */}
      <Modal
        isOpen={showTDSModal}
        onClose={() => setShowTDSModal(false)}
        title="Add TDS Deductee"
      >
        <div className="space-y-4">
          <Input
            placeholder="Deductee Name"
            value={tdsForm.deductee_name}
            onChange={(e) => setTdsForm({...tdsForm, deductee_name: e.target.value})}
          />
          
          <Select
            value={tdsForm.deductee_type}
            onChange={(value) => setTdsForm({...tdsForm, deductee_type: value})}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'company', label: 'Company' },
              { value: 'partnership', label: 'Partnership' },
              { value: 'trust', label: 'Trust' },
              { value: 'non_resident', label: 'Non-Resident' }
            ]}
          />
          
          <Input
            placeholder="PAN Number"
            value={tdsForm.pan_number}
            onChange={(e) => setTdsForm({...tdsForm, pan_number: e.target.value})}
          />
          
          <Input
            placeholder="Address"
            value={tdsForm.address}
            onChange={(e) => setTdsForm({...tdsForm, address: e.target.value})}
          />
          
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setShowTDSModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTDSDeductee}>
              Create Deductee
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MultiCompanyManager;