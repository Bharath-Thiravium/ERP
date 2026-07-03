# CRM Module — User Manual
### iTechFlow CRM System

---

## CRM Status Overview

| Menu | Status | Demo Ready |
|---|---|---|
| Leads | ✅ Full | ✅ Yes |
| Opportunities | ✅ Full | ✅ Yes |
| Sales Pipeline | ✅ Full | ✅ Yes |
| Accounts | ✅ Full | ✅ Yes |
| Contacts | ✅ Full | ✅ Yes |
| Activities | ✅ Full | ✅ Yes |
| Campaigns | ✅ Full | ✅ Yes |
| Marketing Automation | ✅ Full | ✅ Yes |
| AI Lead Scoring | ✅ Full | ✅ Yes |
| Customer Analytics | ✅ Full | ✅ Yes |
| Customer Support | ✅ Full | ✅ Yes |
| Advanced Reporting | ✅ Full | ✅ Yes |
| Integrations | ⚠️ Framework Only | ⚠️ Partial |
| Security & Compliance | ✅ Full | ✅ Yes |
| Settings | ✅ Full | ✅ Yes |

---

## WORKFLOW — எங்கிருந்து ஆரம்பிக்கணும்?

```
Lead Create → Qualify → Convert → Opportunity → Deal → Won
     ↓              ↓                               ↓
  Contact        Activity                      Account Created
  Created         Log                          Invoice (future)
```

---

## 1. LEADS — புதிய வாடிக்கையாளர் வரும் போது

### என்னத்துக்கு use ஆகும்?
யாராவது உன் product-ல interest காட்டினா — அவங்க details இங்கே add பண்றோம்.

### Workflow:
1. **Lead Create** → Name, Email, Phone, Company, Source (website/referral/cold call)
2. **Status track பண்ணு** → New → Contacted → Qualified → Proposal → Won/Lost
3. **Convert பண்ணு** → Won status-ல "Convert" button → Contact + Account + Opportunity automatically create ஆகும்

### Demo Steps:
```
1. Leads menu → "Add Lead" click
2. Fill: Name=Rajesh Kumar, Company=ABC Pvt Ltd, Phone=9876543210, Source=Website
3. Save → Status "New" ஆ இருக்கும்
4. Edit → Status "Contacted" மாத்து → Save
5. Edit → Status "Qualified" மாத்து → Save
6. "Convert" button click → Opportunity create ஆகும்
7. Lead status "Won" ஆகும், Edit button மறையும்
```

### Key Rules:
- Won lead → Edit/Convert button hide ஆகும்
- Lead delete பண்ணா → linked Contact, Account, Opportunity எல்லாம் delete ஆகும்
- Contact/Account/Opportunity-ஐ தனியா delete பண்ண முடியாது (lead-இல் இருந்து வந்தது)

---

## 2. CONTACTS — Individual நபர்கள்

### என்னத்துக்கு use ஆகும்?
ஒவ்வொரு company-லயும் யாரோட பேசுறோம்னு track பண்ண.

### Demo Steps:
```
1. Contacts menu → "Add Contact" click
2. Fill: First Name, Last Name, Email, Phone, Account (company select)
3. Save → Contact list-ல show ஆகும்
4. Contact card click → Activities, Opportunities linked பார்க்கலாம்
```

### Key Rules:
- Lead convert ஆனா automatically contact create ஆகும்
- Manually create பண்ணின contact-ஐ delete பண்ணலாம்
- Lead-இல் இருந்து வந்த contact delete பண்ண → "Delete the lead instead" message வரும்

---

## 3. ACCOUNTS — Companies/Organizations

### என்னத்துக்கு use ஆகும்?
உன் clients-ஓட company details manage பண்ண.

### Demo Steps:
```
1. Accounts menu → "Add Account" click
2. Fill: Company Name, Industry, Website, Phone, Address
3. Save → Account list-ல show ஆகும்
4. Account-ல click → linked Contacts, Opportunities பார்க்கலாம்
```

---

## 4. OPPORTUNITIES — Deal progress track பண்ண

### என்னத்துக்கு use ஆகும்?
Lead qualify ஆனப்புறம் — actual deal எவ்வளவு value, எந்த stage-ல இருக்குன்னு track பண்ண.

### Demo Steps:
```
1. Lead convert பண்ணா automatically create ஆகும்
   (அல்லது) Opportunities → "Add Opportunity" click
2. Fill: Name, Account, Value (₹), Stage, Close Date
3. Stage track: Prospecting → Qualification → Proposal → Negotiation → Closed Won
4. Won ஆனா → Sales Pipeline-ல Deal ஆகும்
```

