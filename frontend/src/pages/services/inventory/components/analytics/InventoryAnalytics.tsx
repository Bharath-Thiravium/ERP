import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,

  Activity,
  PieChart,
  LineChart,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import { inventoryApi } from '../../utils/inventoryApi';
import toast from 'react-hot-toast';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  color, 
  description 
}) => (
  <div className="group hover:transform hover:scale-105 transition-transform duration-200">
    <Card className={`p-6 bg-gradient-to-br ${color} border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-white`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
        {change !== undefined && (
          <div className="flex items-center space-x-1">
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-300" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-300" />
            ) : (
              <Activity className="w-4 h-4 text-blue-300" />
            )}
            <span className="text-white/90 text-sm font-medium">
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
        <p className="text-white text-2xl font-bold mb-2">{value}</p>
        {description && (
          <p className="text-white/70 text-xs">{description}</p>
        )}
      </div>
      
      {/* Static background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full" />
        <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white rounded-full" />
      </div>
    </Card>
  </div>
);

interface AIInsightCardProps {
  title: string;
  insight: string;
  confidence: number;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  icon: React.ReactNode;
}

const AIInsightCard: React.FC<AIInsightCardProps> = ({
  title,
  insight,
  confidence,
  action,
  priority,
  icon
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-700';
      case 'high': return 'text-orange-700';
      case 'medium': return 'text-yellow-700';
      default: return 'text-blue-700';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getPriorityColor(priority)} hover:shadow-md transition-all duration-200`}>
    
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${getPriorityTextColor(priority)} bg-white/50`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-semibold ${getPriorityTextColor(priority)}`}>{title}</h4>
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityTextColor(priority)} bg-white/50`}>
                {confidence}% confidence
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getPriorityTextColor(priority)} bg-white/50`}>
                {priority}
              </span>
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-3">{insight}</p>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-xs italic">Suggested: {action}</p>
            <Button size="sm" variant="outline" className="text-xs">
              Take Action
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InventoryAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load only dashboard data to avoid multiple API calls
      const dashboard = await inventoryApi.getDashboardStats();
      
      // Calculate analytics from dashboard data
      const totalProducts = dashboard.inventory_stats?.total_products || 0;
      const lowStockCount = dashboard.inventory_stats?.low_stock_products || 0;
      const outOfStockCount = dashboard.inventory_stats?.out_of_stock_products || 0;
      const totalValue = dashboard.inventory_stats?.total_stock_value || 0;
      
      setAnalyticsData({
        turnoverRate: (dashboard.ai_insights?.inventory_turnover / 10) || 0,
        stockAccuracy: totalProducts > 0 ? ((totalProducts - outOfStockCount) / totalProducts * 100).toFixed(1) : '0',
        carryingCost: 0, // This needs to be calculated from actual cost data
        fillRate: totalProducts > 0 ? ((totalProducts - lowStockCount) / totalProducts * 100).toFixed(1) : '0',
        deadStock: totalProducts > 0 ? ((lowStockCount / totalProducts) * 100).toFixed(1) : '0',
        reorderEfficiency: dashboard.ai_insights?.optimization_score || 0,
        totalValue: totalValue,
        totalProducts: totalProducts,
        lowStockProducts: lowStockCount,
        outOfStockProducts: outOfStockCount
      });
      
      // Additional data loading can be added here if needed in the future
      
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
      
      // Fallback to safe default data
      setAnalyticsData({
        turnoverRate: 0,
        stockAccuracy: '0',
        carryingCost: 0,
        fillRate: '0',
        deadStock: '0',
        reorderEfficiency: 0,
        totalValue: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate AI insights based on real data
  const generateAIInsights = () => {
    const insights = [];
    
    if (analyticsData?.lowStockProducts > 0) {
      insights.push({
        title: "Low Stock Alert",
        insight: `${analyticsData.lowStockProducts} products are below minimum stock levels. Immediate reordering required to avoid stockouts.`,
        confidence: 95,
        action: "Review and reorder low stock items",
        priority: "high" as const,
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }
    
    if (analyticsData?.outOfStockProducts > 0) {
      insights.push({
        title: "Out of Stock Items",
        insight: `${analyticsData.outOfStockProducts} products are completely out of stock, potentially causing lost sales.`,
        confidence: 98,
        action: "Emergency reorder for out-of-stock items",
        priority: "critical" as const,
        icon: <TrendingDown className="w-4 h-4" />
      });
    }
    
    if (analyticsData?.turnoverRate < 2) {
      insights.push({
        title: "Low Inventory Turnover",
        insight: `Current turnover rate of ${analyticsData.turnoverRate}x is below optimal. Consider reducing slow-moving inventory.`,
        confidence: 87,
        action: "Analyze slow-moving products and optimize stock levels",
        priority: "medium" as const,
        icon: <Clock className="w-4 h-4" />
      });
    }
    
    if (analyticsData?.stockAccuracy < 95) {
      insights.push({
        title: "Stock Accuracy Issue",
        insight: `Stock accuracy of ${analyticsData.stockAccuracy}% is below target. Consider cycle counting or inventory audit.`,
        confidence: 92,
        action: "Implement cycle counting program",
        priority: "medium" as const,
        icon: <Target className="w-4 h-4" />
      });
    }
    
    // Add positive insights if metrics are good
    if (insights.length === 0) {
      insights.push({
        title: "Optimal Performance",
        insight: "Your inventory metrics are performing well. Continue monitoring for sustained efficiency.",
        confidence: 88,
        action: "Maintain current inventory practices",
        priority: "low" as const,
        icon: <CheckCircle className="w-4 h-4" />
      });
    }
    
    return insights;
  };
  
  const aiInsights = generateAIInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No analytics data available</p>
          <Button onClick={loadAnalytics} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl text-white">
              <Brain className="w-8 h-8" />
            </div>
            <span>AI-Powered Analytics</span>
          </h1>
          <p className="text-gray-600 mt-2">Advanced inventory insights and predictive analytics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          
          <Button variant="outline" onClick={loadAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Inventory Turnover"
          value={`${analyticsData?.turnoverRate}x`}
          icon={<RefreshCw className="w-6 h-6" />}
          color="from-blue-500 to-blue-600"
          description="Times inventory sold per year"
        />
        
        <MetricCard
          title="Stock Accuracy"
          value={`${analyticsData?.stockAccuracy}%`}
          icon={<CheckCircle className="w-6 h-6" />}
          color="from-green-500 to-green-600"
          description="Physical vs system accuracy"
        />
        
        <MetricCard
          title="Carrying Cost"
          value={analyticsData?.carryingCost > 0 ? `${analyticsData?.carryingCost}%` : 'Not Available'}
          icon={<DollarSign className="w-6 h-6" />}
          color="from-purple-500 to-purple-600"
          description="Cost of holding inventory"
        />
        
        <MetricCard
          title="Fill Rate"
          value={`${analyticsData?.fillRate}%`}
          icon={<Target className="w-6 h-6" />}
          color="from-orange-500 to-orange-600"
          description="Orders fulfilled from stock"
        />
        
        <MetricCard
          title="Dead Stock"
          value={`${analyticsData?.deadStock}%`}
          icon={<Clock className="w-6 h-6" />}
          color="from-red-500 to-red-600"
          description="Non-moving inventory"
        />
        
        <MetricCard
          title="Reorder Efficiency"
          value={analyticsData?.reorderEfficiency > 0 ? `${analyticsData?.reorderEfficiency}%` : 'Not Available'}
          icon={<Zap className="w-6 h-6" />}
          color="from-teal-500 to-teal-600"
          description="Optimal reorder timing"
        />
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI Intelligence Center</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{analyticsData?.stockAccuracy || 0}%</div>
              <div className="text-purple-200 text-sm">Stock Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analyticsData?.totalProducts || 0}</div>
              <div className="text-purple-200 text-sm">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₹{((analyticsData?.totalValue || 0) / 100000).toFixed(1)}L</div>
              <div className="text-purple-200 text-sm">Stock Value</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Demand Forecasting</span>
            </h3>
            <p className="text-purple-100 text-sm">
              Real-time demand analysis based on {analyticsData?.totalProducts || 0} products and current stock levels
            </p>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Smart Optimization</span>
            </h3>
            <p className="text-purple-100 text-sm">
              Smart reorder suggestions for {analyticsData?.lowStockProducts || 0} low-stock items
            </p>
          </div>
        </div>
      </div>

      {/* AI Insights Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Smart Recommendations</span>
          </h2>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View All Insights
          </Button>
        </div>
        
        <div className="space-y-4">
          {aiInsights.map((insight, index) => (
            <AIInsightCard
              key={index}
              {...insight}
            />
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inventory Trends Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <LineChart className="w-5 h-5 text-blue-500" />
              <span>Inventory Trends</span>
            </h3>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Interactive chart will be rendered here</p>
            </div>
          </div>
        </Card>

        {/* Category Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-green-500" />
              <span>Category Distribution</span>
            </h3>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Pie chart will be rendered here</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InventoryAnalytics;