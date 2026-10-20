import os
import pymupdf

# Target directories
dirs = [
    r"c:\Users\SYLVIA TOM\.gemini\antigravity-ide\scratch\insure-os\working_docs",
    r"C:\Users\SYLVIA TOM\Downloads"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)

# -------------------------------------------------------------
# Document 1: 01_Aegis_Auto_Policy_Schedule.pdf
# -------------------------------------------------------------
doc1 = pymupdf.open()
page1 = doc1.new_page(width=612, height=792)

p1_content = """AEGIS SHIELD MUTUAL INSURANCE COMPANY
PERSONAL AUTO INSURANCE POLICY SCHEDULE & DECLARATIONS
POLICY NUMBER: POL-AEGIS-2026-9844
EFFECTIVE DATES: January 1, 2026 to January 1, 2027

NAMED INSURED & MAILING ADDRESS:
Jordan Lee
742 Evergreen Terrace, Springfield
Contact Phone: (555) 019-2834 | Email: jordan.lee@example.com

INSURED VEHICLE SCHEDULE:
Vehicle 1: 2023 Tesla Model Y Long Range
VIN: 7SAYGDEE8PF12984 | License Plate: DEMO-4821 | Usage: Personal Pleasure / Commute

COVERAGE SECTION & DEDUCTIBLE BREAKDOWN:
1. Collision Damage Coverage:
   - Contractual Deductible: $500 per occurrence.
   - Limit of Liability: $50,000 per covered accident.
   - Scope: Accidental direct physical damage to insured vehicle caused by impact with another vehicle, object, or rollover.

2. Comprehensive (Other Than Collision):
   - Contractual Deductible: $250 per occurrence.
   - Limit of Liability: Actual Cash Value up to $50,000.
   - Scope: Theft, vandalism, fire, weather, falling objects, and animal strike.

3. Dedicated Glass & Windshield Endorsement (Rider G-102):
   - Contractual Deductible: $0.00 (Zero deductible waiver applies to windshield repair or OEM glass replacement).

4. Bodily Injury Liability:
   - $250,000 per person / $500,000 per accident.

5. Property Damage Liability:
   - $100,000 per accident.

EXCLUSIONS & LIMITATIONS:
Section 5.1: Intentional acts by the policyholder or unauthorized drivers.
Section 5.2: Operating the vehicle for unlisted commercial rideshare, delivery dispatch, or competitive track racing without prior commercial endorsement.
Section 5.3: Mechanical breakdown or normal wear and tear not resulting from a direct covered impact.

DISPUTE & ARBITRATION:
Statutory claim response SLA: 5 business days for initial contact; 15 days for formal claim determination."""

# Add styled text to page
rect = pymupdf.Rect(40, 40, 572, 752)
page1.insert_textbox(rect, p1_content, fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.15))

for d in dirs:
    pdf_path = os.path.join(d, "01_Aegis_Auto_Policy_Schedule.pdf")
    txt_path = os.path.join(d, "01_Aegis_Auto_Policy_Schedule.txt")
    doc1.save(pdf_path)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(p1_content)
doc1.close()
print("Document 1 created successfully!")

# -------------------------------------------------------------
# Document 2: 02_Apex_Collision_Repair_Estimate.pdf
# -------------------------------------------------------------
doc2 = pymupdf.open()
page2 = doc2.new_page(width=612, height=792)

