"""
AI Scoring System for Job Applications
Provides intelligent candidate evaluation and skill matching
"""
import re
from typing import Dict, List, Tuple
from decimal import Decimal


def calculate_ai_score(application) -> Tuple[Decimal, Decimal, str]:
    """
    Calculate AI score for job application using enhanced application data
    Returns: (ai_score, skill_match_percentage, screening_notes)
    """
    try:
        # Get job requirements
        job_posting = application.job_posting
        required_skills = job_posting.required_skills or []
        
        # Use comprehensive candidate data from enhanced application form
        candidate_skills = application.skills or []
        candidate_text = f"{application.cover_letter or ''} {application.current_position or ''} {application.current_company or ''}"
        
        # Calculate skill match using actual skills data
        skill_match = calculate_enhanced_skill_match(candidate_skills, required_skills, candidate_text)
        
        # Calculate experience score using structured data
        experience_score = calculate_enhanced_experience_score(
            application.total_experience, 
            application.relevant_experience,
            application.current_position or '',
            candidate_text
        )
        
        # Calculate education score using structured education data
        education_score = calculate_enhanced_education_score(
            application.education_details or [],
            application.certifications or [],
            candidate_text
        )
        
        # Calculate salary alignment score
        salary_score = calculate_salary_alignment(
            application.expected_salary,
            job_posting.min_salary,
            job_posting.max_salary
        )
        
        # Calculate overall AI score (weighted average)
        ai_score = (
            skill_match * 0.4 +      # 40% weight on skills
            experience_score * 0.3 +  # 30% weight on experience
            education_score * 0.2 +   # 20% weight on education
            salary_score * 0.1        # 10% weight on salary alignment
        )
        
        # Generate comprehensive screening notes
        screening_notes = generate_enhanced_screening_notes(
            skill_match, experience_score, education_score, salary_score,
            required_skills, candidate_skills, application
        )
        
        return (
            Decimal(str(round(ai_score, 2))),
            Decimal(str(round(skill_match, 2))),
            screening_notes
        )
        
    except Exception as exc:
        # Never invent a recruitment score when source data cannot be evaluated.
        return (
            Decimal('0.00'),
            Decimal('0.00'),
            f"Automated screening could not be completed: {type(exc).__name__}. Manual review required."
        )


def calculate_skill_match(candidate_text: str, required_skills: List[str]) -> float:
    """Calculate skill matching percentage"""
    if not required_skills:
        return 75.0  # Default score if no skills specified
    
    candidate_text_lower = candidate_text.lower()
    matched_skills = 0
    
    for skill in required_skills:
        if skill.lower() in candidate_text_lower:
            matched_skills += 1
    
    # Add some intelligence for related skills
    skill_synonyms = {
        'python': ['django', 'flask', 'fastapi'],
        'javascript': ['js', 'node', 'react', 'vue', 'angular'],
        'java': ['spring', 'hibernate'],
        'database': ['sql', 'mysql', 'postgresql', 'mongodb'],
        'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes']
    }
    
    for skill in required_skills:
        if skill.lower() not in candidate_text_lower:
            synonyms = skill_synonyms.get(skill.lower(), [])
            for synonym in synonyms:
                if synonym in candidate_text_lower:
                    matched_skills += 0.5  # Partial match for synonyms
                    break
    
    skill_match_percentage = (matched_skills / len(required_skills)) * 100
    return min(skill_match_percentage, 100.0)


def calculate_enhanced_experience_score(total_exp: float, relevant_exp: float, current_position: str, candidate_text: str) -> float:
    """Enhanced experience scoring using structured data"""
    score = 50.0  # Base score
    
    # Score based on total experience
    if total_exp:
        if total_exp >= 5:
            score += 30
        elif total_exp >= 3:
            score += 20
        elif total_exp >= 1:
            score += 10
    
    # Score based on relevant experience
    if relevant_exp:
        if relevant_exp >= 3:
            score += 20
        elif relevant_exp >= 1:
            score += 15
        elif relevant_exp >= 0.5:
            score += 10
    
    # Score based on current position
    if current_position:
        position_lower = current_position.lower()
        senior_keywords = ['senior', 'lead', 'manager', 'director', 'architect', 'principal']
        if any(keyword in position_lower for keyword in senior_keywords):
            score += 15
        elif any(keyword in position_lower for keyword in ['developer', 'engineer', 'analyst']):
            score += 10
    
    # Fallback to text analysis if structured data is missing
    if not total_exp and not relevant_exp:
        score = calculate_experience_score(candidate_text)
    
    return min(score, 100.0)


