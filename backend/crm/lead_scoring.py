from django.utils import timezone
from datetime import datetime, timedelta
from .models import Lead, LeadScore, ScoringCriteria, Activity
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
        total = lead_score.calculate_total_score()
        
        # Generate recommended actions
        actions = self.generate_recommendations(lead, lead_score)
        lead_score.recommended_actions = actions
        
        # Store score factors for transparency
        lead_score.score_factors = {
            'behavioral': {
                'score': behavioral,
                'factors': ['Website visits', 'Email engagement', 'Activity frequency']
            },
            'demographic': {
                'score': demographic,
                'factors': ['Company fit', 'Job title', 'Industry match']
            },
            'engagement': {
                'score': engagement,
                'factors': ['Response rate', 'Meeting acceptance', 'Interaction quality']
            },
            'predictive': {
                'score': predictive,
                'factors': ['Historical patterns', 'Lead source quality', 'Status progression']
            }
        }
        
        lead_score.save()
        return lead_score
    
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