### Stages:
| Stage | என்னன்னா |
|---|---|
| Prospecting | Initial interest |
| Qualification | Budget/need confirm |
| Proposal | Quote அனுப்பினோம் |
| Negotiation | Price discuss பண்றோம் |
| Closed Won | Deal confirm ✅ |
| Closed Lost | Deal போச்சு ❌ |

---

## 5. SALES PIPELINE — Deal board view

### என்னத்துக்கு use ஆகும்?
எல்லா deals-ஐயும் Kanban board-ல visual-ஆ பார்க்க + drag & drop பண்ண.

### Demo Steps:
```
1. Sales Pipeline menu click
2. Deals columns-ல show ஆகும் (stage-wise)
3. Deal card → drag பண்ணி next stage-க்கு move பண்ணு
4. Top-ல Pipeline Overview, Velocity Metrics பார்க்கலாம்
```

---

## 6. ACTIVITIES — Follow-up, Calls, Meetings track

### என்னத்துக்கு use ஆகும்?
Sales team என்ன பண்றாங்கன்னு daily track பண்ண — calls, meetings, emails, tasks.

### Demo Steps:
```
1. Activities menu → "Add Activity" click
2. Fill: Type (call/meeting/email/task), Title, Due Date, Lead/Contact link
3. Save → Activity list-ல show ஆகும்
4. Complete பண்ணா → status "completed" ஆகும்
```

### Activity Types:
- 📞 Call — Phone call log
- 🤝 Meeting — Meeting schedule
- 📧 Email — Email sent log
- ✅ Task — To-do item

---

## 7. AI LEAD SCORING — எந்த lead hot-ஆ இருக்குன்னு AI சொல்லும்

### என்னத்துக்கு use ஆகும்?
100 leads இருந்தா — எந்த 10 leads-ஐ முதல்ல contact பண்ணணும்னு AI decide பண்ணும்.

### Demo Steps:
```
1. AI Lead Scoring menu click
2. "Calculate AI Score" button click
3. Leads score-ஓட list ஆகும் (0-100)
4. High score = Hot lead → முதல்ல follow up பண்ணு
```

### Score Factors:
- Email provided → +points
- Phone provided → +points
- Company provided → +points
- Website source → +points
- Recent activity → +points

---

## 8. CAMPAIGNS — Email/SMS campaigns

### என்னத்துக்கு use ஆகும்?
Multiple leads/contacts-க்கு ஒரே நேரத்தில் promotional message அனுப்ப.

### Demo Steps:
```
1. Campaigns menu → "Create Campaign" click
2. Fill: Name, Type (email/sms), Target audience, Start/End date
3. Save → Campaign list-ல show ஆகும்
4. "Launch" button → Campaign active ஆகும்
5. Stats: Sent, Opened, Clicked track ஆகும்
```

---

## 9. MARKETING AUTOMATION — Campaigns + Templates + Workflows

### என்னத்துக்கு use ஆகும்?
Email campaigns manage பண்ண, HTML templates design பண்ண, automatic workflows set பண்ண — ஒரே இடத்தில். இந்த menu-ல 4 tabs இருக்கு: Email Campaigns, Templates, Automation, Analytics.

---

### TAB 1: Email Campaigns

**Campaign Types:**
| Type | Use Case |
|---|---|
| Email Blast | ஒரே நேரத்தில் எல்லாருக்கும் same mail |
| Drip Campaign | Day 1, Day 3, Day 7 — sequence-ஆ mail |
| Lead Nurture | Qualified leads-க்கு educate பண்ண |
| Event Promotion | Webinar/event invite |
| Product Launch | New product announce |
| Re-engagement | Inactive customers-ஐ திரும்ப contact பண்ண |

**Status Flow:**
```
Draft → Running (Launch) → Paused → Running (Resume) → Completed
```

**Metrics tracked per campaign:**
- Total Sent, Delivered, Opened, Clicked
- Open Rate %, Click Rate %, Bounce Rate %

**Demo Steps:**
```
1. Marketing Automation → "New Campaign" click
2. Fill: Name=Diwali Offer, Type=Email Blast, Status=Draft
3. Save → Card show ஆகும்
4. "Launch" button → Status "Running" ஆகும்
5. "Pause" button → Status "Paused" ஆகும்
6. "Complete" button → Status "Completed" ஆகும்
```

---

### TAB 2: Email Templates (HTML)

**என்னத்துக்கு:** Email-ல அனுப்ப HTML design ready-ஆ வைக்க — campaigns-ல reuse பண்ணலாம்.

**Template Types:**
| Type | Use Case |
|---|---|
| Welcome Email | New customer register ஆனா |
| Follow Up | Lead contact பண்ணிட்டோம், reply இல்லை |
| Newsletter | Monthly updates |
| Promotional | Offer/discount |
| Lead Nurture | Interest காட்டினவங்களுக்கு |
| Event Invitation | Event invite |
| Survey | Feedback கேக்க |
| Custom | Any purpose |

