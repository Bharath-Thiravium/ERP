from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import permissions, status
from rest_framework.response import Response
from authentication.models import ServiceUserSession
from .models import Employee, PayrollCycle
from .form_generators import Form16Generator, PayrollRegisterGenerator, BankAdviceGenerator, ChallanGenerator
from datetime import date


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_form16(request):
    """Generate Form 16 for employee"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        employee_id = request.data.get('employee_id')
        financial_year = request.data.get('financial_year', '2023-24')
        
        employee = Employee.objects.get(id=employee_id, company=company)
        
        generator = Form16Generator(company)
        pdf_buffer = generator.generate(employee, financial_year)
        
        return Response({
            'message': 'Form 16 generated successfully',
            'employee_name': employee.full_name,
            'financial_year': financial_year
        })
        
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_payroll_register(request):
    """Generate payroll register"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        payroll_cycle_id = request.data.get('payroll_cycle_id')
        payroll_cycle = PayrollCycle.objects.get(id=payroll_cycle_id, company=company)
        
        generator = PayrollRegisterGenerator(company)
        pdf_buffer = generator.generate(payroll_cycle)
        
        return Response({
            'message': 'Payroll register generated successfully',
            'payroll_cycle': payroll_cycle.name
        })
        
    except PayrollCycle.DoesNotExist:
        return Response({'error': 'Payroll cycle not found'}, status=status.HTTP_404_NOT_FOUND)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_bank_advice(request):
    """Generate bank advice"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        payroll_cycle_id = request.data.get('payroll_cycle_id')
        payment_date = request.data.get('payment_date', date.today())
        
        payroll_cycle = PayrollCycle.objects.get(id=payroll_cycle_id, company=company)
        
        generator = BankAdviceGenerator(company)
        pdf_buffer = generator.generate(payroll_cycle, payment_date)
        
        return Response({
            'message': 'Bank advice generated successfully',
            'payroll_cycle': payroll_cycle.name,
            'payment_date': payment_date
        })
        
    except PayrollCycle.DoesNotExist:
        return Response({'error': 'Payroll cycle not found'}, status=status.HTTP_404_NOT_FOUND)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_pf_challan(request):
    """Generate PF challan"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        month = request.data.get('month', date.today().month)
        year = request.data.get('year', date.today().year)
        
        generator = ChallanGenerator(company)
        pdf_buffer = generator.generate_pf_challan(month, year)
        
        from django.http import HttpResponse
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="PF_Challan_{month:02d}_{year}.pdf"'
        return response
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def generate_esi_challan(request):
    """Generate ESI challan"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        month = request.data.get('month', date.today().month)
        year = request.data.get('year', date.today().year)
        
        generator = ChallanGenerator(company)
        pdf_buffer = generator.generate_esi_challan(month, year)
        
        from django.http import HttpResponse
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ESI_Challan_{month:02d}_{year}.pdf"'
        return response
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)