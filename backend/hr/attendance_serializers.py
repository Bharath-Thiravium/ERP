from rest_framework import serializers
from .models import AttendanceSystem, Attendance, AttendanceDevice, AttendanceLog


class AttendanceSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSystem
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
