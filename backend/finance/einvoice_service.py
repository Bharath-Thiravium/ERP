"""
E-Invoice Integration Service
"""
import requests
import json
import base64
import hashlib
from datetime import datetime
from django.conf import settings
from django.utils import timezone
import qrcode
from io import BytesIO

class EInvoiceService:
    """Government E-Invoice API Integration"""
    
    def __init__(self, company):
        self.company = company
        self.base_url = getattr(settings, 'EINVOICE_API_URL', 'https://api.einvoice.gov.in')
        self.client_id = getattr(settings, 'EINVOICE_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'EINVOICE_CLIENT_SECRET', '')
    
    def authenticate(self):
        """Authenticate with E-Invoice API"""
        try:
            auth_url = f"{self.base_url}/eivital/v1.04/auth"
            payload = {
                "UserName": self.company.gstin,
                "Password": "dummy_password",  # In production, use actual credentials
                "AppKey": self.client_id,
                "ForceRefreshAccessToken": True
            }
            
            response = requests.post(auth_url, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'access_token': data.get('access_token'),
                    'expires_in': data.get('expires_in')
                }
            else:
                return {
                    'success': False,
                    'error': f"Authentication failed: {response.text}"
                }
        except Exception as e:
            return {
                'success': False,
                'error': f"Authentication error: {str(e)}"
            }
    
    def generate_einvoice(self, invoice):
        """Generate E-Invoice for given invoice"""
        try:
            # Authenticate first
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            # Prepare E-Invoice JSON
            einvoice_data = self._prepare_einvoice_data(invoice)
            
            # Generate E-Invoice
            generate_url = f"{self.base_url}/eivital/v1.04/eInvoice/Generate"
            headers = {
                'Authorization': f"Bearer {auth_result['access_token']}",
                'Content-Type': 'application/json',
                'user_name': self.company.gstin,
                'gstin': self.company.gstin
            }
            
            response = requests.post(generate_url, json=einvoice_data, headers=headers, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('Status') == 1:  # Success
                    return {
                        'success': True,
                        'irn': result.get('Irn'),
                        'ack_no': result.get('AckNo'),
                        'ack_date': result.get('AckDt'),
                        'signed_invoice': result.get('SignedInvoice'),
                        'signed_qr_code': result.get('SignedQRCode'),
                        'qr_code_data': result.get('QRCodeUrl')
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('ErrorDetails', 'Unknown error')
                    }
            else:
                return {
                    'success': False,
                    'error': f"API Error: {response.text}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"E-Invoice generation error: {str(e)}"
            }
    
    def cancel_einvoice(self, irn, reason):
        """Cancel E-Invoice"""
        try:
            auth_result = self.authenticate()
            if not auth_result['success']:
                return auth_result
            
            cancel_url = f"{self.base_url}/eivital/v1.04/eInvoice/Cancel"
            headers = {
                'Authorization': f"Bearer {auth_result['access_token']}",
                'Content-Type': 'application/json',
                'user_name': self.company.gstin,
                'gstin': self.company.gstin
            }
            
            payload = {
                'Irn': irn,
                'CnlRsn': reason,
                'CnlRem': 'Cancelled by user'
            }
            
            response = requests.post(cancel_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    'success': result.get('Status') == 1,
                    'cancel_date': result.get('CancelDate'),
                    'error': result.get('ErrorDetails') if result.get('Status') != 1 else None
                }
            else:
                return {
                    'success': False,
                    'error': f"Cancel API Error: {response.text}"
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"E-Invoice cancellation error: {str(e)}"
            }
    
    def _prepare_einvoice_data(self, invoice):
        """Prepare E-Invoice JSON data"""
        # Get invoice items
        items = []
        for idx, item in enumerate(invoice.invoice_items.all(), 1):
            items.append({
                "SlNo": str(idx),
                "PrdDesc": item.product.name,
                "IsServc": "Y" if item.product.product_type == 'service' else "N",
                "HsnCd": item.product.hsn_code.code if item.product.hsn_code else "998361",
                "Qty": float(item.quantity),
                "Unit": "NOS",
                "UnitPrice": float(item.unit_price),
                "TotAmt": float(item.line_total),
                "Discount": 0,
                "AssAmt": float(item.line_total),
                "GstRt": float(invoice.gst_rate or 18),
                "IgstAmt": float(item.igst_amount or 0),
                "CgstAmt": float(item.cgst_amount or 0),
                "SgstAmt": float(item.sgst_amount or 0),
                "CesRt": 0,
                "CesAmt": 0,
                "CesNonAdvlAmt": 0,
                "StateCesRt": 0,
                "StateCesAmt": 0,
                "StateCesNonAdvlAmt": 0,
                "OthChrg": 0,
                "TotItemVal": float(item.line_total)
            })
        
        # Prepare main E-Invoice structure
        einvoice_data = {
            "Version": "1.1",
            "TranDtls": {
                "TaxSch": "GST",
                "SupTyp": "B2B",
                "RegRev": "N",
                "EcmGstin": None,
                "IgstOnIntra": "N"
            },
            "DocDtls": {
                "Typ": "INV",
                "No": invoice.invoice_number,
                "Dt": invoice.invoice_date.strftime("%d/%m/%Y")
            },
            "SellerDtls": {
                "Gstin": self.company.gstin,
                "LglNm": self.company.name,
                "TrdNm": self.company.name,
                "Addr1": getattr(self.company, 'address', 'Address Line 1'),
                "Addr2": "",
                "Loc": getattr(self.company, 'city', 'City'),
                "Pin": int(getattr(self.company, 'pincode', '400001')),
                "Stcd": getattr(self.company, 'state_code', '27'),
                "Ph": getattr(self.company, 'phone', '9999999999'),
                "Em": getattr(self.company, 'email', 'company@example.com')
            },
            "BuyerDtls": {
                "Gstin": invoice.customer.gstin if invoice.customer.gstin else "URP",
                "LglNm": invoice.customer.name,
                "TrdNm": invoice.customer.name,
                "Pos": invoice.customer.state_code or "27",
                "Addr1": invoice.customer.address or "Address Line 1",
                "Addr2": "",
                "Loc": invoice.customer.city or "City",
                "Pin": int(invoice.customer.pincode) if invoice.customer.pincode else 400001,
                "Stcd": invoice.customer.state_code or "27",
                "Ph": invoice.customer.phone or "9999999999",
                "Em": invoice.customer.email or "customer@example.com"
            },
            "ItemList": items,
            "ValDtls": {
                "AssVal": float(invoice.subtotal),
                "CgstVal": float(invoice.cgst_amount or 0),
                "SgstVal": float(invoice.sgst_amount or 0),
                "IgstVal": float(invoice.igst_amount or 0),
                "CesVal": float(invoice.cess_amount or 0),
                "StCesVal": 0,
                "Discount": 0,
                "OthChrg": 0,
                "RndOffAmt": 0,
                "TotInvVal": float(invoice.total_amount),
                "TotInvValFc": float(invoice.total_amount)
            }
        }
        
        return einvoice_data
    
    def generate_qr_code(self, qr_data):
        """Generate QR code for E-Invoice"""
        try:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            return base64.b64encode(buffer.getvalue()).decode()
        except Exception as e:
            return None