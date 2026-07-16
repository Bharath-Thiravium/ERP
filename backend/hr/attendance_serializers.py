from rest_framework import serializers
from .models import AttendanceSystem, AttendancePolicy, AttendanceDayOverride, Attendance, AttendanceDevice, AttendanceLog


class AttendanceSystemSerializer(serializers.ModelSerializer):
    VALID_SYSTEM_TYPES = {'manual', 'mobile_app', 'biometric'}

    class Meta:
        model = AttendanceSystem
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate(self, attrs):
        attrs = super().validate(attrs)

        instance = getattr(self, 'instance', None)
        system_type = attrs.get('system_type') or getattr(instance, 'system_type', 'manual')
        if system_type == 'face_recognition':
            system_type = 'biometric'
        if system_type == 'hybrid':
            system_type = 'manual'
        if system_type not in self.VALID_SYSTEM_TYPES:
            raise serializers.ValidationError({'system_type': 'Choose manual, mobile_app, or biometric.'})

        attrs['system_type'] = system_type
        attrs['enable_manual_entry'] = system_type == 'manual'
        attrs['enable_mobile_app'] = system_type == 'mobile_app'
        attrs['enable_biometric'] = system_type == 'biometric'

        if system_type == 'mobile_app':
            attrs['enable_geo_fencing'] = True

        if system_type != 'mobile_app':
            attrs['enable_geo_fencing'] = False
            attrs['office_latitude'] = None
            attrs['office_longitude'] = None
            attrs['require_face_for_checkin'] = False
            attrs['require_face_for_checkout'] = False

        if system_type != 'biometric':
            attrs['enable_face_recognition'] = False

        if system_type == 'mobile_app':
            latitude = attrs.get('office_latitude', getattr(instance, 'office_latitude', None))
            longitude = attrs.get('office_longitude', getattr(instance, 'office_longitude', None))
            radius = attrs.get('geo_fence_radius', getattr(instance, 'geo_fence_radius', 0))
            if latitude is None or longitude is None:
                raise serializers.ValidationError({
                    'office_location': 'Office latitude and longitude are required when geo-fencing is enabled.'
                })
            if not radius or int(radius) <= 0:
                raise serializers.ValidationError({'geo_fence_radius': 'Radius must be greater than 0.'})

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        system_type = data.get('system_type')
        if system_type == 'face_recognition':
            system_type = 'biometric'
        if system_type not in self.VALID_SYSTEM_TYPES:
            system_type = 'manual'

        data['system_type'] = system_type
        data['enable_manual_entry'] = system_type == 'manual'
        data['enable_mobile_app'] = system_type == 'mobile_app'
        data['enable_biometric'] = system_type == 'biometric'

        if system_type == 'mobile_app':
            data['enable_geo_fencing'] = True

        if system_type != 'mobile_app':
            data['enable_geo_fencing'] = False
            data['office_latitude'] = None
            data['office_longitude'] = None
            data['require_face_for_checkin'] = False
            data['require_face_for_checkout'] = False

        if system_type != 'biometric':
            data['enable_face_recognition'] = False

        return data


class AttendancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendancePolicy
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate_weekly_off_days(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Weekly off days must be a list.')
        normalized = []
        for day in value:
            try:
                day_number = int(day)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Weekly off days must contain numbers from 0 to 6.')
            if day_number < 0 or day_number > 6:
                raise serializers.ValidationError('Weekly off days must contain numbers from 0 to 6.')
            if day_number not in normalized:
                normalized.append(day_number)
        return sorted(normalized)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        full_day = attrs.get('full_day_min_hours', getattr(self.instance, 'full_day_min_hours', None))
        half_day = attrs.get('half_day_min_hours', getattr(self.instance, 'half_day_min_hours', None))
        overtime_after = attrs.get('overtime_after_hours', getattr(self.instance, 'overtime_after_hours', None))

        if full_day is not None and full_day <= 0:
            raise serializers.ValidationError({'full_day_min_hours': 'Full day hours must be greater than 0.'})
        if half_day is not None and half_day <= 0:
            raise serializers.ValidationError({'half_day_min_hours': 'Half day hours must be greater than 0.'})
        if full_day is not None and half_day is not None and half_day > full_day:
            raise serializers.ValidationError({'half_day_min_hours': 'Half day hours cannot be greater than full day hours.'})
        if overtime_after is not None and overtime_after <= 0:
            raise serializers.ValidationError({'overtime_after_hours': 'Overtime threshold must be greater than 0.'})
        return attrs


class AttendanceDayOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceDayOverride
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True)
    is_late = serializers.SerializerMethodField()
    check_in_time_display = serializers.SerializerMethodField()
    check_out_time_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'attendance_number', 'employee', 'employee_name', 'employee_id', 'department_name', 'date',
            'check_in_time', 'check_out_time', 'check_in_time_display', 'check_out_time_display',
            'check_in_method', 'check_out_method', 'check_in_location', 'check_out_location', 
            'check_in_latitude', 'check_in_longitude', 'check_out_latitude', 'check_out_longitude', 
            'check_in_face_image', 'check_out_face_image', 'face_match_score', 'biometric_device_id', 
            'work_mode', 'total_hours', 'break_hours', 'overtime_hours', 'status', 
            'is_valid_checkin_location', 'is_valid_checkout_location', 'is_valid_face_match', 
            'notes', 'approved_by', 'is_late', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'attendance_number', 'employee_name', 'employee_id', 'department_name', 'is_late', 
                           'check_in_time_display', 'check_out_time_display', 'created_at', 'updated_at']
    
    def get_is_late(self, obj):
        return obj.is_late()
    
    def get_check_in_time_display(self, obj):
        if obj.check_in_time:
            from django.utils import timezone
            # Convert to local timezone for display
            local_time = timezone.localtime(obj.check_in_time)
            return local_time.strftime('%I:%M %p')
        return None
    
    def get_check_out_time_display(self, obj):
        if obj.check_out_time:
            from django.utils import timezone
            # Convert to local timezone for display
            local_time = timezone.localtime(obj.check_out_time)
            return local_time.strftime('%I:%M %p')
        return None


class AttendanceDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceDevice
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class MobileAttendanceSerializer(serializers.Serializer):
    employee_id = serializers.CharField()
    action = serializers.ChoiceField(choices=[('checkin', 'Check In'), ('checkout', 'Check Out')])
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)
    location_name = serializers.CharField(max_length=255, required=False)
    face_image = serializers.ImageField(required=False)
    notes = serializers.CharField(max_length=500, required=False)


class FaceRecognitionSerializer(serializers.Serializer):
    face_image = serializers.ImageField()
    device_id = serializers.CharField(required=False)
    action = serializers.ChoiceField(choices=[('checkin', 'Check In'), ('checkout', 'Check Out')])
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False)
