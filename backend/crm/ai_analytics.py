"""
Phase 3: AI Analytics and Advanced Insights
Extends existing CRM with AI-powered analytics
"""

from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import json

from .models import (
    Lead, Contact, Account, Opportunity, Activity, Deal, 
    CustomerInteraction, Ticket, LeadScore, CustomerHealthScore
)
from .lead_scoring import AIAnalyticsEngine


class AdvancedAnalytics:
    """Advanced analytics engine for CRM insights"""
    
    def __init__(self, company):
        self.company = company
        self.ai_engine = AIAnalyticsEngine(company)
    
    def get_lead_intelligence_dashboard(self):
        """Get AI-powered lead intelligence dashboard data"""
        
        # Get recent leads with scores
        recent_leads = Lead.objects.filter(
            company=self.company,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).select_related('score')
        
        # Analyze lead quality trends
        lead_quality_trend = []
        for i in range(7):  # Last 7 days
            date = timezone.now().date() - timedelta(days=i)
            day_leads = recent_leads.filter(created_at__date=date)
            
            if day_leads.exists():
                avg_score = day_leads.aggregate(
                    avg_score=models.Avg('score__total_score')
                )['avg_score'] or 0
            else:
                avg_score = 0
            
            lead_quality_trend.append({
                'date': date.isoformat(),
                'lead_count': day_leads.count(),
                'avg_quality_score': round(avg_score, 1)
            })
        
        # Lead source performance
        source_performance = {}
        for source_choice in Lead.SOURCE_CHOICES:
            source = source_choice[0]
            source_leads = recent_leads.filter(source=source)
            
            if source_leads.exists():
                avg_score = source_leads.aggregate(
                    avg_score=models.Avg('score__total_score')
                )['avg_score'] or 0
                
                conversion_rate = source_leads.filter(
                    status__in=['won', 'qualified']
                ).count() / source_leads.count() * 100
            else:
                avg_score = 0
                conversion_rate = 0
            
            source_performance[source] = {
                'count': source_leads.count(),
                'avg_score': round(avg_score, 1),
                'conversion_rate': round(conversion_rate, 1)
            }
        
        # Top performing leads
        top_leads = recent_leads.filter(
            score__total_score__gte=75
        ).order_by('-score__total_score')[:10]
        
        # AI recommendations summary
        all_recommendations = []
        for lead in recent_leads:
            if hasattr(lead, 'score') and lead.score.recommended_actions:
                all_recommendations.extend(lead.score.recommended_actions)
        
        # Group recommendations by action type
        recommendation_summary = {}
        for rec in all_recommendations:
            action = rec.get('action', 'unknown')
            if action not in recommendation_summary:
                recommendation_summary[action] = 0
            recommendation_summary[action] += 1
        
        return {
            'lead_quality_trend': lead_quality_trend,
            'source_performance': source_performance,
            'top_leads': [
                {
                    'id': lead.id,
                    'name': f"{lead.first_name} {lead.last_name}",
                    'company': lead.company_name,
                    'score': lead.score.total_score if hasattr(lead, 'score') else 0,
                    'grade': lead.score.grade if hasattr(lead, 'score') else 'cold'
                }
                for lead in top_leads
            ],
            'recommendation_summary': recommendation_summary,
            'total_leads': recent_leads.count(),
            'high_quality_leads': recent_leads.filter(score__total_score__gte=75).count()
        }
    
    def get_sales_forecast_dashboard(self, period_days=90):
        """Get AI-powered sales forecast dashboard"""
        
        forecast = self.ai_engine.generate_sales_forecast(period_days)
        
        # Historical performance for comparison
        historical_end = timezone.now().date() - timedelta(days=period_days)
        historical_start = historical_end - timedelta(days=period_days)
        
        historical_deals = Deal.objects.filter(
            company=self.company,
            status='won',
            actual_close_date__gte=historical_start,
            actual_close_date__lte=historical_end
        )
        
        historical_revenue = historical_deals.aggregate(
            total=models.Sum('value')
        )['total'] or Decimal('0')
        
        # Pipeline health metrics
        current_pipeline = Deal.objects.filter(
            company=self.company,
            status='open'
        )
        
        pipeline_health = {
            'total_deals': current_pipeline.count(),
            'total_value': current_pipeline.aggregate(
                total=models.Sum('value')
            )['total'] or Decimal('0'),
            'avg_deal_size': current_pipeline.aggregate(
                avg=models.Avg('value')
            )['avg'] or Decimal('0'),
            'deals_closing_soon': current_pipeline.filter(
                expected_close_date__lte=timezone.now().date() + timedelta(days=30)
            ).count()
        }
        
        return {
            'forecast': forecast,
            'historical_comparison': {
                'previous_period_revenue': float(historical_revenue),
                'forecast_vs_historical': float(
                    (forecast['ai_adjusted_forecast'] / historical_revenue * 100) 
                    if historical_revenue > 0 else 0
                )
            },
            'pipeline_health': {
                'total_deals': pipeline_health['total_deals'],
                'total_value': float(pipeline_health['total_value']),
                'avg_deal_size': float(pipeline_health['avg_deal_size']),
                'deals_closing_soon': pipeline_health['deals_closing_soon']
            }
        }
    
    def get_customer_health_insights(self):
        """Get customer health and churn risk insights"""
        
        accounts = Account.objects.filter(
            company=self.company,
            account_type='customer',
            is_active=True
        )
        
        health_distribution = {
            'excellent': 0,
            'good': 0,
            'average': 0,
            'poor': 0,
            'critical': 0
        }
        
        churn_risks = []
        
        for account in accounts:
            # Get or calculate health score
            if hasattr(account, 'health_score'):
                health_status = account.health_score.health_status
                health_distribution[health_status] += 1
            else:
                health_distribution['average'] += 1
            
            # Calculate churn risk
            churn_risk, risk_factors = self.ai_engine.predict_churn_risk(account)
            
            if churn_risk > 0.6:  # High risk threshold
                churn_risks.append({
                    'account_id': account.id,
                    'account_name': account.name,
                    'churn_risk': round(churn_risk * 100, 1),
                    'risk_factors': risk_factors,
                    'annual_revenue': float(account.annual_revenue or 0)
                })
        
        # Sort by risk and revenue impact
        churn_risks.sort(key=lambda x: x['churn_risk'] * x['annual_revenue'], reverse=True)
        
        return {
            'health_distribution': health_distribution,
            'total_customers': accounts.count(),
            'high_risk_customers': len(churn_risks),
            'churn_risks': churn_risks[:10],  # Top 10 at-risk customers
            'revenue_at_risk': sum(risk['annual_revenue'] for risk in churn_risks)
        }
    
    def get_conversation_intelligence_insights(self):
        """Get conversation intelligence insights from activities"""
        
        # Get recent activities with descriptions/outcomes
        recent_activities = Activity.objects.filter(
            company=self.company,
            created_at__gte=timezone.now() - timedelta(days=30),
            activity_type__in=['call', 'meeting', 'demo']
        ).exclude(
            description='',
            outcome=''
        )
        
        sentiment_analysis = {
            'positive': 0,
            'neutral': 0,
            'negative': 0
        }
        
        buying_signals_detected = 0
        risk_indicators_detected = 0
        conversation_insights = []
        
        for activity in recent_activities[:50]:  # Analyze last 50 conversations
            analysis = self.ai_engine.analyze_conversation_intelligence(activity)
            
            if analysis:
                # Update sentiment counts
                sentiment_analysis[analysis['sentiment']] += 1
                
                # Count signals and risks
                if analysis['buying_signals']:
                    buying_signals_detected += 1
                
                if analysis['risk_indicators']:
                    risk_indicators_detected += 1
                
                # Store detailed insights for high-impact conversations
                if (analysis['buying_signals'] or analysis['risk_indicators'] or 
                    analysis['sentiment'] in ['very_positive', 'negative']):
                    
                    conversation_insights.append({
                        'activity_id': activity.id,
                        'subject': activity.subject,
                        'date': activity.due_date.date().isoformat(),
                        'sentiment': analysis['sentiment'],
                        'buying_signals': analysis['buying_signals'],
                        'risk_indicators': analysis['risk_indicators'],
                        'suggested_actions': analysis['next_action_suggestions']
                    })
        
        return {
            'sentiment_distribution': sentiment_analysis,
            'total_conversations_analyzed': recent_activities.count(),
            'buying_signals_detected': buying_signals_detected,
            'risk_indicators_detected': risk_indicators_detected,
            'conversation_insights': conversation_insights[:10]  # Top 10 insights
        }
    
    def get_performance_analytics(self):
        """Get team and individual performance analytics"""
        
        from django.contrib.auth.models import User
        
        # Get all CRM users for this company
        company_users = User.objects.filter(
            companyserviceuser__company=self.company,
            companyserviceuser__service__name='CRM'
        )
        
        user_performance = []
        
        for user in company_users:
            # Lead conversion metrics
            user_leads = Lead.objects.filter(
                company=self.company,
                assigned_to=user,
                created_at__gte=timezone.now() - timedelta(days=30)
            )
            
            converted_leads = user_leads.filter(status__in=['won', 'qualified']).count()
            conversion_rate = (converted_leads / user_leads.count() * 100) if user_leads.count() > 0 else 0
            
            # Deal metrics
            user_deals = Deal.objects.filter(
                company=self.company,
                owner=user,
                created_at__gte=timezone.now() - timedelta(days=30)
            )
            
            won_deals = user_deals.filter(status='won')
            total_revenue = won_deals.aggregate(
                total=models.Sum('value')
            )['total'] or Decimal('0')
            
            # Activity metrics
            user_activities = Activity.objects.filter(
                company=self.company,
                assigned_to=user,
                created_at__gte=timezone.now() - timedelta(days=30)
            )
            
            completed_activities = user_activities.filter(status='completed').count()
            activity_completion_rate = (
                completed_activities / user_activities.count() * 100
            ) if user_activities.count() > 0 else 0
            
            user_performance.append({
                'user_id': user.id,
                'user_name': user.get_full_name() or user.username,
                'leads_assigned': user_leads.count(),
                'leads_converted': converted_leads,
                'conversion_rate': round(conversion_rate, 1),
                'deals_created': user_deals.count(),
                'deals_won': won_deals.count(),
                'revenue_generated': float(total_revenue),
                'activities_completed': completed_activities,
                'activity_completion_rate': round(activity_completion_rate, 1)
            })
        
        # Sort by revenue generated
        user_performance.sort(key=lambda x: x['revenue_generated'], reverse=True)
        
        # Team totals
        team_totals = {
            'total_leads': sum(p['leads_assigned'] for p in user_performance),
            'total_converted': sum(p['leads_converted'] for p in user_performance),
            'total_revenue': sum(p['revenue_generated'] for p in user_performance),
            'avg_conversion_rate': sum(p['conversion_rate'] for p in user_performance) / len(user_performance) if user_performance else 0
        }
        
        return {
            'user_performance': user_performance,
            'team_totals': team_totals,
            'top_performer': user_performance[0] if user_performance else None
        }


