"""
Government API Integration Service
Handles GST and TDS API calls to Indian government systems
"""
import requests
import json
import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class GSTAPIService:
    """GST API integration service"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'GST_API_BASE_URL', 'https://api.gst.gov.in')
        self.client_id = getattr(settings, 'GST_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'GST_CLIENT_SECRET', '')
        self.username = getattr(settings, 'GST_USERNAME', '')
        self.password = getattr(settings, 'GST_PASSWORD', '')
        
    def get_auth_token(self):
        """Get authentication token from GST API"""
        cache_key = 'gst_auth_token'
        token = cache.get(cache_key)
        
        if not token:
            try:
                auth_data = {
                    'username': self.username,
                    'password': self.password,
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'password'
                }
                
                response = requests.post(
                    f"{self.base_url}/gsp/authenticate",
                    json=auth_data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('access_token')
                    expires_in = data.get('expires_in', 3600)
                    cache.set(cache_key, token, expires_in - 60)
                    return token
                else:
                    logger.error(f"GST Auth failed: {response.text}")
                    return None
                    
            except Exception as e:
                logger.error(f"GST Auth error: {str(e)}")
                return None
                
        return token
    
    def validate_gstin(self, gstin):
        """Validate GSTIN with government database"""
        token = self.get_auth_token()
        if not token:
            return {'valid': False, 'error': 'Authentication failed'}
            
        try:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/taxpayerapi/v1.0/authenticate",
                headers=headers,
                params={'gstin': gstin},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'valid': True,
                    'business_name': data.get('tradeNam', ''),
                    'legal_name': data.get('lgnm', ''),
                    'status': data.get('sts', ''),
                    'registration_date': data.get('rgdt', ''),
                    'state_code': data.get('stj', ''),
                    'taxpayer_type': data.get('dty', '')
                }
            else:
                return {'valid': False, 'error': 'GSTIN not found'}
                
        except Exception as e:
            logger.error(f"GSTIN validation error: {str(e)}")
            return {'valid': False, 'error': str(e)}
    
    def get_gst_rates(self, hsn_code):
        """Get current GST rates for HSN code"""
        try:
            token = self.get_auth_token()
            if not token:
                return None
                
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/master/v1.0/hsnrates",
                headers=headers,
                params={'hsn': hsn_code},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'cgst': data.get('cgst', 0),
                    'sgst': data.get('sgst', 0),
                    'igst': data.get('igst', 0),
                    'cess': data.get('cess', 0)
                }
                
        except Exception as e:
            logger.error(f"GST rates error: {str(e)}")
            
        return None
    
    def file_gstr1(self, gstin, return_period, invoice_data):
        """File GSTR-1 return"""
        token = self.get_auth_token()
        if not token:
            return {'success': False, 'error': 'Authentication failed'}
            
        try:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            gstr1_data = {
                'gstin': gstin,
                'ret_period': return_period,
                'b2b': invoice_data.get('b2b', []),
                'b2cl': invoice_data.get('b2cl', []),
                'b2cs': invoice_data.get('b2cs', []),
                'cdnr': invoice_data.get('cdnr', []),
                'exp': invoice_data.get('exp', [])
            }
            
            response = requests.post(
                f"{self.base_url}/returns/gstr1",
                headers=headers,
                json=gstr1_data,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'reference_id': data.get('reference_id'),
                    'ack_no': data.get('ack_no'),
                    'status': data.get('status')
                }
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"GSTR-1 filing error: {str(e)}")
            return {'success': False, 'error': str(e)}

class TDSAPIService:
    """TDS API integration service"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'TDS_API_BASE_URL', 'https://incometaxindiaefiling.gov.in')
        self.pan = getattr(settings, 'COMPANY_PAN', '')
        self.tan = getattr(settings, 'COMPANY_TAN', '')
        self.username = getattr(settings, 'TDS_USERNAME', '')
        self.password = getattr(settings, 'TDS_PASSWORD', '')
    
    def get_auth_token(self):
        """Get TDS API authentication token"""
        cache_key = 'tds_auth_token'
        token = cache.get(cache_key)
        
        if not token:
            try:
                auth_data = {
                    'username': self.username,
                    'password': self.password,
                    'tan': self.tan
                }
                
                response = requests.post(
                    f"{self.base_url}/api/auth/login",
                    json=auth_data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('token')
                    cache.set(cache_key, token, 3600)
                    return token
                    
            except Exception as e:
                logger.error(f"TDS Auth error: {str(e)}")
                
        return token
    
    def validate_pan(self, pan):
        """Validate PAN with income tax database"""
        token = self.get_auth_token()
        if not token:
            return {'valid': False, 'error': 'Authentication failed'}
            
        try:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/api/validate/pan",
                headers=headers,
                params={'pan': pan},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'valid': True,
                    'name': data.get('name', ''),
                    'status': data.get('status', ''),
                    'category': data.get('category', '')
                }
            else:
                return {'valid': False, 'error': 'PAN not found'}
                
        except Exception as e:
            logger.error(f"PAN validation error: {str(e)}")
            return {'valid': False, 'error': str(e)}
    
    def get_tds_rates(self, section_code, assessment_year):
        """Get current TDS rates for section"""
        try:
            token = self.get_auth_token()
            if not token:
                return None
                
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                f"{self.base_url}/api/rates/tds",
                headers=headers,
                params={
                    'section': section_code,
                    'ay': assessment_year
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'rate': data.get('rate', 0),
                    'threshold': data.get('threshold', 0),
                    'surcharge': data.get('surcharge', 0),
                    'cess': data.get('cess', 0)
                }
                
        except Exception as e:
            logger.error(f"TDS rates error: {str(e)}")
            
        return None
    
    def file_tds_return(self, quarter, financial_year, tds_data):
        """File TDS return"""
        token = self.get_auth_token()
        if not token:
            return {'success': False, 'error': 'Authentication failed'}
            
        try:
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            return_data = {
                'tan': self.tan,
                'quarter': quarter,
                'financial_year': financial_year,
                'deductee_details': tds_data.get('deductees', []),
                'challan_details': tds_data.get('challans', []),
                'total_tax_deducted': tds_data.get('total_tax', 0),
                'total_tax_deposited': tds_data.get('total_deposited', 0)
            }
            
            response = requests.post(
                f"{self.base_url}/api/returns/tds",
                headers=headers,
                json=return_data,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'token_no': data.get('token_no'),
                    'ack_no': data.get('ack_no'),
                    'status': data.get('status')
                }
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"TDS return filing error: {str(e)}")
            return {'success': False, 'error': str(e)}

