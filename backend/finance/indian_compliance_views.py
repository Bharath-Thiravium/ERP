# Indian Compliance API Views
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import permissions
from django.db.models import Sum, Q
from datetime import datetime, date
from authentication.models import ServiceUserSession
from .models import Invoice, Payment, Customer
from .indian_compliance import IndianComplianceManager, INDIAN_STATE_CODES, TDS_SECTIONS
from .compliance_notifications import get_compliance_summary, get_compliance_alerts


class GSTCalculatorView(APIView):
    """Calculate GST amounts for invoice items"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=400)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            # Get calculation parameters
            company_state_code = request.data.get('company_state_code', '27')
            customer_gstin = request.data.get('customer_gstin', '')
            customer_state_code = request.data.get('customer_state_code', '')
            line_items = request.data.get('line_items', [])
            
            # Determine GST type
            gst_type = IndianComplianceManager.calculate_gst_type(
                company_state_code, customer_state_code, customer_gstin
            )
            
            # Calculate GST for each line item
            calculated_items = []
            total_cgst = total_sgst = total_igst = 0
            
            for item in line_items:
                line_total = float(item.get('line_total', 0))
                gst_rate = float(item.get('gst_rate', 0))
                
                gst_amounts = IndianComplianceManager.calculate_gst_amounts(
                    line_total, gst_rate, gst_type
                )
                
                calculated_items.append({
                    'product_name': item.get('product_name', ''),
                    'line_total': line_total,
                    'gst_rate': gst_rate,
                    'cgst_amount': float(gst_amounts['cgst_amount']),
                    'sgst_amount': float(gst_amounts['sgst_amount']),
                    'igst_amount': float(gst_amounts['igst_amount']),
                })
                
                total_cgst += gst_amounts['cgst_amount']
                total_sgst += gst_amounts['sgst_amount']
                total_igst += gst_amounts['igst_amount']
            
            return Response({
                'gst_type': gst_type,
                'place_of_supply': customer_state_code or company_state_code,
                'line_items': calculated_items,
                'totals': {
                    'total_cgst': float(total_cgst),
                    'total_sgst': float(total_sgst),
                    'total_igst': float(total_igst),
                    'total_tax': float(total_cgst + total_sgst + total_igst),
                }
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=401)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class GSTINValidatorView(APIView):
    """Validate GSTIN format and extract state code"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        gstin = request.data.get('gstin', '').strip().upper()
        
        if not gstin:
            return Response({'error': 'GSTIN is required'}, status=400)
        
        is_valid = IndianComplianceManager.validate_gstin(gstin)
        state_code = IndianComplianceManager.get_state_code_from_gstin(gstin) if is_valid else None
        state_name = INDIAN_STATE_CODES.get(state_code, '') if state_code else ''
        
        return Response({
            'gstin': gstin,
            'is_valid': is_valid,
            'state_code': state_code,
            'state_name': state_name,
            'message': 'Valid GSTIN' if is_valid else 'Invalid GSTIN format'
        })


class TDSCalculatorView(APIView):
    """Calculate TDS amounts based on section and amount"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=400)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            payment_amount = float(request.data.get('payment_amount', 0))
            tds_section = request.data.get('tds_section', '')
            
            if payment_amount <= 0:
                return Response({'error': 'Payment amount must be greater than 0'}, status=400)
            
            if not tds_section:
                return Response({'error': 'TDS section is required'}, status=400)
            
            # Calculate TDS
            tds_data = IndianComplianceManager.calculate_tds(payment_amount, tds_section)
            section_info = TDS_SECTIONS.get(tds_section, {})
            
            return Response({
                'payment_amount': payment_amount,
                'tds_section': tds_section,
                'section_description': section_info.get('description', ''),
                'tds_rate': float(tds_data['tds_rate']),
                'tds_amount': float(tds_data['tds_amount']),
                'net_amount': float(tds_data['net_amount']),
                'threshold': section_info.get('threshold', 0),
                'is_above_threshold': payment_amount >= section_info.get('threshold', 0),
            })
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=401)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def get_indian_states(request):
    """Get list of Indian states with codes"""
    states = [
        {'code': code, 'name': name}
        for code, name in INDIAN_STATE_CODES.items()
    ]
    return Response({'states': states})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def get_tds_sections(request):
    """Get list of TDS sections"""
    sections = [
        {
            'code': code,
            'description': data['description'],
            'rate': data['rate'],
            'threshold': data['threshold']
        }
        for code, data in TDS_SECTIONS.items()
    ]
    return Response({'tds_sections': sections})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def generate_gstr1_data(request):
    """Generate GSTR-1 data for specified period"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Get date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, status=400)
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
        
        # Generate GSTR-1 data
        gstr1_data = IndianComplianceManager.generate_gstr1_data(company, start_date, end_date)
        
        return Response({
            'period': {
                'start_date': start_date.strftime('%d-%m-%Y'),
                'end_date': end_date.strftime('%d-%m-%Y'),
            },
            'company': {
                'name': company.name,
                'gstin': getattr(company, 'gst_number', ''),
            },
            'gstr1_data': gstr1_data
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def compliance_dashboard(request):
    """Get enhanced compliance dashboard data with notifications"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Get comprehensive compliance summary
        compliance_summary = get_compliance_summary(company)
        
        # Get compliance alerts
        compliance_alerts = get_compliance_alerts(company)
        
        return Response({
            **compliance_summary,
            'alerts': compliance_alerts,
            'notifications': {
                'total_alerts': len(compliance_alerts),
                'high_priority': len([a for a in compliance_alerts if a['priority'] == 'high']),
                'medium_priority': len([a for a in compliance_alerts if a['priority'] == 'medium']),
                'low_priority': len([a for a in compliance_alerts if a['priority'] == 'low'])
            }
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def compliance_alerts(request):
    """Get compliance alerts only"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        alerts = get_compliance_alerts(company)
        
        return Response({
            'alerts': alerts,
            'summary': {
                'total': len(alerts),
                'high_priority': len([a for a in alerts if a['priority'] == 'high']),
                'medium_priority': len([a for a in alerts if a['priority'] == 'medium']),
                'low_priority': len([a for a in alerts if a['priority'] == 'low'])
            }
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)