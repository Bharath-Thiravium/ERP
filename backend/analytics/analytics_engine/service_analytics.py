from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from authentication.models import Company, Service, CompanyServiceUser
from finance.models import Invoice, Payment
from hr.models import Employee
from inventory.models import Product, StockMovement

class ServiceAnalytics:
    @staticmethod
    def get_service_adoption_rates(company=None):
        """Get service adoption rates.
        If company is given, returns which services that company uses (adoption = 100% or 0%).
        If no company, returns platform-wide adoption rates (Master Admin view).
        """
        services = Service.objects.all()
        adoption_data = []

        if company is not None:
            # For a single company: show which services they use
            company_service_ids = set(
                company.company_services.values_list('service_id', flat=True)
            )
            for service in services:
                adoption_data.append({
                    'service_id': service.id,
                    'service_name': service.name,
                    'companies_using': None,
                    'adoption_rate': None,
                    'subscribed': service.id in company_service_ids
                })
            return adoption_data

        total_companies = Company.objects.filter(approval_status='approved').count()

        for service in services:
            companies_using = Company.objects.filter(
                company_services__service=service,
                approval_status='approved'
            ).count()

            adoption_rate = (companies_using / total_companies * 100) if total_companies > 0 else 0

            adoption_data.append({
                'service_id': service.id,
                'service_name': service.name,
                'companies_using': companies_using,
                'adoption_rate': round(adoption_rate, 2)
            })

        return adoption_data

    @staticmethod
    def get_service_performance_metrics(company=None):
        """Get performance metrics for each service.
        If company is given, scoped to that company's data only.
        """
        metrics = {}

        invoice_qs = Invoice.objects.all()
        payment_qs = Payment.objects.all()
        employee_qs = Employee.objects.all()
        product_qs = Product.objects.all()
        movement_qs = StockMovement.objects.all()

        if company is not None:
            invoice_qs = invoice_qs.filter(company=company)
            payment_qs = payment_qs.filter(company=company)
            employee_qs = employee_qs.filter(company=company)
            product_qs = product_qs.filter(company=company)
            movement_qs = movement_qs.filter(product__company=company)

        if company is not None:
            finance_companies = 1 if company.company_services.filter(service__name='Finance').exists() else 0
            hr_companies = 1 if company.company_services.filter(service__name='HR').exists() else 0
            inventory_companies = 1 if company.company_services.filter(service__name='Inventory').exists() else 0
        else:
            finance_companies = Company.objects.filter(
                company_services__service__name='Finance',
                approval_status='approved'
            ).count()
            hr_companies = Company.objects.filter(
                company_services__service__name='HR',
                approval_status='approved'
            ).count()
            inventory_companies = Company.objects.filter(
                company_services__service__name='Inventory',
                approval_status='approved'
            ).count()

        metrics['finance'] = {
            'active_companies': finance_companies,
            'total_invoices': invoice_qs.count(),
            'total_payments': payment_qs.count(),
            'success_rate': payment_qs.filter(status='completed').count()
        }

        metrics['hr'] = {
            'active_companies': hr_companies,
            'total_employees': employee_qs.count(),
            'avg_employees_per_company': employee_qs.count() / hr_companies if hr_companies > 0 else 0
        }

        metrics['inventory'] = {
            'active_companies': inventory_companies,
            'total_products': product_qs.count(),
            'total_movements': movement_qs.count(),
            'avg_products_per_company': product_qs.count() / inventory_companies if inventory_companies > 0 else 0
        }

        return metrics

    @staticmethod
    def get_service_usage_trends(days=30, company=None):
        """Get service usage trends over time.
        If company is given, scoped to that company's service users only.
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        trends = {}
        services = Service.objects.all()

        for service in services:
            daily_usage = []

            for i in range(days):
                day = start_date + timedelta(days=i)
                day_end = day + timedelta(days=1)

                qs = CompanyServiceUser.objects.filter(
                    service=service,
                    last_login__gte=day,
                    last_login__lt=day_end
                )
                if company is not None:
                    qs = qs.filter(company=company)

                daily_usage.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'active_users': qs.count()
                })

            trends[service.name.lower()] = daily_usage

        return trends

    @staticmethod
    def get_service_revenue_contribution(company=None):
        """Get revenue contribution by service.
        If company is given, scoped to that company's revenue only.
        Bug fix: previously the company filter was built but not applied to the Payment query.
        """
        services = Service.objects.all()
        revenue_data = []

        for service in services:
            companies_with_service = Company.objects.filter(
                company_services__service=service,
                approval_status='approved'
            )
            if company is not None:
                companies_with_service = companies_with_service.filter(id=company.id)

            try:
                # Fix: filter Payment by the companies that use this service
                service_revenue = Payment.objects.filter(
                    company__in=companies_with_service,
                    status='completed'
                ).aggregate(total=Sum('amount'))['total'] or 0
            except Exception:
                service_revenue = 0

            revenue_data.append({
                'service_name': service.name,
                'revenue': float(service_revenue),
                'companies_count': companies_with_service.count()
            })

        return revenue_data