p2_content = """APEX CERTIFIED COLLISION & REPAIR CENTER
1024 INDUSTRIAL PARKWAY, SUITE B
PHONE: (555) 774-8890 | BAR LICENSE: #CR-992014

OFFICIAL ITEMIZED DAMAGE APPRAISAL & REPAIR ESTIMATE
ESTIMATE NUMBER: EST-2026-4410
DATE OF ESTIMATE: October 15, 2026
CLAIM REFERENCE: CLM-2026-8812
POLICY NUMBER: POL-AEGIS-2026-9844
CUSTOMER: Jordan Lee
VEHICLE: 2023 Tesla Model Y (Midnight Silver) | ODOMETER: 24,180 MILES

SECTION 1: ITEMIZE REPLACEMENT PARTS:
Line 1: Front Bumper Cover Fascia (OEM Tesla Part #1493770-00-B) ...... $850.00
Line 2: LED Headlamp Assembly, Right Driver Side (OEM #1514392) ......... $1,240.00
Line 3: Radar Sensor Mounting Bracket & Harness ........................ $310.00
Line 4: Radiator Support Lower Crossmember Beam ......................... $440.00
TOTAL OEM REPLACEMENT PARTS: ........................................... $2,840.00

SECTION 2: LABOR OPERATIONS BREAKDOWN:
Line 5: Body & Structural Frame Realignment (12.0 hrs @ $75/hr) .......... $900.00
Line 6: Paint, Basecoat & Clear Finish Multi-Stage (8.0 hrs @ $75/hr) ... $600.00
Line 7: ADAS Camera & Forward Radar Recalibration (2.0 hrs @ $125/hr) .... $250.00
TOTAL LABOR CHARGES: ................................................... $1,750.00

SECTION 3: SETTLEMENT ARITHMETIC SUMMARY:
Gross Repair Appraisal Subtotal: ....................................... $4,590.00
Applicable Sales Tax (0.0%): ........................................... $0.00
TOTAL GROSS CLAIM LOSS: ................................................ $4,590.00
LESS APPLICABLE COLLISION POLICY DEDUCTIBLE: .......................... -$500.00
NET PAYABLE BY INSURER TO REPAIR SHOP: ................................ $4,090.00

CERTIFICATION:
Appraisal conducted by ASE-Certified Master Appraiser David Sterling (ID: #ASE-44021). All parts specified are genuine OEM certified equipment."""

rect2 = pymupdf.Rect(40, 40, 572, 752)
page2.insert_textbox(rect2, p2_content, fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.15))

for d in dirs:
    pdf_path = os.path.join(d, "02_Apex_Collision_Repair_Estimate.pdf")
    txt_path = os.path.join(d, "02_Apex_Collision_Repair_Estimate.txt")
    doc2.save(pdf_path)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(p2_content)
doc2.close()
print("Document 2 created successfully!")

# -------------------------------------------------------------
# Document 3: 03_Official_Police_Accident_Report.pdf
# -------------------------------------------------------------
doc3 = pymupdf.open()
page3 = doc3.new_page(width=612, height=792)

p3_content = """METROPOLITAN POLICE DEPARTMENT — TRAFFIC INVESTIGATION DIVISION
MOTOR VEHICLE ACCIDENT & INCIDENT REPORT
INCIDENT REPORT NUMBER: CAD-2026-88192
DATE OF INCIDENT: October 14, 2026
TIME OF CALL: 16:32 HOURS (4:32 PM)
INCIDENT LOCATION: Intersection of Grand Avenue and 5th Street

INVESTIGATING OFFICER:
Officer Marcus Vance | Badge Number: #714 | Precinct: Central Division 3

INVOLVED VEHICLES & PARTIES:
Vehicle 1 (Insured):
- Driver: Jordan Lee
- Vehicle: 2023 Tesla Model Y (Plate: DEMO-4821)
- Insurance: Aegis Shield Mutual (Policy: POL-AEGIS-2026-9844)
- Travel Direction: Eastbound on Grand Avenue with green signal

Vehicle 2 (At-Fault Party):
- Driver: Robert Hayes (Commercial Van Logistics)
- Vehicle: 2021 Ford Transit Cargo Van (Plate: COMM-9014)
- Insurance: Metro Commercial Express Insurance (Policy: COM-7721)
- Travel Direction: Westbound turning left onto 5th Street

OFFICER NARRATIVE OF OCCURRENCE:
Officer Vance responded to a two-vehicle collision at Grand Avenue and 5th Street. Physical roadway evidence and witness statements confirm Vehicle 1 was traveling eastbound through the intersection under a solid green traffic light. Vehicle 2 attempted an unprotected left turn on a flashing yellow arrow across Vehicle 1's path of travel without yielding right-of-way.

Vehicle 1 attempted collision avoidance braking but was unable to clear Vehicle 2. Vehicle 2's front bumper struck the front-right bumper, headlight, and crossmember of Vehicle 1.

DAMAGES & INJURIES:
- Vehicle 1: Severe front-right collision damage, crushed right headlamp, deployed bumper fascia. Towed from scene by Metro Towing.
- Vehicle 2: Left quarter panel and bumper scrape. Drivable.
- Injuries: No immediate emergency transport required. Drivers complained of minor seatbelt shoulder soreness.

CITATION & FAULT DETERMINATION:
Vehicle 2 driver (Robert Hayes) cited for Failure to Yield Right of Way while turning left (Violation Code: MVC 21801-A). Primary fault assigned to Vehicle 2."""

