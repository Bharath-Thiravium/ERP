"""
Phase 4: CRM Seed Data for Royal Enfield (company_id=40)
"""
import os, sys, random
sys.path.insert(0, '/home/athenaerp/athenaerp/ERP/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
import django; django.setup()

from datetime import date, timedelta
from decimal import Decimal
from authentication.models import Company, CompanyServiceUser
from django.contrib.auth.models import User
from crm.models import Lead, Contact, Account, Opportunity, Activity, Deal, PipelineStage, Campaign, SalesAnalytics, SalesTarget, CustomerInteraction

COMPANY_ID = 40
company = Company.objects.get(id=COMPANY_ID)
service_user = CompanyServiceUser.objects.filter(company=company, service__service_type='crm').first()
admin_user = User.objects.filter(is_staff=True).first()
today = date.today()

print("=== Phase 4: CRM Seed Data ===")

stages = list(PipelineStage.objects.filter(company=company).order_by('order'))
print(f"  Pipeline stages: {len(stages)}")

# Accounts
accounts_data = [
    ('Bajaj Auto Dealers', 'dealer', 'Automotive', 'bajaj.dealers@bajaj.com', '9800010001', '123 Auto Hub, Mumbai'),
    ('Hero MotoCorp Showroom', 'dealer', 'Automotive', 'hero.showroom@hero.com', '9800010002', '456 Motor Plaza, Delhi'),
    ('TVS Authorized Service', 'service_center', 'Automotive', 'tvs.service@tvs.com', '9800010003', '789 Service Center, Chennai'),
    ('Yamaha Flagship Store', 'dealer', 'Automotive', 'yamaha.store@yamaha.com', '9800010004', '321 Bike World, Bengaluru'),
    ('Moto Parts Wholesale', 'distributor', 'Automotive', 'moto.parts@motowholesale.com', '9800010005', '654 Parts Market, Pune'),
    ('Speed Accessories', 'retailer', 'Retail', 'speed.acc@speedacc.com', '9800010006', '987 Gear Shop, Hyderabad'),
    ('Classic Riders Club', 'customer', 'Automotive', 'classic.riders@crc.com', '9800010007', '147 Club House, Jaipur'),
    ('Enfield Service Hub', 'service_center', 'Automotive', 'enfield.hub@efhub.com', '9800010008', '258 Service Lane, Kochi'),
    ('Bike World India', 'dealer', 'Automotive', 'bike.world@bikeworld.com', '9800010009', '369 Auto Street, Ahmedabad'),
    ('Moto Gear Pro', 'retailer', 'Retail', 'moto.gear@motogear.com', '9800010010', '741 Bike Center, Kolkata'),
]
accounts = []
for i, (name, atype, industry, email, phone, addr) in enumerate(accounts_data):
    a, created = Account.objects.get_or_create(company=company, name=name, defaults={
        'account_id': f'ACC{1000+i:04d}', 'account_type': atype, 'industry': industry,
        'email': email, 'phone': phone, 'billing_address': addr, 'is_active': True, 'created_by': admin_user})
    accounts.append(a)
    if created: print(f"  + Account: {name}")
print(f"  Accounts ready: {len(accounts)}")

# Contacts
contacts_data = [
    ('Rajesh', 'Kumar', 'rajesh.kumar@bajaj.com', '9811001001', 'Purchase Manager', accounts[0]),
    ('Sunita', 'Sharma', 'sunita.sharma@hero.com', '9811001002', 'Sales Director', accounts[1]),
    ('Mohan', 'Raj', 'mohan.raj@tvs.com', '9811001003', 'Service Head', accounts[2]),
    ('Preethi', 'Nair', 'preethi.nair@yamaha.com', '9811001004', 'Operations Manager', accounts[3]),
    ('Arun', 'Mehta', 'arun.mehta@motowholesale.com', '9811001005', 'Procurement Head', accounts[4]),
    ('Divya', 'Pillai', 'divya.pillai@speedacc.com', '9811001006', 'Store Manager', accounts[5]),
    ('Suresh', 'Iyer', 'suresh.iyer@crc.com', '9811001007', 'Club President', accounts[6]),
    ('Kavitha', 'Menon', 'kavitha.menon@efhub.com', '9811001008', 'Service Manager', accounts[7]),
    ('Dinesh', 'Patel', 'dinesh.patel@bikeworld.com', '9811001009', 'Dealer Principal', accounts[8]),
    ('Ananya', 'Singh', 'ananya.singh@motogear.com', '9811001010', 'Category Manager', accounts[9]),
]
contacts = []
for i, (fn, ln, email, phone, title, account) in enumerate(contacts_data):
    c, created = Contact.objects.get_or_create(company=company, email=email, defaults={
        'contact_id': f'CON{1000+i:04d}', 'first_name': fn, 'last_name': ln,
        'phone': phone, 'job_title': title, 'city': 'Chennai', 'state': 'Tamil Nadu', 'country': 'India',
        'is_active': True, 'created_by': admin_user})
    if created: c.primary_accounts.set([account])
    contacts.append(c)
    if created: print(f"  + Contact: {fn} {ln}")
print(f"  Contacts ready: {len(contacts)}")

# Leads
lead_statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
lead_sources = ['website', 'referral', 'cold_call', 'exhibition', 'social_media', 'email']
leads_data = [
    ('Arjun', 'Verma', 'arjun.verma@prospect1.com', '9822001001', 'Prospect Motors', 'Sales Manager', 'new', 'high', 250000),
    ('Meena', 'Joshi', 'meena.joshi@prospect2.com', '9822001002', 'Joshi Auto Works', 'Owner', 'contacted', 'medium', 180000),
    ('Ravi', 'Shankar', 'ravi.s@prospect3.com', '9822001003', 'Shankar Bikes', 'Director', 'qualified', 'high', 420000),
    ('Pooja', 'Gupta', 'pooja.g@prospect4.com', '9822001004', 'Gupta Enterprises', 'Purchase Head', 'proposal', 'high', 650000),
    ('Sanjay', 'Mishra', 'sanjay.m@prospect5.com', '9822001005', 'Mishra Auto', 'MD', 'negotiation', 'medium', 380000),
    ('Anita', 'Rao', 'anita.rao@prospect6.com', '9822001006', 'Rao Motors', 'GM', 'won', 'high', 520000),
    ('Kiran', 'Bose', 'kiran.b@prospect7.com', '9822001007', 'Bose Bikes', 'Owner', 'lost', 'low', 120000),
    ('Deepak', 'Nair', 'deepak.n@prospect8.com', '9822001008', 'Nair Auto', 'Director', 'new', 'medium', 290000),
    ('Swati', 'Patil', 'swati.p@prospect9.com', '9822001009', 'Patil Motors', 'Sales Head', 'contacted', 'high', 480000),
    ('Rohit', 'Sinha', 'rohit.s@prospect10.com', '9822001010', 'Sinha Enterprises', 'Owner', 'qualified', 'medium', 340000),
]
leads = []
for i, (fn, ln, email, phone, company_name, title, status, priority, value) in enumerate(leads_data):
    l, created = Lead.objects.get_or_create(company=company, email=email, defaults={
        'lead_id': f'LEAD{1000+i:04d}', 'first_name': fn, 'last_name': ln,
        'phone': phone, 'company_name': company_name, 'job_title': title,
        'status': status, 'priority': priority, 'source': random.choice(lead_sources),
        'estimated_value': Decimal(str(value)), 'expected_close_date': today + timedelta(days=random.randint(15, 90)),
        'created_by': admin_user})
    leads.append(l)
    if created: print(f"  + Lead: {fn} {ln}")
print(f"  Leads ready: {len(leads)}")

# Opportunities
opp_stages = ['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
opps = []
for i, account in enumerate(accounts[:6]):
    stage = opp_stages[i % len(opp_stages)]
    prob = {'prospecting': 10, 'qualification': 25, 'needs_analysis': 40, 'proposal': 60, 'negotiation': 75, 'closed_won': 100, 'closed_lost': 0}[stage]
    value = random.randint(100000, 2000000)
    o, created = Opportunity.objects.get_or_create(company=company, opportunity_id=f'OPP{1000+i:04d}', defaults={
        'name': f'RE Parts Supply - {account.name}', 'account': account, 'contact': contacts[i] if i < len(contacts) else None,
        'stage': stage, 'amount': Decimal(str(value)), 'probability': prob,
        'expected_close_date': today + timedelta(days=random.randint(15, 120)), 'created_by': admin_user})
    opps.append(o)
    if created: print(f"  + Opportunity: {o.name}")
print(f"  Opportunities ready: {len(opps)}")

# Deals
deal_statuses = ['open', 'open', 'open', 'won', 'lost']
deals = []
for i, (opp, stage) in enumerate(zip(opps[:5], stages[:5])):
    d, created = Deal.objects.get_or_create(company=company, deal_id=f'DEAL{1000+i:04d}', defaults={
        'name': f'Deal - {opp.account.name}', 'account': opp.account, 'contact': contacts[i] if i < len(contacts) else None,
        'opportunity': opp, 'current_stage': stage, 'status': deal_statuses[i % len(deal_statuses)],
        'value': opp.amount, 'probability': opp.probability, 'expected_close_date': opp.expected_close_date, 'created_by': admin_user})
    deals.append(d)
    if created: print(f"  + Deal: {d.name}")
print(f"  Deals ready: {len(deals)}")

# Activities
activity_types = ['call', 'email', 'meeting', 'demo', 'follow_up']
activity_statuses = ['completed', 'completed', 'completed', 'pending', 'overdue']
act_count = 0
for i in range(15):
    atype = random.choice(activity_types)
    astatus = activity_statuses[i % len(activity_statuses)]
    due = today - timedelta(days=random.randint(1, 60)) if astatus in ['completed', 'overdue'] else today + timedelta(days=random.randint(1, 14))
    a, created = Activity.objects.get_or_create(company=company, activity_id=f'ACT{1000+i:04d}', defaults={
        'subject': f'{atype.title()} with {contacts[i % len(contacts)].first_name}', 'activity_type': atype,
        'status': astatus, 'due_date': due, 'duration_minutes': random.choice([30, 45, 60, 90]),
        'lead': leads[i % len(leads)] if atype in ['call', 'email'] else None,
        'contact': contacts[i % len(contacts)], 'account': accounts[i % len(accounts)],
        'created_by': admin_user, 'assigned_to': admin_user, 'completed_at': due if astatus == 'completed' else None,
        'outcome': 'Positive response, follow-up scheduled' if astatus == 'completed' else ''})
    if created: act_count += 1
print(f"  Activities created: {act_count}")

# Campaigns
campaigns_data = [
    ('RE Classic 350 Launch', 'email', 'active', today-timedelta(days=30), today+timedelta(days=30), 500000, 45, 12),
    ('Himalayan Adventure Campaign', 'social_media', 'active', today-timedelta(days=60), today+timedelta(days=60), 800000, 78, 22),
    ('Meteor 350 Awareness', 'digital', 'completed', today-timedelta(days=90), today-timedelta(days=30), 350000, 120, 35),
    ('RE Accessories Promo', 'email', 'active', today-timedelta(days=15), today+timedelta(days=45), 200000, 32, 8),
    ('Dealer Network Expansion', 'direct_mail', 'draft', today+timedelta(days=15), today+timedelta(days=75), 600000, 0, 0),
    ('Service Camp Drive', 'event', 'completed', today-timedelta(days=45), today-timedelta(days=15), 150000, 95, 28),
]
campaigns = []
for i, (name, ctype, status, start, end, budget, leads_gen, opps_created) in enumerate(campaigns_data):
    c, created = Campaign.objects.get_or_create(company=company, name=name, defaults={
        'campaign_id': f'CAMP{1000+i:04d}', 'campaign_type': ctype, 'status': status,
        'start_date': start, 'end_date': end, 'budget': Decimal(str(budget)),
        'leads_generated': leads_gen, 'opportunities_created': opps_created,
        'revenue_generated': Decimal(str(opps_created * random.randint(50000, 200000))),
        'target_audience': 'Motorcycle dealers and enthusiasts', 'created_by': admin_user})
    campaigns.append(c)
    if created: print(f"  + Campaign: {name}")
print(f"  Campaigns ready: {len(campaigns)}")

# Sales Analytics
analytics_count = 0
metric_types = ['revenue', 'leads', 'opportunities', 'deals_won', 'conversion_rate']
for metric in metric_types:
    for month_offset in range(12):
        d = today.replace(day=1) - timedelta(days=month_offset * 30)
        d = d.replace(day=1)
        base_values = {'revenue': random.randint(800000, 3500000), 'leads': random.randint(15, 60),
                       'opportunities': random.randint(5, 25), 'deals_won': random.randint(2, 12), 'conversion_rate': random.randint(15, 45)}
        sa, created = SalesAnalytics.objects.get_or_create(company=company, metric_type=metric, period='monthly', date=d, defaults={
            'year': d.year, 'month': d.month, 'value': Decimal(str(base_values[metric])),
            'count': base_values['leads'] if metric == 'leads' else base_values['deals_won']})
        if created: analytics_count += 1
print(f"  Sales Analytics created: {analytics_count}")

# Sales Targets
target_count = 0
for month_offset in range(6):
    d = today.replace(day=1) - timedelta(days=month_offset * 30)
    d = d.replace(day=1)
    t, created = SalesTarget.objects.get_or_create(company=company, user=admin_user, period='monthly', year=d.year, month=d.month, defaults={
        'target_amount': Decimal(str(random.randint(2000000, 5000000))),
        'achieved_amount': Decimal(str(random.randint(1500000, 4500000))), 'created_by': admin_user})
    if created: target_count += 1
print(f"  Sales Targets created: {target_count}")

# Customer Interactions
int_count = 0
int_types = ['call', 'email', 'meeting', 'support', 'demo']
for i in range(10):
    days_ago = random.randint(1, 90)
    ci, created = CustomerInteraction.objects.get_or_create(company=company, interaction_id=f'INT{1000+i:04d}', defaults={
        'contact': contacts[i % len(contacts)], 'account': accounts[i % len(accounts)],
        'interaction_type': random.choice(int_types),
        'subject': f'Follow-up with {contacts[i % len(contacts)].first_name}',
        'description': 'Discussed product requirements and pricing.', 'outcome': 'Positive - will send proposal',
        'interaction_date': today - timedelta(days=days_ago), 'duration_minutes': random.choice([15, 30, 45, 60]),
        'created_by': admin_user})
    if created: int_count += 1
print(f"  Customer Interactions created: {int_count}")

print("\n✅ Phase 4 CRM complete.")