**HTML Content field — ஏன்?**
Email-ல colors, buttons, images, logo எல்லாம் HTML-ல design பண்ணி அனுப்பலாம்.

**Demo HTML example:**
```html
<h2 style="color:#f97316">Special Offer!</h2>
<p>Dear Customer, get 20% off today!</p>
<a href="#" style="background:#f97316;color:white;padding:10px 20px;
   text-decoration:none;border-radius:5px">Claim Offer</a>
```

**Demo Steps:**
```
1. "New Template" click
2. Name=Welcome Email, Type=Welcome Email
3. Subject=Welcome to iTechFlow!
4. HTML Content → above HTML paste பண்ணு
5. Save → Template card show ஆகும்
6. "Preview" button → HTML render ஆகுதுன்னு பார்க்கலாம்
7. "Edit" button → modify பண்ணலாம்
```

---

### TAB 3: Automation Workflows

**என்னத்துக்கு:** "இந்த event நடந்தா → automatically இந்த action பண்ணு" rules set பண்ண.

**Trigger Types (எப்போ start ஆகும்):**
| Trigger | என்னன்னா |
|---|---|
| Lead Created | புதுசா lead add ஆனா |
| Lead Status Change | New → Qualified ஆனா |
| Deal Stage Change | Proposal → Negotiation ஆனா |
| Email Opened | Customer mail open பண்ணா |
| Email Clicked | Mail-ல link click பண்ணா |
| Form Submitted | Website form fill பண்ணா |
| Date Based | Specific date-ல (birthday, anniversary) |
| Score Threshold | Lead score 70+ ஆனா |

**Demo Steps:**
```
1. "New Workflow" click
2. Name=Welcome New Lead, Trigger=Lead Created
3. Save → Status "Draft"
4. "Activate" → Status "Active" ஆகும்
5. Stats: Triggered count, Completed count, Success Rate % track ஆகும்
```

---

### TAB 4: Analytics

Campaign + Workflow performance summary:
- Total Campaigns, Active Campaigns, Total Emails Sent, Total Opens
- Total Workflows, Active Workflows, Total Executions, Success Rate %

---

### Real-ஆ Work ஆகுது vs இல்லை:

| Feature | Status |
|---|---|
| Template create/edit/preview | ✅ Works |
| Campaign create/launch/pause/complete | ✅ Works |
| Workflow create/activate/pause | ✅ Works |
| Analytics stats display | ✅ Works |
| Real HTML email send | ❌ Future (Gmail config வேணும்) |
| Workflow auto-trigger on events | ❌ Future (Celery/signals வேணும்) |

> ⚠️ Client-க்கு சொல்லணும்: Campaign structure, templates, workflows எல்லாம் ready. Real email sending next phase-ல Gmail configure பண்ணி implement ஆகும்.

---

## 10. CUSTOMER ANALYTICS — Health scores & segments

### என்னத்துக்கு use ஆகும்?
Existing customers எவ்வளவு satisfied-ஆ இருக்காங்கன்னு score பண்ணி, at-risk customers-ஐ identify பண்ண.

### Demo Steps:
```
1. Customer Analytics menu
2. "Calculate Health Scores" button click
3. Accounts health score-ஓட list ஆகும்
4. At-Risk Accounts tab → score குறைஞ்ச customers பார்க்கலாம்
5. Segments tab → customers group பண்ணலாம் (VIP, Regular, At-Risk)
```

---

## 11. CUSTOMER SUPPORT — Tickets manage பண்ண

### என்னத்துக்கு use ஆகும்?
Customer complaint/request வந்தா ticket create பண்ணி, resolve ஆகும் வரை track பண்ண.

### Demo Steps:
```
1. Customer Support menu → "Create Ticket" click
2. Fill: Title, Description, Priority (low/medium/high/critical), Customer
3. Save → Ticket list-ல show ஆகும்
4. Assign to team member
5. Resolve → status "resolved" ஆகும்
```

### Priority Levels:
| Priority | Use Case |
|---|---|
| Low | General query |
| Medium | Product issue |
| High | Service down |
| Critical | Data loss / urgent |

---

## 12. ADVANCED REPORTING — Charts & Reports

### என்னத்துக்கு use ஆகும்?
Business performance-ஐ charts-ஓட visual-ஆ பார்க்க + export பண்ண.

### Demo Steps:
```
1. Advanced Reporting menu
2. "New Report" click → Name, Type, Chart Type select → Create
3. Report card-ல "Generate" click → Chart show ஆகும்
4. "Export" click → CSV download ஆகும்
5. "Generate Insights" button → AI automatic insights create ஆகும்
6. Business Intelligence tab → insights cards பார்க்கலாம்
```

