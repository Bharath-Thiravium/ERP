from rest_framework import serializers
from .models import Department, Designation, Employee, JobPosting, JobApplication, AttendanceSystem, Attendance, AttendanceDevice, AttendanceLog, PerformanceReview
from .form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm, EmployeeFormEntry


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
    code = serializers.CharField(required=False, allow_blank=True)
    
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
            'employment_type', 'work_mode', 'status', 'date_of_joining', 'date_of_leaving',
            'base_salary', 'address_line1', 'address_line2',
            'city', 'state', 'pincode', 'country', 'aadhar_number', 'pan_number',
            'pf_number', 'uan_number', 'esi_number', 'bank_name', 'bank_account_number',
            'bank_ifsc_code', 'bank_branch', 'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_address', 'skills', 'performance_score', 
            'engagement_score', 'retention_risk', 'profile_picture', 'face_photo', 
            'mobile_app_enabled', 'last_mobile_login', 'mobile_device_id', 'created_at',
            'father_husband_name', 'nature_of_employment', 'employee_signature', 'termination_reason', 'termination_date', 'employee_remarks',
            'permanent_address_line1', 'permanent_address_line2', 'permanent_city', 'permanent_state', 'permanent_pincode', 'permanent_country',
            'local_address_line1', 'local_address_line2', 'local_city', 'local_state', 'local_pincode', 'local_country'
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
            'mobile_app_enabled', 'last_mobile_login', 'mobile_device_id', 'created_at', 'updated_at',
            'father_husband_name', 'nature_of_employment', 'employee_signature', 'termination_reason', 'termination_date', 'employee_remarks',
            'permanent_address_line1', 'permanent_address_line2', 'permanent_city', 'permanent_state', 'permanent_pincode', 'permanent_country',
            'local_address_line1', 'local_address_line2', 'local_city', 'local_state', 'local_pincode', 'local_country'
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
            'emergency_contact_phone', 'emergency_contact_address', 'skills', 'profile_picture', 'face_photo',
            'father_husband_name', 'nature_of_employment', 'employee_signature', 'termination_reason', 'termination_date', 'employee_remarks',
            'permanent_address_line1', 'permanent_address_line2', 'permanent_city', 'permanent_state', 'permanent_pincode', 'permanent_country',
            'local_address_line1', 'local_address_line2', 'local_city', 'local_state', 'local_pincode', 'local_country'
        ]
    
    def _get_context_company(self):
        request = self.context.get('request')
        service_user = getattr(request, 'service_user', None) if request else None
        return service_user.company if service_user else None

    def validate_email(self, value):
        if Employee.objects.filter(email=value).exists():
            raise serializers.ValidationError("Employee with this email already exists.")
        return value

    def validate_department(self, value):
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Department not found or access denied.')
        return value

    def validate_designation(self, value):
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Designation not found or access denied.')
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

    def _get_context_company(self):
        request = self.context.get('request')
        service_user = getattr(request, 'service_user', None) if request else None
        return service_user.company if service_user else None

    def validate_employee(self, value):
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Employee not found or access denied.')
        return value

    def validate_reviewer(self, value):
        if value is None:
            return value
        company = self._get_context_company()
        if company is not None and value.company_id != company.id:
            raise serializers.ValidationError('Reviewer not found or access denied.')
        return value


class ComplianceFormTemplateSerializer(serializers.ModelSerializer):
    can_generate_today = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceFormTemplate
        fields = [
            'id', 'form_type', 'template_name', 'template_file', 'file_type',
            'is_monthly_auto_generate', 'generation_day', 'is_active', 
            'template_structure', 'can_generate_today', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'template_structure', 'created_at', 'updated_at']
    
    def get_can_generate_today(self, obj):
        return obj.can_generate_today()

class ComplianceFormTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFormTemplate
        fields = [
            'form_type', 'template_name', 'template_file', 'file_type',
            'is_monthly_auto_generate', 'generation_day', 'is_active'
        ]
    
    def validate_template_file(self, value):
        if value:
            # Validate file size (max 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError('File size cannot exceed 10MB')
            
            # Validate file type
            allowed_types = [
                'application/vnd.ms-excel', 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            if value.content_type not in allowed_types:
                raise serializers.ValidationError('Only Excel, PDF, and Word files are allowed')
        
        return value
    
    def create(self, validated_data):
        instance = super().create(validated_data)
        
        # Parse template structure after file upload
        if instance.template_file and instance.file_type:
            try:
                from .template_parser import TemplateParser
                structure = TemplateParser.parse_template(
                    instance.template_file.path, 
                    instance.file_type
                )
                instance.template_structure = structure
                instance.save(update_fields=['template_structure'])
            except Exception as e:
                # Continue without parsing if it fails
                pass
        
        return instance


class EmployeeFormEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    
    class Meta:
        model = EmployeeFormEntry
        fields = [
            'id', 'employee', 'employee_name', 'employee_id',
            'fine_amount', 'fine_reason', 'fine_date',
            'designation', 'department', 'joining_date', 'basic_wage',
            'father_husband_name', 'nature_of_employment', 'permanent_address', 'local_address',
            'termination_date', 'termination_reason', 'remarks', 'dynamic_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MonthlyComplianceFormSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.template_name', read_only=True)
    form_type = serializers.CharField(source='template.form_type', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    employee_entries = EmployeeFormEntrySerializer(many=True, read_only=True)
    is_current_month = serializers.SerializerMethodField()
    
    class Meta:
        model = MonthlyComplianceForm
        fields = [
            'id', 'template', 'template_name', 'form_type', 'month',
            'status', 'total_employees', 'auto_generated', 'is_current_month',
            'generated_at', 'approved_by', 'approved_by_name', 'approved_at',
            'employee_entries'
        ]
        read_only_fields = [
            'id', 'generated_at', 'approved_by', 'approved_by_name', 'approved_at'
        ]
    
    def get_is_current_month(self, obj):
        return obj.is_current_month()