class EInvoiceService:
    """E-Invoice API integration"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'EINVOICE_API_BASE_URL', 'https://einvoice1.gst.gov.in')
        self.client_id = getattr(settings, 'EINVOICE_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'EINVOICE_CLIENT_SECRET', '')
        self.gstin = getattr(settings, 'COMPANY_GSTIN', '')
    
    def generate_irn(self, invoice_data):
        """Generate IRN for e-invoice"""
        try:
            token = self.get_auth_token()
            if not token:
                return {'success': False, 'error': 'Authentication failed'}
                
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
                'gstin': self.gstin
            }
            
            response = requests.post(
                f"{self.base_url}/einvoice/v1.03/invoice",
                headers=headers,
                json=invoice_data,
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'irn': data.get('Irn'),
                    'ack_no': data.get('AckNo'),
                    'ack_dt': data.get('AckDt'),
                    'qr_code': data.get('SignedQRCode')
                }
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            logger.error(f"E-invoice generation error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_auth_token(self):
        """Get e-invoice API token"""
        cache_key = 'einvoice_auth_token'
        token = cache.get(cache_key)
        
        if not token:
            try:
                auth_data = {
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'client_credentials'
                }
                
                response = requests.post(
                    f"{self.base_url}/eivital/v1.04/auth",
                    json=auth_data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get('access_token')
                    expires_in = data.get('expires_in', 3600)
                    cache.set(cache_key, token, expires_in - 60)
                    return token
                    
            except Exception as e:
                logger.error(f"E-invoice auth error: {str(e)}")
                
        return token

# Service instances
gst_service = GSTAPIService()
tds_service = TDSAPIService()
einvoice_service = EInvoiceService()