def calculate_enhanced_education_score(education_details: list, certifications: list, candidate_text: str) -> float:
    """Enhanced education scoring using structured data"""
    score = 50.0  # Base score
    
    # Score based on education details
    if education_details:
        for edu in education_details:
            degree = str(edu.get('degree', '') or edu.get('qualification', '')).lower()
            if 'phd' in degree or 'doctorate' in degree:
                score = max(score, 95)
            elif 'master' in degree or 'mba' in degree or 'mtech' in degree:
                score = max(score, 85)
            elif 'bachelor' in degree or 'btech' in degree or 'be ' in degree:
                score = max(score, 75)
            elif 'diploma' in degree:
                score = max(score, 65)
    
    # Score based on certifications
    if certifications:
        cert_bonus = min(len(certifications) * 5, 20)  # Max 20 points for certifications
        score += cert_bonus
    
    # Fallback to text analysis if structured data is missing
    if not education_details and not certifications:
        score = calculate_education_score(candidate_text)
    
    return min(score, 100.0)


def calculate_enhanced_skill_match(candidate_skills: list, required_skills: list, candidate_text: str) -> float:
    """Enhanced skill matching using structured skills data"""
    if not required_skills:
        return 80.0  # Default score if no skills specified
    
    if not candidate_skills:
        # Fallback to text-based matching if no structured skills
        return calculate_skill_match(candidate_text, required_skills)
    
    # Convert to lowercase for comparison
    candidate_skills_lower = [skill.lower().strip() for skill in candidate_skills]
    required_skills_lower = [skill.lower().strip() for skill in required_skills]
    
    matched_skills = 0
    partial_matches = 0
    
    # Direct skill matching
    for required_skill in required_skills_lower:
        if required_skill in candidate_skills_lower:
            matched_skills += 1
        else:
            # Check for partial matches
            for candidate_skill in candidate_skills_lower:
                if required_skill in candidate_skill or candidate_skill in required_skill:
                    partial_matches += 0.5
                    break
    
    # Calculate final score
    total_matches = matched_skills + partial_matches
    skill_match_percentage = (total_matches / len(required_skills)) * 100
    
    # Bonus for having more skills than required
    if len(candidate_skills) > len(required_skills):
        bonus = min((len(candidate_skills) - len(required_skills)) * 2, 10)
        skill_match_percentage += bonus
    
    return min(skill_match_percentage, 100.0)


def calculate_salary_alignment(expected_salary: float, min_salary: float, max_salary: float) -> float:
    """Calculate salary alignment score"""
    if not expected_salary or not min_salary or not max_salary:
        return 75.0  # Neutral score if salary info missing
    
    # Perfect alignment if within range
    if min_salary <= expected_salary <= max_salary:
        return 100.0
    
    # Calculate how far off the expectation is
    if expected_salary < min_salary:
        # Candidate expects less - good for company
        return 90.0
    else:
        # Candidate expects more - calculate penalty
        overage = (expected_salary - max_salary) / max_salary
        if overage <= 0.1:  # Within 10% over
            return 80.0
        elif overage <= 0.2:  # Within 20% over
            return 60.0
        else:  # More than 20% over
            return 40.0


def calculate_experience_score(candidate_text: str) -> float:
    """Calculate experience score based on text analysis"""
    candidate_text_lower = candidate_text.lower()
    
    # Look for experience indicators
    experience_keywords = [
        'years of experience', 'years experience', 'worked at', 'employed at',
        'senior', 'lead', 'manager', 'director', 'architect', 'expert',
        'developed', 'implemented', 'managed', 'led', 'designed'
    ]
    
    score = 50.0  # Base score
    
    for keyword in experience_keywords:
        if keyword in candidate_text_lower:
            score += 5
    
    # Look for specific experience numbers
    experience_numbers = re.findall(r'(\d+)\s*(?:years?|yrs?)', candidate_text_lower)
    if experience_numbers:
        max_years = max([int(num) for num in experience_numbers])
        score += min(max_years * 3, 30)  # Max 30 points for experience
    
    return min(score, 100.0)


