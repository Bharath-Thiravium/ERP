import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { DataTable } from '../../../../../components/ui/DataTable';
import { inventoryApi } from '../../utils/inventoryApi';
import type { AgingAnalysisItem } from '../../types/inventoryTypes';
import toast from 'react-hot-toast';

export const AgingAnalysis: React.FC = () => {
  const [agingData, setAgingData] = useState<AgingAnalysisItem[]>([]);
  const [agingSummary, setAgingSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse] = useState<string>('');

  useEffect(() => {
    loadAgingAnalysis();
  }, [selectedWarehouse]);

  const loadAgingAnalysis = async () => {
    try {
      setLoading(true);
      const params = selectedWarehouse ? { warehouse: selectedWarehouse } : {};
      const response = await inventoryApi.getAgingAnalysisReport(params);
      
      setAgingData(response.aging_data);
      setAgingSummary(response.aging_summary);
    } catch (error: any) {
      toast.error('Failed to load aging analysis');
    } finally {
      setLoading(false);
    }
  };

  const getAgingColor = (category: string) => {
    switch (category) {
      case 'Fresh (0-30 days)': return 'text-green-600 bg-green-100';
      case 'Good (31-60 days)': return 'text-blue-600 bg-blue-100';
      case 'Aging (61-90 days)': return 'text-yellow-600 bg-yellow-100';
      case 'Slow Moving (91-180 days)': return 'text-orange-600 bg-orange-100';
      case 'Very Slow (181-365 days)': return 'text-red-600 bg-red-100';
      case 'Dead Stock (365+ days)': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const columns = [
    {
      key: 'product_name',
      header: 'Product',
      render: (item: AgingAnalysisItem) => (
        <div>
          <div className="font-medium">{item.product_name}</div>
          <div className="text-sm text-gray-500">{item.product_code}</div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: AgingAnalysisItem) => item.category
    },
    {
      key: 'current_stock',
      header: 'Stock',
      render: (item: AgingAnalysisItem) => (
        <div className="text-right">
          <div className="font-medium">{item.current_stock.toLocaleString()}</div>
          <div className="text-sm text-gray-500">₹{item.stock_value.toLocaleString()}</div>
        </div>
      )
    },
    {
      key: 'days_old',
      header: 'Age',
      render: (item: AgingAnalysisItem) => (
        <div className="text-center">
          <div className="font-medium">{item.days_old} days</div>
          <div className="text-sm text-gray-500">
            {new Date(item.last_movement_date).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: 'aging_category',
      header: 'Category',
      render: (item: AgingAnalysisItem) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgingColor(item.aging_category)}`}>
          {item.aging_category}
        </span>
      )
    },
    {
      key: 'turnover_rate',
      header: 'Turnover',
      render: (item: AgingAnalysisItem) => (
        <div className="text-center">
          <div className="font-medium">{item.turnover_rate.toFixed(2)}x</div>
          {item.is_dead_stock && (
            <div className="text-xs text-red-600 font-medium">Dead Stock</div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Aging Analysis</h2>
          <p className="text-gray-600 dark:text-gray-400">Analyze inventory age and identify slow-moving stock</p>
        </div>
        <Button onClick={loadAgingAnalysis} disabled={loading}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(agingSummary).map(([category, data]: [string, any]) => (
          <Card key={category} className="p-4">
            <div className="text-center">
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mb-2 ${getAgingColor(category)}`}>
                {category.split(' ')[0]}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.count}</div>
              <div className="text-sm text-gray-500">₹{(data.value / 1000).toFixed(0)}K</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Aging Chart Placeholder */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Aging Distribution</h3>
        </div>
        <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Aging chart visualization would go here</p>
          </div>
        </div>
      </Card>

      {/* Detailed Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Detailed Aging Analysis</h3>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-600">
              {agingData.filter(item => item.is_dead_stock).length} dead stock items
            </span>
          </div>
        </div>
        
        <DataTable
          data={agingData}
          columns={columns}
          loading={loading}
          emptyMessage="No aging data available"
        />
      </Card>
    </div>
  );
};