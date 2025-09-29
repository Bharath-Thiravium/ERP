import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02, y: -5 }}
    className="group"
  >
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
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full animate-pulse" />
        <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white rounded-full animate-pulse delay-1000" />
      </div>
    </Card>
  </motion.div>
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-lg border ${getPriorityColor(priority)} hover:shadow-md transition-all duration-200`}
    >
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
    </motion.div>
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data - replace with actual API call
      setAnalyticsData({
        turnoverRate: 4.2,
        stockAccuracy: 96.8,
        carryingCost: 12.5,
        fillRate: 98.2,
        deadStock: 2.1,
        reorderEfficiency: 89.3
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const aiInsights = [
    {
      title: "Demand Spike Predicted",
      insight: "AI models predict 35% increase in demand for Electronics category next month based on seasonal patterns and market trends.",
      confidence: 87,
      action: "Increase stock levels by 25% for top 10 electronics products",
      priority: "high" as const,
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      title: "Slow Moving Inventory",
      insight: "15 products haven't moved in 90+ days, tying up ₹2.3L in capital. Consider promotional strategies or liquidation.",
      confidence: 94,
      action: "Create clearance campaign for slow-moving items",
      priority: "medium" as const,
      icon: <Clock className="w-4 h-4" />
    },
    {
      title: "Optimal Reorder Point",
      insight: "Product SKU-001 reorder point can be optimized from 100 to 75 units, reducing carrying costs by 12%.",
      confidence: 91,
      action: "Update reorder points for 23 similar products",
      priority: "low" as const,
      icon: <Target className="w-4 h-4" />
    },
    {
      title: "Supplier Performance Alert",
      insight: "Supplier ABC Corp has 15% delivery delays this month. Consider backup suppliers for critical items.",
      confidence: 89,
      action: "Review supplier contracts and diversify supply chain",
      priority: "critical" as const,
      icon: <AlertTriangle className="w-4 h-4" />
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
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
      </motion.div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Inventory Turnover"
          value={`${analyticsData?.turnoverRate}x`}
          change={12}
          trend="up"
          icon={<RefreshCw className="w-6 h-6" />}
          color="from-blue-500 to-blue-600"
          description="Times inventory sold per year"
        />
        
        <MetricCard
          title="Stock Accuracy"
          value={`${analyticsData?.stockAccuracy}%`}
          change={2.1}
          trend="up"
          icon={<CheckCircle className="w-6 h-6" />}
          color="from-green-500 to-green-600"
          description="Physical vs system accuracy"
        />
        
        <MetricCard
          title="Carrying Cost"
          value={`${analyticsData?.carryingCost}%`}
          change={-1.8}
          trend="down"
          icon={<DollarSign className="w-6 h-6" />}
          color="from-purple-500 to-purple-600"
          description="Cost of holding inventory"
        />
        
        <MetricCard
          title="Fill Rate"
          value={`${analyticsData?.fillRate}%`}
          change={0.5}
          trend="up"
          icon={<Target className="w-6 h-6" />}
          color="from-orange-500 to-orange-600"
          description="Orders fulfilled from stock"
        />
        
        <MetricCard
          title="Dead Stock"
          value={`${analyticsData?.deadStock}%`}
          change={-0.3}
          trend="down"
          icon={<Clock className="w-6 h-6" />}
          color="from-red-500 to-red-600"
          description="Non-moving inventory"
        />
        
        <MetricCard
          title="Reorder Efficiency"
          value={`${analyticsData?.reorderEfficiency}%`}
          change={5.2}
          trend="up"
          icon={<Zap className="w-6 h-6" />}
          color="from-teal-500 to-teal-600"
          description="Optimal reorder timing"
        />
      </div>

      {/* AI Insights Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI Intelligence Center</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">94%</div>
              <div className="text-purple-200 text-sm">Prediction Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">12</div>
              <div className="text-purple-200 text-sm">Active Models</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₹2.8L</div>
              <div className="text-purple-200 text-sm">Cost Savings</div>
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
              Next 30 days demand prediction with 94% accuracy using advanced ML models
            </p>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <h3 className="font-semibold mb-2 flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Smart Optimization</span>
            </h3>
            <p className="text-purple-100 text-sm">
              Automated reorder points and safety stock calculations based on real-time data
            </p>
          </div>
        </div>
      </motion.div>

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