def calculate_education_score(candidate_text: str) -> float:
    """Calculate education score based on text analysis"""
    candidate_text_lower = candidate_text.lower()
    
    education_keywords = {
        'phd': 100,
        'doctorate': 100,
        'masters': 85,
        'mba': 85,
        'bachelor': 70,
        'degree': 60,
        'diploma': 50,
        'certification': 40,
        'certified': 40
    }
    
    score = 50.0  # Base score
    
    for keyword, points in education_keywords.items():
        if keyword in candidate_text_lower:
            score = max(score, points)
            break
    
    return min(score, 100.0)


def generate_enhanced_screening_notes(skill_match: float, experience_score: float, 
                                    education_score: float, salary_score: float,
                                    required_skills: list, candidate_skills: list, application) -> str:
    """Generate comprehensive AI screening notes"""
    notes = []
    
    # Skill assessment with details
    if skill_match >= 90:
        notes.append("✅ Exceptional skill match - candidate has all required skills")
    elif skill_match >= 75:
        notes.append("✅ Strong skill alignment with job requirements")
    elif skill_match >= 60:
        notes.append("✅ Good skill match with most requirements")
    else:
        notes.append("⚠️ Limited skill match - training may be required")
    
    # Add skill details if available
    if candidate_skills and required_skills:
        matched = [skill for skill in candidate_skills if any(req.lower() in skill.lower() for req in required_skills)]
        if matched:
            notes.append(f"🔧 Key skills: {', '.join(matched[:3])}{'...' if len(matched) > 3 else ''}")
    
    # Experience assessment with details
    if experience_score >= 85:
        notes.append("✅ Excellent professional experience")
    elif experience_score >= 70:
        notes.append("✅ Strong relevant experience")
    elif experience_score >= 55:
        notes.append("✅ Adequate experience for the role")
    else:
        notes.append("⚠️ Limited experience - suitable for junior roles")
    
    # Add experience details
    if hasattr(application, 'total_experience') and application.total_experience:
        notes.append(f"📅 {application.total_experience} years total experience")
    
    # Education assessment
    if education_score >= 85:
        notes.append("🎓 Strong educational background")
    elif education_score >= 65:
        notes.append("🎓 Relevant educational qualifications")
    
    # Salary alignment
    if salary_score >= 90:
        notes.append("💰 Salary expectations well aligned")
    elif salary_score >= 70:
        notes.append("💰 Reasonable salary expectations")
    elif salary_score < 50:
        notes.append("⚠️ Salary expectations may be high")
    
    # Overall recommendation
    overall_score = (skill_match * 0.4 + experience_score * 0.3 + education_score * 0.2 + salary_score * 0.1)
    if overall_score >= 85:
        notes.append("🎯 HIGHLY RECOMMENDED: Excellent candidate for interview")
    elif overall_score >= 75:
        notes.append("👍 RECOMMENDED: Strong candidate for interview")
    elif overall_score >= 65:
        notes.append("✋ CONSIDER: Good potential candidate")
    else:
        notes.append("⚠️ REVIEW: May not meet all requirements")
    
    return " | ".join(notes)


def generate_screening_notes(skill_match: float, experience_score: float, 
                           education_score: float, required_skills: list) -> str:
    """Generate basic AI screening notes (fallback)"""
    notes = []
    
    if skill_match >= 80:
        notes.append("✅ Excellent skill match")
    elif skill_match >= 60:
        notes.append("✅ Good skill alignment")
    else:
        notes.append("⚠️ Limited skill match")
    
    if experience_score >= 80:
        notes.append("✅ Strong experience")
    elif experience_score >= 60:
        notes.append("✅ Adequate experience")
    else:
        notes.append("⚠️ Limited experience")
    
    overall_score = (skill_match + experience_score + education_score) / 3
    if overall_score >= 80:
        notes.append("🎯 RECOMMENDED for interview")
    elif overall_score >= 65:
        notes.append("👍 CONSIDER for interview")
    else:
        notes.append("⚠️ REVIEW required")
    
    return " | ".join(notes)


def update_application_ai_scores():
    """Update AI scores for all applications (utility function)"""
    from .models import JobApplication
    
    applications = JobApplication.objects.filter(ai_score=0)
    updated_count = 0
    
    for application in applications:
        ai_score, skill_match, notes = calculate_ai_score(application)
        application.ai_score = ai_score
        application.skill_match_percentage = skill_match
        application.ai_screening_notes = notes
        application.save()
        updated_count += 1
    
    return updated_count