rect3 = pymupdf.Rect(40, 40, 572, 752)
page3.insert_textbox(rect3, p3_content, fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.15))

for d in dirs:
    pdf_path = os.path.join(d, "03_Official_Police_Accident_Report.pdf")
    txt_path = os.path.join(d, "03_Official_Police_Accident_Report.txt")
    doc3.save(pdf_path)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(p3_content)
doc3.close()
print("Document 3 created successfully!")

# -------------------------------------------------------------
# Document 4: 04_St_Jude_Medical_Billing_Summary.pdf
# -------------------------------------------------------------
doc4 = pymupdf.open()
page4 = doc4.new_page(width=612, height=792)

p4_content = """ST. JUDE REGIONAL TRAUMA & HEALTHCARE CENTER
POST-COLLISION EMERGENCY ROOM BILLING STATEMENT
ACCOUNT NUMBER: MED-2026-55901
PATIENT NAME: Jordan Lee
DATE OF BIRTH: 05/14/1988
DATE OF SERVICE: October 14, 2026
ADMISSION TYPE: Emergency Room Trauma Evaluation
PRIMARY PHYSICIAN: Dr. Aris Thorne, MD (License: #MED-48201)

ITEMIZED MEDICAL SERVICES & CPT CODES:
1. Emergency Department Examination & Workup (CPT Code 99284):
   Comprehensive acute evaluation following motor vehicle accident.
   Charge: ............................................................. $850.00

2. Cervical Spine 3-View Diagnostic Radiography / X-Ray (CPT Code 72040):
   Rule out cervical vertebrae fracture or severe whiplash displacement.
   Result: Negative for acute bone fracture; soft tissue strain observed.
   Charge: ............................................................. $420.00

3. Attending Physician Specialized Medical Assessment (CPT Code 99232):
   Orthopedic examination, prescription pain management regimen.
   Charge: ............................................................. $330.00

TOTAL BILLABLE MEDICAL EXPENSES: ....................................... $1,600.00
PATIENT CO-PAY RESPONSIBILITY: ......................................... $0.00
TOTAL CLAIMED MEDICAL LIABILITY: ....................................... $1,600.00

CLINICAL RECOMMENDATION:
Patient discharged with instructions for 5 days of rest, conservative neck physical therapy, and follow-up appointment if discomfort persists."""

rect4 = pymupdf.Rect(40, 40, 572, 752)
page4.insert_textbox(rect4, p4_content, fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.15))

for d in dirs:
    pdf_path = os.path.join(d, "04_St_Jude_Medical_Billing_Summary.pdf")
    txt_path = os.path.join(d, "04_St_Jude_Medical_Billing_Summary.txt")
    doc4.save(pdf_path)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(p4_content)
doc4.close()
print("Document 4 created successfully!")
