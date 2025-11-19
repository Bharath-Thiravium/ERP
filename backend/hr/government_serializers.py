from rest_framework import serializers
from .government_integration import PortalCredentials, SubmissionLog, ChallanGeneration


class PortalCredentialsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortalCredentials
        fields = [
            'id', 'epfo_username', 'esic_username', 'it_username', 'pt_username',
            'epfo_api_key', 'esic_api_key', 'it_api_key', 'is_active',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'epfo_password': {'write_only': True},
            'esic_password': {'write_only': True},
            'it_password': {'write_only': True},
            'pt_password': {'write_only': True},
        }


class SubmissionLogSerializer(serializers.ModelSerializer):
    return_type = serializers.CharField(source='government_return.return_type', read_only=True)
    period = serializers.SerializerMethodField()
    
    class Meta:
        model = SubmissionLog
        fields = [
            'id', 'portal_name', 'return_type', 'period', 'submission_method',
            'acknowledgment_number', 'submission_status', 'response_data',
            'error_message', 'submitted_at', 'processed_at', 'created_at'
        ]
    
    def get_period(self, obj):
        return f"{obj.government_return.period_month:02d}/{obj.government_return.period_year}"


class ChallanGenerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChallanGeneration
        fields = [
            'id', 'challan_number', 'challan_type', 'amount', 'due_date',
            'bank_details', 'is_paid', 'payment_date', 'payment_reference',
            'challan_file_path', 'created_at'
        ]


class GovernmentSubmissionSerializer(serializers.Serializer):
    return_id = serializers.IntegerField()
    portal_type = serializers.ChoiceField(choices=[
        ('epfo', 'EPFO'),
        ('esic', 'ESIC'),
        ('pt', 'Professional Tax'),
        ('income_tax', 'Income Tax'),
    ])
    session_key = serializers.CharField(required=False)


class StatusCheckSerializer(serializers.Serializer):
    acknowledgment_number = serializers.CharField(max_length=100)
    return_type = serializers.ChoiceField(choices=[
        ('pf_ecr', 'PF ECR'),
        ('esi_return', 'ESI Return'),
        ('pt_return', 'Professional Tax Return'),
        ('tds_24q', 'TDS 24Q Return'),
    ])
    session_key = serializers.CharField(required=False)