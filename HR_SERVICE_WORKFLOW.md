# 🏢 HR Service Board - Complete Workflow Guide

## 🎯 **Current Issues & Solutions**

### **Issues Identified:**
1. ❌ **401 Unauthorized** - Session authentication not working
2. ❌ **404 Media files** - Employee photos not loading  
3. ❌ **Loading continuously** - API calls failing
4. ❌ **Live dashboard not loading** - Missing data

### **Root Cause:**
- Frontend using JWT tokens but HR service uses session-based authentication
- Missing session key in API requests
- No sample data for testing

## 🔧 **Quick Fix (3 Steps)**

### **Step 1: Fix Backend Data**
```bash
cd backend
python ../fix-hr-service.py
```

### **Step 2: Start Services**
```bash
# Terminal 1: Backend
cd backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Frontend  
cd frontend
npm run dev
```

### **Step 3: Test HR Service**
1. Go to `http://localhost:3000`
2. Login as service user (HR credentials)
3. Navigate to HR service board
4. Check all menus work properly

## 📋 **HR Service Board Workflow**

### **1. Authentication Flow**
```
User Login → Service User Login → Session Key → API Requests
```

**Login Process:**
1. User enters service credentials
2. Backend creates session key
3. Frontend stores session key
4. All HR API requests use session key

### **2. HR Dashboard Structure**
```
HR Service Board
├── Dashboard (Overview)
├── Employees (Management)
├── Departments (Organization)
├── Attendance (Tracking)
├── Payroll (Salary Management)
├── Leave (Leave Management)
├── Performance (Reviews)
├── Compliance (ESI/EPFO)
└── Reports (Analytics)
```

### **3. Main Features**

#### **📊 Dashboard**
- Employee statistics
- Today's attendance
- Pending approvals
- Recent activities
- Quick actions

#### **👥 Employee Management**
- Add/Edit/Delete employees
- Employee profiles
- Document management
- Photo uploads
- Bulk operations

#### **🏢 Department Management**
- Create departments
- Assign employees
- Department hierarchy
- Reporting structure

#### **⏰ Attendance Tracking**
- Live attendance dashboard
- Manual attendance marking
- Attendance history
- GPS tracking (mobile)
- Biometric integration

#### **💰 Payroll Management**
- Salary structures
- Monthly payroll processing
- Salary slips
- Tax calculations
- Bank transfers

#### **🏖️ Leave Management**
- Leave applications
- Approval workflow
- Leave balances
- Leave policies
- Calendar integration

#### **📈 Performance Management**
- Performance reviews
- Goal setting
- Appraisals
- Feedback system
- Analytics

#### **📋 Compliance**
- ESI contributions
- EPFO contributions
- Tax compliance
- Statutory reports
- Government filings

## 🔄 **API Workflow**

### **Authentication APIs**
```
POST /api/auth/service-user/login/
POST /api/auth/service-user/logout/
POST /api/auth/service-user/change-password/
```

### **HR APIs**
```
GET  /api/hr/dashboard/stats/
GET  /api/hr/employees/
POST /api/hr/employees/
GET  /api/hr/departments/
GET  /api/hr/attendance/
GET  /api/hr/live-attendance/live_dashboard/
```

### **Request Format**
```javascript
// All HR API requests include session key
headers: {
  'Authorization': 'Bearer <session_key>',
  'Content-Type': 'application/json'
}
```

## 🎮 **User Interface Flow**

### **1. Login Screen**
```
Service User Login
├── Username (service user)
├── Password
├── Service Type (HR)
└── Login Button
```

### **2. HR Dashboard**
```
HR Service Board
├── Header (Company info, User profile)
├── Sidebar (Navigation menu)
├── Main Content (Dashboard widgets)
└── Footer (System info)
```

### **3. Employee Management**
```
Employee List
├── Search & Filters
├── Add Employee Button
├── Employee Cards/Table
├── Bulk Actions
└── Pagination
```

### **4. Live Attendance**
```
Live Dashboard
├── Real-time Stats
├── Attendance Methods Filter
├── Employee Status Cards
├── Location Tracking
└── Auto-refresh
```

## 🔍 **Debugging Guide**

### **Common Issues & Solutions**

#### **401 Unauthorized**
```bash
# Check session key in localStorage
console.log(localStorage.getItem('service_session_key'))

# Verify service user login
curl -X POST http://localhost:8000/api/auth/service-user/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"hr_user","password":"password","service_type":"hr"}'
```

#### **404 Media Files**
```bash
# Check media files exist
ls backend/media/employee_photos/

# Verify media URL in settings
python manage.py shell
>>> from django.conf import settings
>>> print(settings.MEDIA_URL)
>>> print(settings.MEDIA_ROOT)
```

#### **Loading Issues**
```bash
# Check backend logs
python manage.py runserver --verbosity=2

# Check frontend console
# Open browser dev tools → Console tab
```

### **API Testing**
```bash
# Test HR API with session key
curl -X GET http://localhost:8000/api/hr/employees/ \
  -H "Authorization: Bearer <session_key>"

# Test live dashboard
curl -X GET http://localhost:8000/api/hr/live-attendance/live_dashboard/ \
  -H "Authorization: Bearer <session_key>"
```

## 📊 **Data Flow**

### **Employee Data Flow**
```
Database → Django Models → Serializers → API Response → Frontend Store → UI Components
```

### **Attendance Data Flow**
```
Mobile App → GPS/Photo → API → Database → Live Dashboard → Real-time Updates
```

### **Session Management**
```
Login → Session Creation → Session Key → API Requests → Session Validation → Response
```

## 🎯 **Testing Checklist**

### **✅ Authentication**
- [ ] Service user login works
- [ ] Session key stored correctly
- [ ] API requests include session key
- [ ] Logout clears session

### **✅ Employee Management**
- [ ] Employee list loads
- [ ] Add employee works
- [ ] Edit employee works
- [ ] Delete employee works
- [ ] Photos display correctly

### **✅ Attendance**
- [ ] Live dashboard loads
- [ ] Attendance stats correct
- [ ] Real-time updates work
- [ ] Method filtering works

### **✅ Navigation**
- [ ] All menu items work
- [ ] No 401/404 errors
- [ ] Loading states work
- [ ] Error handling works

## 🚀 **Next Steps**

1. **Run the fix script**: `python fix-hr-service.py`
2. **Start services**: Backend + Frontend
3. **Test all features**: Login → Navigate → Test APIs
4. **Verify data**: Check employees, attendance, dashboard
5. **Mobile integration**: Connect mobile app to HR service

**Your HR Service Board will be fully functional! 🎉**