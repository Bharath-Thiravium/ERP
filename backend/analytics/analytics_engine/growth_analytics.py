from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from authentication.models import Company, CompanyServiceUser
from finance.models import Payment
from hr.models import Employee

class GrowthAnalytics:
    @staticmethod
    def get_company_growth_trend(months=12):
        """Get company registration growth trend (Master Admin only — platform-wide concept)."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)

        growth_data = []
        cumulative_count = 0

        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)

            new_companies = Company.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end,
                approval_status='approved'
            ).count()

            cumulative_count += new_companies

            growth_data.append({
                'month': month_start.strftime('%Y-%m'),
                'new_companies': new_companies,
                'total_companies': cumulative_count
            })

        return growth_data

    @staticmethod
    def get_revenue_growth_trend(months=12, company=None):
        """Get revenue growth trend.
        If company is given, scoped to that company's payments only.
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)

        revenue_growth = []

        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)

            qs = Payment.objects.filter(
                status='completed',
                created_at__gte=month_start,
                created_at__lt=month_end
            )
            if company is not None:
                qs = qs.filter(company=company)

            monthly_revenue = qs.aggregate(total=Sum('amount'))['total'] or 0

            revenue_growth.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(monthly_revenue)
            })

        return revenue_growth

    @staticmethod
    def get_user_growth_trend(months=12, company=None):
        """Get user growth trend.
        If company is given, scoped to that company's service users and employees only.
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=months * 30)

        user_growth = []

        for i in range(months):
            month_start = start_date + timedelta(days=i * 30)
            month_end = month_start + timedelta(days=30)

            su_qs = CompanyServiceUser.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            )
            emp_qs = Employee.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            )
            if company is not None:
                su_qs = su_qs.filter(company=company)
                emp_qs = emp_qs.filter(company=company)

            new_service_users = su_qs.count()
            new_employees = emp_qs.count()

            user_growth.append({
                'month': month_start.strftime('%Y-%m'),
                'service_users': new_service_users,
                'employees': new_employees,
                'total_new_users': new_service_users + new_employees
            })

        return user_growth

    @staticmethod
    def get_growth_kpis(company=None):
        """Get key growth performance indicators.
        If company is given, scoped to that company's revenue and users (no company-count KPIs).
        """
        now = timezone.now()
        last_month = now - timedelta(days=30)

        # Revenue growth
        rev_qs_current = Payment.objects.filter(status='completed', created_at__gte=last_month)
        rev_qs_previous = Payment.objects.filter(
            status='completed',
            created_at__gte=last_month - timedelta(days=30),
            created_at__lt=last_month
        )
        if company is not None:
            rev_qs_current = rev_qs_current.filter(company=company)
            rev_qs_previous = rev_qs_previous.filter(company=company)

        current_revenue = rev_qs_current.aggregate(total=Sum('amount'))['total'] or 0
        previous_revenue = rev_qs_previous.aggregate(total=Sum('amount'))['total'] or 0

        revenue_growth_rate = (
            (current_revenue - previous_revenue) / previous_revenue * 100
        ) if previous_revenue > 0 else 0

        kpis = {
            'revenue_growth_rate': round(revenue_growth_rate, 2),
            'revenue_this_month': float(current_revenue),
            'revenue_last_month': float(previous_revenue)
        }

        if company is None:
            # Company growth KPIs are platform-level only
            current_month_companies = Company.objects.filter(
                created_at__gte=last_month,
                approval_status='approved'
            ).count()

            previous_month_companies = Company.objects.filter(
                created_at__gte=last_month - timedelta(days=30),
                created_at__lt=last_month,
                approval_status='approved'
            ).count()

            company_growth_rate = (
                (current_month_companies - previous_month_companies) / previous_month_companies * 100
            ) if previous_month_companies > 0 else 0

            kpis.update({
                'company_growth_rate': round(company_growth_rate, 2),
                'new_companies_this_month': current_month_companies,
                'new_companies_last_month': previous_month_companies
            })

        return kpis
