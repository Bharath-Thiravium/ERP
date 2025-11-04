from rest_framework import serializers
from .models import Department, Designation, Employee, JobPosting, JobApplication, AttendanceSystem, Attendance, AttendanceDevice, AttendanceLog, PerformanceReview


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()
    code = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'manager', 'is_active', 'employee_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'employee_count']
    
    def get_employee_count(self, obj):
        return obj.employees.filter(status='active').count()


class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Designation
        fields = ['id', 'title', 'code', 'department', 'department_name', 'level', 
                 'min_salary', 'max_salary', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmployeeListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_title = serializers.CharField(source='designation.title', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    face_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'full_name', 'email', 
            'phone', 'date_of_birth', 'gender', 'department', 'department_name', 'designation', 'designation_title',
            'employment_type', 'work_mode', 'status', 'date_of_joining', 
            'base_salary', 'address_line1', 'address_line2',
            'city', 'state', 'pincode', 'country', 'aadhar_number', 'pan_number',
            'pf_number', 'uan_number', 'esi_number', 'bank_name', 'bank_account_number',
            'bank_ifsc_code', 'bank_branch', 'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_address', 'skills', 'performance_score', 
            'engagement_score', 'retention_risk', 'profile_picture', 'face_photo', 
            'mobile_app_enabled', 'last_mobile_login', 'mobile_device_id', 'created_at'
        ]
        read_only_fields = ['id', 'employee_id', 'full_name', 'created_at']
    
    def get_profile_picture(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None
    
    def get_face_photo(self, obj):
        if obj.face_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.face_photo.url)
            return obj.face_photo.url
        return None


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_title = serializers.CharField(source='designation.title', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    face_photo = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'full_name', 'email', 
            'phone', 'date_of_birth', 'gender', 'department', 'department_name',
            'designation', 'designation_title', 'employment_type', 'work_mode',
            'date_of_joining', 'date_of_leaving', 'status',
            'base_salary', 'currency', 'address_line1', 'address_line2',
            'city', 'state', 'pincode', 'country', 'aadhar_number', 'pan_number',
            'pf_number', 'uan_number', 'esi_number', 'bank_name', 'bank_account_number',
            'bank_ifsc_code', 'bank_branch', 'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_address', 'skills', 'performance_score', 
            'engagement_score', 'retention_risk', 'profile_picture', 'face_photo', 'face_encoding',
            'mobile_app_enabled', 'last_mobile_login', 'mobile_device_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'employee_id', 'full_name', 'created_at', 'updated_at']
    
    def get_profile_picture(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None
    
    def get_face_photo(self, obj):
        if obj.face_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.face_photo.url)
            return obj.face_photo.url
        return None
    
    def validate_skills(self, value):
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except json.JSONDecodeError:
                # If not valid JSON, treat as comma-separated string
                if value.strip():
                    return [skill.strip() for skill in value.split(',') if skill.strip()]
                return []
        elif isinstance(value, list):
            return value
        return []


class EmployeeCreateSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Employee
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender',
            'department', 'designation', 'employment_type', 'work_mode', 'date_of_joining',
            'base_salary', 'address_line1', 'address_line2',
            'city', 'state', 'pincode', 'country', 'aadhar_number', 'pan_number',
            'pf_number', 'uan_number', 'esi_number', 'bank_name', 'bank_account_number',
            'bank_ifsc_code', 'bank_branch', 'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_address', 'skills', 'profile_picture', 'face_photo'
        ]
    
    def validate_email(self, value):
        if Employee.objects.filter(email=value).exists():
            raise serializers.ValidationError("Employee with this email already exists.")
        return value
    
    def validate_skills(self, value):
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except json.JSONDecodeError:
                # If not valid JSON, treat as comma-separated string
                if value.strip():
                    return [skill.strip() for skill in value.split(',') if skill.strip()]
                return []
        elif isinstance(value, list):
            return value
        return []


class JobPostingSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_title = serializers.CharField(source='designation.title', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_logo = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    
    class Meta:
        model = JobPosting
        fields = [
            'id', 'title', 'department', 'department_name', 'designation', 'designation_title',
            'company_name', 'company_logo', 'description', 'requirements', 'responsibilities', 'employment_type', 'work_mode',
            'min_salary', 'max_salary', 'required_skills', 'ai_screening_enabled', 'status',
            'posted_date', 'application_deadline', 'applications_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'applications_count', 'company_logo']
    
    def get_applications_count(self, obj):
        return obj.applications.count()
    
    def get_company_logo(self, obj):
        if obj.company.logo:
            return obj.company.logo.url
        return None


class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job_posting.title', read_only=True)
    
    class Meta:
        model = JobApplication
        fields = [
            'id', 'job_posting', 'job_title', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'current_position', 'current_company', 'total_experience',
            'relevant_experience', 'current_salary', 'expected_salary', 'notice_period',
            'current_location', 'willing_to_relocate', 'linkedin_profile', 'portfolio_url',
            'education_details', 'skills', 'certifications', 'languages', 'resume', 'cover_letter',
            'application_source', 'share_id', 'ai_score', 'skill_match_percentage', 'ai_screening_notes', 'status', 
            'interview_date', 'interview_notes', 'interviewer', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'full_name', 'ai_score', 'skill_match_percentage', 'ai_screening_notes', 'created_at', 'updated_at']


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.full_name', read_only=True)
    reviewer = serializers.PrimaryKeyRelatedField(queryset=Employee.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = PerformanceReview
        fields = [
            'id', 'employee', 'employee_name', 'reviewer', 'reviewer_name',
            'review_period_start', 'review_period_end', 'goals_achievement',
            'quality_score', 'productivity_score', 'collaboration_score',
            'overall_rating', 'ai_performance_prediction', 'improvement_suggestions',
            'strengths', 'areas_for_improvement', 'goals_for_next_period',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']