"""
Script to fix existing attendance records with incorrect timezone
Run this ONLY if you want to correct old attendance data
"""
from django.utils import timezone
from datetime import datetime
from .models import Attendance

def fix_existing_attendance_times():
    """Fix timezone issues in existing attendance records"""
    
    # Get all attendance records that might have timezone issues
    attendance_records = Attendance.objects.filter(
        check_in_time__isnull=False
    )
    
    fixed_count = 0
    
    for attendance in attendance_records:
        updated = False
        
        # Fix check-in time if it looks wrong (like 2:30 PM instead of 9:00 AM)
        if attendance.check_in_time:
            # If time seems to be in wrong timezone, adjust it
            local_time = timezone.localtime(attendance.check_in_time)
            
            # Example: If it shows 2:30 PM but should be 9:00 AM
            # You'll need to manually identify the pattern and fix
            # This is just an example - adjust based on your data
            
            if local_time.hour >= 14:  # If showing afternoon when it should be morning
                # Subtract the timezone offset (example: UTC+5:30 = 5.5 hours)
                corrected_time = attendance.check_in_time.replace(
                    hour=9, minute=0, second=0  # Set to 9:00 AM
                )
                attendance.check_in_time = corrected_time
                updated = True
        
        # Fix check-out time similarly
        if attendance.check_out_time:
            local_time = timezone.localtime(attendance.check_out_time)
            
            if local_time.hour <= 12:  # If showing morning when it should be evening
                corrected_time = attendance.check_out_time.replace(
                    hour=18, minute=0, second=0  # Set to 6:00 PM
                )
                attendance.check_out_time = corrected_time
                updated = True
        
        if updated:
            # Recalculate hours with fixed times
            attendance.calculate_hours()
            attendance.save()
            fixed_count += 1
    
    return fixed_count

# To run this script:
# python manage.py shell
# from hr.fix_attendance_times import fix_existing_attendance_times
# fixed_count = fix_existing_attendance_times()
# print(f"Fixed {fixed_count} attendance records")