class SmartInsightsGenerator:
    """Generate smart insights and recommendations"""
    
    def __init__(self, company):
        self.company = company
        self.analytics = AdvancedAnalytics(company)
    
    def generate_daily_insights(self):
        """Generate daily AI insights for the company"""
        
        insights = []
        
        # Lead quality insight
        lead_data = self.analytics.get_lead_intelligence_dashboard()
        if lead_data['high_quality_leads'] > 0:
            insights.append({
                'type': 'opportunity',
                'title': f"{lead_data['high_quality_leads']} High-Quality Leads Detected",
                'description': f"You have {lead_data['high_quality_leads']} leads with scores above 75. These leads have high conversion potential.",
                'action': 'Review and prioritize immediate contact with these leads',
                'priority': 'high'
            })
        
        # Churn risk insight
        health_data = self.analytics.get_customer_health_insights()
        if health_data['high_risk_customers'] > 0:
            insights.append({
                'type': 'risk',
                'title': f"{health_data['high_risk_customers']} Customers at Churn Risk",
                'description': f"${health_data['revenue_at_risk']:,.0f} in annual revenue is at risk from potential churn.",
                'action': 'Implement retention strategies for at-risk customers',
                'priority': 'critical'
            })
        
        # Sales forecast insight
        forecast_data = self.analytics.get_sales_forecast_dashboard()
        forecast_change = forecast_data['historical_comparison']['forecast_vs_historical']
        
        if forecast_change > 110:
            insights.append({
                'type': 'opportunity',
                'title': 'Strong Sales Forecast Growth',
                'description': f"AI forecast shows {forecast_change:.1f}% growth compared to previous period.",
                'action': 'Prepare resources for increased sales volume',
                'priority': 'medium'
            })
        elif forecast_change < 90:
            insights.append({
                'type': 'risk',
                'title': 'Sales Forecast Below Target',
                'description': f"AI forecast shows {forecast_change:.1f}% of previous period performance.",
                'action': 'Review pipeline and accelerate deal closure',
                'priority': 'high'
            })
        
        # Conversation intelligence insight
        conv_data = self.analytics.get_conversation_intelligence_insights()
        if conv_data['buying_signals_detected'] > 0:
            insights.append({
                'type': 'opportunity',
                'title': f"{conv_data['buying_signals_detected']} Buying Signals Detected",
                'description': "AI detected strong buying signals in recent conversations.",
                'action': 'Follow up immediately on conversations with buying signals',
                'priority': 'high'
            })
        
        return insights
    
    def generate_weekly_report(self):
        """Generate comprehensive weekly AI report"""
        
        # Get all analytics data
        lead_intelligence = self.analytics.get_lead_intelligence_dashboard()
        sales_forecast = self.analytics.get_sales_forecast_dashboard()
        customer_health = self.analytics.get_customer_health_insights()
        conversation_intel = self.analytics.get_conversation_intelligence_insights()
        performance = self.analytics.get_performance_analytics()
        
        # Generate executive summary
        executive_summary = {
            'total_leads': lead_intelligence['total_leads'],
            'high_quality_leads': lead_intelligence['high_quality_leads'],
            'forecast_revenue': float(sales_forecast['forecast']['ai_adjusted_forecast']),
            'customers_at_risk': customer_health['high_risk_customers'],
            'revenue_at_risk': customer_health['revenue_at_risk'],
            'team_performance': performance['team_totals']
        }
        
        # Key recommendations
        recommendations = []
        
        if lead_intelligence['high_quality_leads'] > 0:
            recommendations.append({
                'category': 'Lead Management',
                'recommendation': f"Prioritize {lead_intelligence['high_quality_leads']} high-scoring leads for immediate contact",
                'impact': 'High conversion potential'
            })
        
        if customer_health['high_risk_customers'] > 0:
            recommendations.append({
                'category': 'Customer Retention',
                'recommendation': f"Implement retention program for {customer_health['high_risk_customers']} at-risk customers",
                'impact': f"Protect ${customer_health['revenue_at_risk']:,.0f} in annual revenue"
            })
        
        if conversation_intel['buying_signals_detected'] > 0:
            recommendations.append({
                'category': 'Sales Acceleration',
                'recommendation': f"Follow up on {conversation_intel['buying_signals_detected']} conversations with buying signals",
                'impact': 'Accelerate deal closure'
            })
        
        return {
            'period': 'weekly',
            'generated_at': timezone.now().isoformat(),
            'executive_summary': executive_summary,
            'detailed_analytics': {
                'lead_intelligence': lead_intelligence,
                'sales_forecast': sales_forecast,
                'customer_health': customer_health,
                'conversation_intelligence': conversation_intel,
                'performance_analytics': performance
            },
            'recommendations': recommendations,
            'insights': self.generate_daily_insights()
        }