const fs = require('fs');
const path = require('path');

// List of files and their unused imports to remove
const filesToFix = [
  {
    file: 'frontend/src/pages/services/crm/CRMLayout.tsx',
    removeImports: ['Search', 'Filter', 'PlusCircle', 'HelpCircle']
  },
  {
    file: 'frontend/src/pages/services/crm/components/ActivityModal.tsx',
    removeImports: ['users', 'setUsers']
  },
  {
    file: 'frontend/src/pages/services/crm/components/CampaignViewModal.tsx',
    removeImports: ['Users']
  },
  {
    file: 'frontend/src/pages/services/crm/pages/AdvancedReporting.tsx',
    removeImports: ['Download']
  },
  {
    file: 'frontend/src/pages/services/crm/pages/LeadsPage.tsx',
    removeImports: ['response']
  },
  {
    file: 'frontend/src/pages/services/crm/pages/SalesPipeline.tsx',
    removeImports: ['setOwnerFilter']
  },
  {
    file: 'frontend/src/pages/services/hr/components/compliance/AdvancedReports.tsx',
    removeImports: ['Calendar']
  },
  {
    file: 'frontend/src/pages/services/hr/components/compliance/AutomationCenter.tsx',
    removeImports: ['Pause']
  },
  {
    file: 'frontend/src/pages/services/hr/components/compliance/ComplianceDashboard.tsx',
    removeImports: ['Shield', 'BarChart3']
  },
  {
    file: 'frontend/src/pages/services/hr/components/employees/EmployeeForm.tsx',
    removeImports: ['Plus']
  },
  {
    file: 'frontend/src/pages/services/hr/components/government/GovernmentPortalIntegration.tsx',
    removeImports: ['React', 'Calendar', 'Users', 'DollarSign']
  },
  {
    file: 'frontend/src/pages/services/hr/components/leave/LeaveApplications.tsx',
    removeImports: ['Calendar', 'Clock', 'Filter']
  },
  {
    file: 'frontend/src/pages/services/hr/components/leave/LeaveBalances.tsx',
    removeImports: ['TrendingUp']
  },
  {
    file: 'frontend/src/pages/services/hr/components/leave/LeaveSettings.tsx',
    removeImports: ['Save']
  },
  {
    file: 'frontend/src/pages/services/hr/components/recruitment/JobShareModal.tsx',
    removeImports: ['Copy', 'Zap', 'selectedTemplate', 'selectedContacts', 'setSelectedContacts']
  },
  {
    file: 'frontend/src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx',
    removeImports: ['Users', 'selectedJob']
  },
  {
    file: 'frontend/src/pages/services/hr/components/settings/HRSettings.tsx',
    removeImports: ['Clock', 'Calculator', 'Users', 'Calendar']
  },
  {
    file: 'frontend/src/pages/services/hr/components/statutory/GovernmentReturns.tsx',
    removeImports: ['CardHeader', 'CardTitle']
  },
  {
    file: 'frontend/src/pages/services/hr/components/statutory/StatutoryDashboard.tsx',
    removeImports: ['Users', 'BarChart3']
  },
  {
    file: 'frontend/src/pages/services/hr/components/system/SystemStatus.tsx',
    removeImports: ['Shield']
  }
];

function removeUnusedImports(filePath, importsToRemove) {
  try {
    const fullPath = path.join(__dirname, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    importsToRemove.forEach(importName => {
      // Remove from import statements
      content = content.replace(new RegExp(`,\\s*${importName}`, 'g'), '');
      content = content.replace(new RegExp(`${importName}\\s*,`, 'g'), '');
      content = content.replace(new RegExp(`\\{\\s*${importName}\\s*\\}`, 'g'), '{}');
      
      // Remove variable declarations
      content = content.replace(new RegExp(`\\s*const\\s+\\[${importName}[^\\]]*\\]\\s*=\\s*[^\\n]*\\n`, 'g'), '');
      content = content.replace(new RegExp(`\\s*const\\s+${importName}\\s*=\\s*[^\\n]*\\n`, 'g'), '');
    });
    
    // Clean up empty import statements
    content = content.replace(/import\s*\{\s*\}\s*from\s*[^;]+;?\n?/g, '');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed imports in ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix all files
filesToFix.forEach(({ file, removeImports }) => {
  removeUnusedImports(file, removeImports);
});

console.log('All import fixes completed!');