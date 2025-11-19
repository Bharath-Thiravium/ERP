"""
Inventory aging analysis system
"""
from django.db.models import Q, Sum, F, Case, When, DecimalField
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Product, StockMovement, StockLevel
import logging

logger = logging.getLogger(__name__)

class InventoryAgingAnalyzer:
    """Analyze inventory aging and dead stock"""
    
    @staticmethod
    def get_aging_analysis(company, warehouse_id=None):
        """Get comprehensive aging analysis"""
        try:
            # Base queryset
            products = Product.objects.filter(company=company, is_active=True)
            
            if warehouse_id:
                products = products.filter(stock_levels__warehouse_id=warehouse_id)
            
            aging_data = []
            current_date = timezone.now().date()
            
            for product in products:
                # Get last movement date
                last_movement = StockMovement.objects.filter(
                    product=product,
                    movement_type__in=['in', 'purchase', 'production']
                ).order_by('-created_at').first()
                
                if not last_movement:
                    continue
                
                # Calculate aging
                last_movement_date = last_movement.created_at.date()
                days_old = (current_date - last_movement_date).days
                
                # Categorize aging
                aging_category = InventoryAgingAnalyzer._categorize_aging(days_old)
                
                # Get current stock and value
                current_stock = product.current_stock
                stock_value = product.stock_value
                
                if current_stock > 0:
                    aging_data.append({
                        'product_id': product.id,
                        'product_name': product.name,
                        'product_code': product.product_code,
                        'category': product.category.name,
                        'current_stock': float(current_stock),
                        'stock_value': float(stock_value),
                        'last_movement_date': last_movement_date,
                        'days_old': days_old,
                        'aging_category': aging_category,
                        'is_dead_stock': days_old > 365,
                        'turnover_rate': InventoryAgingAnalyzer._calculate_turnover_rate(product)
                    })
            
            return aging_data
            
        except Exception as e:
            logger.error(f"Error in aging analysis: {e}")
            return []
    
    @staticmethod
    def _categorize_aging(days_old):
        """Categorize inventory by age"""
        if days_old <= 30:
            return 'Fresh (0-30 days)'
        elif days_old <= 60:
            return 'Good (31-60 days)'
        elif days_old <= 90:
            return 'Aging (61-90 days)'
        elif days_old <= 180:
            return 'Slow Moving (91-180 days)'
        elif days_old <= 365:
            return 'Very Slow (181-365 days)'
        else:
            return 'Dead Stock (365+ days)'
    
    @staticmethod
    def _calculate_turnover_rate(product):
        """Calculate inventory turnover rate"""
        try:
            # Get movements in last 12 months
            one_year_ago = timezone.now() - timedelta(days=365)
            
            outbound_movements = StockMovement.objects.filter(
                product=product,
                movement_type__in=['out', 'sale'],
                created_at__gte=one_year_ago
            ).aggregate(total=Sum('quantity'))['total'] or 0
            
            avg_inventory = product.current_stock
            
            if avg_inventory > 0:
                return float(outbound_movements / avg_inventory)
            return 0
            
        except Exception:
            return 0
    
    @staticmethod
    def get_dead_stock_report(company, days_threshold=365):
        """Get dead stock report"""
        aging_data = InventoryAgingAnalyzer.get_aging_analysis(company)
        
        dead_stock = [
            item for item in aging_data 
            if item['days_old'] > days_threshold
        ]
        
        total_dead_stock_value = sum(item['stock_value'] for item in dead_stock)
        
        return {
            'dead_stock_items': dead_stock,
            'total_items': len(dead_stock),
            'total_value': total_dead_stock_value,
            'generated_at': timezone.now().isoformat()
        }
    
    @staticmethod
    def get_slow_moving_report(company, turnover_threshold=2.0):
        """Get slow moving inventory report"""
        aging_data = InventoryAgingAnalyzer.get_aging_analysis(company)
        
        slow_moving = [
            item for item in aging_data 
            if item['turnover_rate'] < turnover_threshold and not item['is_dead_stock']
        ]
        
        return {
            'slow_moving_items': slow_moving,
            'total_items': len(slow_moving),
            'total_value': sum(item['stock_value'] for item in slow_moving),
            'generated_at': timezone.now().isoformat()
        }