### Report Types:
| Type | என்ன show ஆகும் |
|---|---|
| Lead Analytics | Lead source, status breakdown |
| Sales Performance | Revenue, deals won/lost |
| Pipeline Forecast | Stage-wise deal value |
| Activity Report | Team activity summary |
| Customer Health | Health score distribution |

### Chart Types:
- Bar Chart, Line Chart, Area Chart
- Pie Chart, Radar Chart, Funnel Chart
- Table View, Metric Cards

---

## 13. INTEGRATIONS — External tools connect

### என்னத்துக்கு use ஆகும்?
Gmail, Razorpay, Tally போன்ற tools-ஐ CRM-உடன் connect பண்ண (framework ready, real API future work).

### Demo Steps:
```
1. Integrations menu → "Add Integration" click
2. Fill: Name, Type, Provider, Status=Active
3. Create → Card show ஆகும்
4. "Test" button → Connection test (simulated) → Active ஆகும்
5. "Sync" button → Data sync (simulated) → Log create ஆகும்
6. Dashboard-ல Total, Active, Errors, Recent Logs count பார்க்கலாம்
```

> ⚠️ Client-க்கு சொல்லணும்: Real Gmail/Razorpay connection future phase-ல implement ஆகும்.

---

## 14. SECURITY & COMPLIANCE — Data security monitor

### என்னத்துக்கு use ஆகும்?
யாரு என்ன data access பண்ணாங்கன்னு audit, security alerts, compliance rules manage பண்ண.

### Demo Steps:
```
1. Security & Compliance menu
2. Security Alerts tab → active alerts பார்க்கலாம், resolve பண்ணலாம்
3. Compliance Rules tab → rules create பண்ணலாம், check violations பண்ணலாம்
4. Audit Logs tab → எல்லா user actions log ஆகும்
5. Data Retention tab → data எவ்வளவு நாள் keep பண்றதுன்னு policy set பண்ணலாம்
```

---

## 15. SETTINGS — Profile & Company settings

### Demo Steps:
```
1. Settings menu
2. Profile tab → Name, Email update பண்ணலாம்
3. Password tab → Password change பண்ணலாம்
4. Company tab → Company details update பண்ணலாம்
5. Notifications tab → Alert preferences set பண்ணலாம்
```

---

## DEMO SCRIPT — Client-க்கு காட்ட (15 minutes)

### Step 1 — Lead to Deal flow (5 min)
```
1. Lead create பண்ணு (Rajesh Kumar, ABC Pvt Ltd)
2. Status New → Contacted → Qualified மாத்து
3. Convert பண்ணு → Contact + Account + Opportunity create ஆகுதுன்னு காட்டு
4. Opportunity-ல value add பண்ணு (₹5,00,000)
5. Sales Pipeline-ல deal show ஆகுதுன்னு காட்டு
```

### Step 2 — Activity & Follow-up (2 min)
```
1. Activity add பண்ணு (Call with Rajesh - tomorrow)
2. Activities list-ல show ஆகுதுன்னு காட்டு
```

### Step 3 — AI Lead Scoring (2 min)
```
1. AI Lead Scoring → Calculate Score
2. Leads score-ஓட show ஆகுதுன்னு காட்டு
```

### Step 4 — Reporting (3 min)
```
1. New Report create (Lead Analytics, Bar Chart)
2. Generate → Chart show ஆகுதுன்னு காட்டு
3. Export → CSV download ஆகுதுன்னு காட்டு
```

### Step 5 — Support Ticket (2 min)
```
1. Customer Support → Create Ticket
2. Priority High, assign பண்ணு
3. Resolve பண்ணு
```

### Step 6 — Integration (1 min)
```
1. Integration add பண்ணு (Gmail)
2. Test → Active ஆகுதுன்னு காட்டு
3. "Real connection future phase-ல" சொல்லு
```

---

## WHAT IS FULLY READY ✅

- Lead management + conversion flow
- Contact & Account management
- Opportunity tracking
- Sales Pipeline (Kanban)
- Activity logging
- Campaign management
- AI Lead Scoring
- Customer Analytics & Health Scores
- Customer Support Tickets
- Advanced Reporting (6 chart types + CSV export)
- Security & Compliance audit
- Integration framework

## WHAT IS FUTURE WORK ⚠️

- Real Gmail/Outlook email integration
- Real Razorpay/Stripe payment webhook
- Real Tally/QuickBooks accounting sync
- Scheduled Reports (coming soon tab)
- Mobile app sync (framework ready)
- WhatsApp/SMS integration

---

*Document prepared for iTechFlow CRM Module — Version 1.0*
