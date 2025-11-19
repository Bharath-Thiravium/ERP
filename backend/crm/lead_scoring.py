from django.utils import timezone
from datetime import datetime, timedelta
from .models import Lead, LeadScore, ScoringCriteria, Activity
from django.db import models
import random
import math


class LeadScoringEngine:
    """AI-powered lead scoring engine"""
    
    def __init__(self, company):
        self.company = company
        
    def calculate_behavioral_score(self, lead):
        """Calculate behavioral score based on engagement activities"""
        score = 0
        
        # Get activities for this lead in last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        activities = Activity.objects.filter(
            lead=lead,
            created_at__gte=thirty_days_ago
        )
        
        # Score based on activity types and frequency
        activity_scores = {
            'email': 5,
            'call': 10,
            'meeting': 15,
            'demo': 20,
            'proposal': 25
        }
        
        for activity in activities:
            score += activity_scores.get(activity.activity_type, 3)
        
        # Base score for having an email (everyone should get some points)
        if lead.email:
            score += 10  # Base engagement score
        
        # Simulate website visits, email opens (in real implementation, this would come from tracking)
        # For demo purposes, we'll use deterministic values based on lead characteristics
        if lead.source in ['website', 'social_media']:
            score += 20  # High web engagement
        elif lead.source in ['referral', 'email_campaign']:
            score += 15   # Medium engagement
        elif lead.source in ['cold_call', 'trade_show']:
            score += 10   # Lower engagement
        else:
            score += 5    # Minimal engagement
        
        # Email engagement simulation
        if '@' in lead.email:
            domain = lead.email.split('@')[1]
            if domain in ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']:
                score += 5   # Personal email
            else:
                score += 12  # Business email (better)
        
        return min(100, score)
    
    def calculate_demographic_score(self, lead):
        """Calculate demographic score based on company fit"""
        score = 10  # Base score for having a lead
        
        # Company size indicators
        if lead.company_name:
            score += 15  # Has company
            
            # Simulate company size scoring (in real implementation, use external APIs)
            company_indicators = ['ltd', 'inc', 'corp', 'llc', 'pvt', 'limited', 'llp', 'plc']
            if any(indicator in lead.company_name.lower() for indicator in company_indicators):
                score += 10  # Established company
        else:
            # Even without company name, give some points
            score += 5
        
        # Job title scoring
        if lead.job_title:
            senior_titles = ['ceo', 'cto', 'cfo', 'director', 'manager', 'head', 'vp', 'president']
            decision_maker_titles = ['owner', 'founder', 'partner', 'principal']
            
            title_lower = lead.job_title.lower()
            if any(title in title_lower for title in decision_maker_titles):
                score += 25  # Decision maker
            elif any(title in title_lower for title in senior_titles):
                score += 20  # Senior role
            elif 'manager' in title_lower or 'lead' in title_lower:
                score += 15  # Management role
            else:
                score += 8   # Other roles
        else:
            score += 5  # Base score even without job title
        
        # Industry fit (simulate based on email domain or company name)
        if lead.email:
            domain = lead.email.split('@')[1]
            # Simulate industry scoring
            if any(tech in domain for tech in ['tech', 'software', 'digital', 'it']):
                score += 15  # Tech industry (good fit)
            elif any(biz in domain for biz in ['consulting', 'services', 'solutions']):
                score += 12  # Services industry
            else:
                score += 8   # Other industries
        
        # Location scoring (simulate based on phone or other indicators)
        if lead.phone:
            score += 8  # Has phone number
        
        return min(100, score)
    
    def calculate_engagement_score(self, lead):
        """Calculate engagement score based on interaction quality"""
        score = 5  # Base engagement score
        
        # Status-based scoring
        status_scores = {
            'new': 10,
            'contacted': 25,
            'qualified': 40,
            'proposal': 60,
            'negotiation': 75,
            'won': 90,
            'lost': 0
        }
        score += status_scores.get(lead.status, 10)
        
        # Priority-based engagement
        priority_scores = {
            'urgent': 20,
            'high': 15,
            'medium': 10,
            'low': 5
        }
        score += priority_scores.get(lead.priority, 5)
        
        # Meeting acceptance (simulate)
        meetings = Activity.objects.filter(
            lead=lead,
            activity_type='meeting',
            status='completed'
        ).count()
        score += min(25, meetings * 8)  # Up to 25 points for meetings
        
        # Email response rate (simulate)
        emails = Activity.objects.filter(
            lead=lead,
            activity_type='email'
        ).count()
        if emails > 0:
            # Simulate response rate
            response_rate = min(1.0, (meetings + 1) / (emails + 1))
            score += int(response_rate * 15)
        
        # Time since last contact
        if lead.last_contacted:
            days_since = (timezone.now() - lead.last_contacted).days
            if days_since <= 7:
                score += 15  # Recent contact
            elif days_since <= 30:
                score += 10  # Moderate recency
            else:
                score += 5   # Older contact
        else:
            # New lead, give some engagement points
            score += 8
        
        return min(100, score)
    
    def calculate_predictive_score(self, lead):
        """ML-based predictive scoring (simplified simulation)"""
        score = 0
        
        # Simulate ML model prediction based on historical patterns
        factors = []
        
        # Lead source quality
        source_quality = {
            'referral': 0.8,
            'website': 0.7,
            'email_campaign': 0.6,
            'social_media': 0.5,
            'cold_call': 0.4,
            'trade_show': 0.6,
            'advertisement': 0.5,
            'other': 0.3
        }
        factors.append(source_quality.get(lead.source, 0.3))
        
        # Priority influence
        priority_weight = {
            'urgent': 0.9,
            'high': 0.8,
            'medium': 0.6,
            'low': 0.4
        }
        factors.append(priority_weight.get(lead.priority, 0.5))
        
        # Status progression
        status_weight = {
            'won': 1.0,
            'negotiation': 0.9,
            'proposal': 0.8,
            'qualified': 0.7,
            'contacted': 0.5,
            'new': 0.3,
            'lost': 0.0
        }
        factors.append(status_weight.get(lead.status, 0.3))
        
        # Estimated value influence
        if lead.estimated_value:
            value_score = min(1.0, float(lead.estimated_value) / 100000)  # Normalize to 100k
            factors.append(value_score)
        else:
            factors.append(0.3)
        
        # Calculate weighted average
        avg_factor = sum(factors) / len(factors)
        
        # Add some randomness to simulate ML uncertainty
        noise = random.uniform(-0.1, 0.1)
        final_probability = max(0.0, min(1.0, avg_factor + noise))
        
        score = int(final_probability * 100)
        
        return score, final_probability
    
    def calculate_lead_score(self, lead):
        """Calculate complete lead score"""
        # Get or create lead score record
        lead_score, created = LeadScore.objects.get_or_create(
            lead=lead,
            defaults={
                'behavioral_score': 0,
                'demographic_score': 0,
                'engagement_score': 0,
                'predictive_score': 0,
                'total_score': 0,
                'conversion_probability': 0.0
            }
        )
        
        # Calculate individual scores
        behavioral = self.calculate_behavioral_score(lead)
        demographic = self.calculate_demographic_score(lead)
        engagement = self.calculate_engagement_score(lead)
        predictive, probability = self.calculate_predictive_score(lead)
        
        # Update scores
        lead_score.behavioral_score = behavioral
        lead_score.demographic_score = demographic
        lead_score.engagement_score = engagement
        lead_score.predictive_score = predictive
        lead_score.conversion_probability = probability
        
        # Calculate total score
        total_score = lead_score.calculate_total_score()
        
        # Generate AI recommendations
        lead_score.recommended_actions = self.generate_ai_recommendations(lead, lead_score)
        lead_score.score_factors = self.get_score_breakdown(behavioral, demographic, engagement, predictive)
        
        lead_score.save()
        return lead_score
    
    def generate_ai_recommendations(self, lead, lead_score):
        """Generate AI-powered recommendations based on lead score"""
        recommendations = []
        
        # High-value lead recommendations
        if lead_score.total_score >= 75:
            recommendations.append({
                'action': 'immediate_contact',
                'priority': 'high',
                'message': 'High-value lead - Contact immediately for best conversion chance'
            })
            if lead.status == 'new':
                recommendations.append({
                    'action': 'schedule_demo',
                    'priority': 'high', 
                    'message': 'Schedule product demo within 24 hours'
                })
        
        # Medium-value lead recommendations
        elif lead_score.total_score >= 50:
            recommendations.append({
                'action': 'nurture_sequence',
                'priority': 'medium',
                'message': 'Add to nurture email sequence for gradual engagement'
            })
            if lead_score.engagement_score < 40:
                recommendations.append({
                    'action': 'increase_touchpoints',
                    'priority': 'medium',
                    'message': 'Increase engagement through multiple touchpoints'
                })
        
        # Low-value lead recommendations
        else:
            recommendations.append({
                'action': 'automated_nurture',
                'priority': 'low',
                'message': 'Add to automated nurture campaign'
            })
            if lead_score.demographic_score < 30:
                recommendations.append({
                    'action': 'qualify_further',
                    'priority': 'low',
                    'message': 'Gather more demographic information to improve scoring'
                })
        
        # Behavioral-specific recommendations
        if lead_score.behavioral_score < 25:
            recommendations.append({
                'action': 'content_engagement',
                'priority': 'medium',
                'message': 'Send valuable content to increase engagement'
            })
        
        return recommendations
    
    def get_score_breakdown(self, behavioral, demographic, engagement, predictive):
        """Get detailed score factor breakdown"""
        return {
            'behavioral': {
                'score': behavioral,
                'factors': ['Website visits', 'Email engagement', 'Content downloads']
            },
            'demographic': {
                'score': demographic,
                'factors': ['Company size', 'Job title', 'Industry fit']
            },
            'engagement': {
                'score': engagement,
                'factors': ['Response rate', 'Meeting acceptance', 'Call engagement']
            },
            'predictive': {
                'score': predictive,
                'factors': ['Historical patterns', 'Similar lead outcomes', 'Market trends']
            }
        }


class AIAnalyticsEngine:
    """Advanced AI Analytics for CRM insights"""
    
    def __init__(self, company):
        self.company = company
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of text (emails, notes, etc.)"""
        # Simplified sentiment analysis (in production, use proper NLP)
        positive_words = ['great', 'excellent', 'good', 'interested', 'excited', 'love', 'perfect', 'amazing']
        negative_words = ['bad', 'terrible', 'hate', 'disappointed', 'frustrated', 'angry', 'poor', 'awful']
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 'positive', min(0.9, 0.5 + (positive_count - negative_count) * 0.1)
        elif negative_count > positive_count:
            return 'negative', max(0.1, 0.5 - (negative_count - positive_count) * 0.1)
        else:
            return 'neutral', 0.5
    
    def predict_churn_risk(self, account):
        """Predict customer churn risk using AI"""
        from .models import CustomerInteraction, Ticket
        
        risk_score = 0.0
        factors = []
        
        # Check recent interactions
        recent_interactions = CustomerInteraction.objects.filter(
            account=account,
            interaction_date__gte=timezone.now() - timezone.timedelta(days=30)
        ).count()
        
        if recent_interactions == 0:
            risk_score += 0.3
            factors.append('No recent interactions')
        elif recent_interactions < 3:
            risk_score += 0.2
            factors.append('Low interaction frequency')
        
        # Check support tickets
        open_tickets = Ticket.objects.filter(
            account=account,
            status__in=['open', 'in_progress']
        ).count()
        
        if open_tickets > 2:
            risk_score += 0.25
            factors.append('Multiple open support tickets')
        
        # Check satisfaction scores
        recent_tickets = Ticket.objects.filter(
            account=account,
            satisfaction_rating__isnull=False,
            created_at__gte=timezone.now() - timezone.timedelta(days=90)
        )
        
        if recent_tickets.exists():
            avg_satisfaction = recent_tickets.aggregate(
                avg_rating=models.Avg('satisfaction_rating')
            )['avg_rating']
            
            if avg_satisfaction < 3:
                risk_score += 0.3
                factors.append('Low satisfaction scores')
            elif avg_satisfaction < 4:
                risk_score += 0.15
                factors.append('Below average satisfaction')
        
        # Payment/contract factors (simplified)
        if hasattr(account, 'health_score'):
            health = account.health_score
            if health.financial_score < 40:
                risk_score += 0.2
                factors.append('Financial health concerns')
        
        return min(1.0, risk_score), factors
    
    def generate_sales_forecast(self, period_days=90):
        """Generate AI-powered sales forecast"""
        from .models import Deal, Opportunity
        from decimal import Decimal
        
        # Get historical data
        end_date = timezone.now().date()
        start_date = end_date - timezone.timedelta(days=period_days * 2)  # Look back 2x period for trends
        
        # Analyze historical win rates by stage
        historical_deals = Deal.objects.filter(
            company=self.company,
            created_at__date__gte=start_date,
            status__in=['won', 'lost']
        )
        
        # Calculate stage conversion rates
        stage_conversions = {}
        for deal in historical_deals:
            stage_name = deal.current_stage.name
            if stage_name not in stage_conversions:
                stage_conversions[stage_name] = {'total': 0, 'won': 0}
            
            stage_conversions[stage_name]['total'] += 1
            if deal.status == 'won':
                stage_conversions[stage_name]['won'] += 1
        
        # Get current pipeline
        current_pipeline = Deal.objects.filter(
            company=self.company,
            status='open',
            expected_close_date__lte=end_date + timezone.timedelta(days=period_days)
        )
        
        forecast = {
            'period_days': period_days,
            'total_pipeline_value': Decimal('0'),
            'weighted_forecast': Decimal('0'),
            'ai_adjusted_forecast': Decimal('0'),
            'confidence_level': 0.0,
            'deals_likely_to_close': 0,
            'stage_breakdown': {}
        }
        
        for deal in current_pipeline:
            stage_name = deal.current_stage.name
            deal_value = deal.value
            
            # Base probability from deal
            base_probability = deal.probability / 100.0
            
            # AI adjustment based on historical data
            if stage_name in stage_conversions and stage_conversions[stage_name]['total'] > 0:
                historical_rate = stage_conversions[stage_name]['won'] / stage_conversions[stage_name]['total']
                # Blend historical rate with current probability
                ai_probability = (base_probability * 0.6) + (historical_rate * 0.4)
            else:
                ai_probability = base_probability
            
            # Time-based adjustment (deals closer to close date are more likely)
            days_to_close = (deal.expected_close_date - end_date).days
            if days_to_close <= 30:
                time_multiplier = 1.1  # 10% boost for deals closing soon
            elif days_to_close <= 60:
                time_multiplier = 1.0
            else:
                time_multiplier = 0.9  # 10% reduction for distant deals
            
            ai_probability = min(1.0, ai_probability * time_multiplier)
            
            # Update forecast
            forecast['total_pipeline_value'] += deal_value
            forecast['weighted_forecast'] += deal_value * Decimal(str(base_probability))
            forecast['ai_adjusted_forecast'] += deal_value * Decimal(str(ai_probability))
            
            if ai_probability > 0.7:
                forecast['deals_likely_to_close'] += 1
            
            # Stage breakdown
            if stage_name not in forecast['stage_breakdown']:
                forecast['stage_breakdown'][stage_name] = {
                    'count': 0,
                    'value': Decimal('0'),
                    'weighted_value': Decimal('0')
                }
            
            forecast['stage_breakdown'][stage_name]['count'] += 1
            forecast['stage_breakdown'][stage_name]['value'] += deal_value
            forecast['stage_breakdown'][stage_name]['weighted_value'] += deal_value * Decimal(str(ai_probability))
        
        # Calculate confidence level
        if forecast['total_pipeline_value'] > 0:
            variance = abs(forecast['ai_adjusted_forecast'] - forecast['weighted_forecast']) / forecast['total_pipeline_value']
            forecast['confidence_level'] = max(0.5, 1.0 - variance)
        
        return forecast
    
    def analyze_conversation_intelligence(self, activity):
        """Analyze conversation for insights"""
        if not activity.description and not activity.outcome:
            return None
        
        text = f"{activity.description} {activity.outcome}".strip()
        if not text:
            return None
        
        # Sentiment analysis
        sentiment, confidence = self.analyze_sentiment(text)
        
        # Extract key topics (simplified keyword extraction)
        keywords = self.extract_keywords(text)
        
        # Detect buying signals
        buying_signals = self.detect_buying_signals(text)
        
        # Risk indicators
        risk_indicators = self.detect_risk_indicators(text)
        
        return {
            'sentiment': sentiment,
            'sentiment_confidence': confidence,
            'keywords': keywords,
            'buying_signals': buying_signals,
            'risk_indicators': risk_indicators,
            'next_action_suggestions': self.suggest_next_actions(sentiment, buying_signals, risk_indicators)
        }
    
    def extract_keywords(self, text):
        """Extract important keywords from conversation"""
        # Simplified keyword extraction
        important_terms = [
            'budget', 'price', 'cost', 'timeline', 'decision', 'approval',
            'competitor', 'alternative', 'feature', 'requirement', 'need',
            'meeting', 'demo', 'proposal', 'contract', 'sign', 'purchase'
        ]
        
        text_lower = text.lower()
        found_keywords = [term for term in important_terms if term in text_lower]
        return found_keywords
    
    def detect_buying_signals(self, text):
        """Detect positive buying signals in conversation"""
        buying_signals = [
            'ready to move forward', 'when can we start', 'send proposal',
            'budget approved', 'decision maker', 'timeline', 'implementation',
            'next steps', 'contract', 'pricing', 'demo was great'
        ]
        
        text_lower = text.lower()
        detected = [signal for signal in buying_signals if signal in text_lower]
        return detected
    
    def detect_risk_indicators(self, text):
        """Detect risk indicators in conversation"""
        risk_indicators = [
            'budget concerns', 'too expensive', 'need to think', 'other options',
            'competitor', 'not ready', 'delay', 'postpone', 'reconsider'
        ]
        
        text_lower = text.lower()
        detected = [risk for risk in risk_indicators if risk in text_lower]
        return detected
    
    def suggest_next_actions(self, sentiment, buying_signals, risk_indicators):
        """Suggest next actions based on conversation analysis"""
        suggestions = []
        
        if buying_signals:
            suggestions.append({
                'action': 'accelerate_process',
                'priority': 'high',
                'message': 'Strong buying signals detected - accelerate the sales process'
            })
        
        if risk_indicators:
            suggestions.append({
                'action': 'address_concerns',
                'priority': 'high',
                'message': 'Risk indicators found - schedule call to address concerns'
            })
        
        if sentiment == 'positive':
            suggestions.append({
                'action': 'maintain_momentum',
                'priority': 'medium',
                'message': 'Positive sentiment - maintain engagement momentum'
            })
        elif sentiment == 'negative':
            suggestions.append({
                'action': 'damage_control',
                'priority': 'high',
                'message': 'Negative sentiment detected - immediate follow-up required'
            })
        
        return suggestions
    
    def generate_recommendations(self, lead, lead_score):
        """Generate AI-powered recommendations"""
        actions = []
        
        # Score-based recommendations
        if lead_score.total_score >= 75:
            actions.append("🔥 Hot lead! Schedule demo immediately")
            actions.append("📞 Call within 24 hours")
            actions.append("📧 Send personalized proposal")
        elif lead_score.total_score >= 50:
            actions.append("📞 Schedule discovery call")
            actions.append("📧 Send relevant case studies")
            actions.append("📅 Follow up within 3 days")
        elif lead_score.total_score >= 25:
            actions.append("📧 Send nurture email sequence")
            actions.append("📚 Share educational content")
            actions.append("📅 Follow up weekly")
        else:
            actions.append("📧 Add to long-term nurture campaign")
            actions.append("📊 Monitor for engagement signals")
            actions.append("🔄 Re-evaluate in 30 days")
        
        # Specific factor-based recommendations
        if lead_score.behavioral_score < 30:
            actions.append("🌐 Increase digital touchpoints")
        
        if lead_score.engagement_score < 30:
            actions.append("💬 Try different communication channels")
        
        if lead_score.demographic_score > 70:
            actions.append("🎯 Perfect fit - prioritize immediately")
        
        return actions[:5]  # Limit to top 5 recommendations
    
    def bulk_score_leads(self, lead_ids=None):
        """Score multiple leads in bulk"""
        if lead_ids:
            leads = Lead.objects.filter(id__in=lead_ids, company=self.company)
        else:
            # Score ALL leads, not just specific statuses
            leads = Lead.objects.filter(company=self.company).exclude(status='lost')
        
        results = []
        for lead in leads:
            try:
                score = self.calculate_lead_score(lead)
                results.append({
                    'lead_id': lead.id,
                    'lead_name': f"{lead.first_name} {lead.last_name}",
                    'total_score': score.total_score,
                    'grade': score.grade,
                    'behavioral_score': score.behavioral_score,
                    'demographic_score': score.demographic_score,
                    'engagement_score': score.engagement_score,
                    'predictive_score': score.predictive_score,
                    'conversion_probability': score.conversion_probability,
                    'success': True
                })
            except Exception as e:
                results.append({
                    'lead_id': lead.id,
                    'error': str(e),
                    'success': False
                })
        
        return results