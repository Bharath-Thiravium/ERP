#!/usr/bin/env python3
path = '/var/www/SAP-Python/backend/authentication/views.py'
with open(path) as f:
    lines = f.readlines()

# Line 4460 (0-indexed: 4459) has domain_name, 4461 has approval_status
target = 4459  # 0-indexed
print(f"Inserting after line {target+1}: {lines[target].rstrip()}")
print(f"Before line {target+2}: {lines[target+1].rstrip()}")

bank_lines = [
    "            'bank_name': company.bank_name,\n",
    "            'bank_account_number': company.bank_account_number,\n",
    "            'bank_ifsc_code': company.bank_ifsc_code,\n",
    "            'bank_branch': company.bank_branch,\n",
    "            'bank_account_holder': company.bank_account_holder,\n",
    "            'bank_account_type': company.bank_account_type,\n",
]
for j, bl in enumerate(bank_lines):
    lines.insert(target + 1 + j, bl)

with open(path, 'w') as f:
    f.writelines(lines)
print("Fixed! Verifying:")
with open(path) as f:
    all_lines = f.readlines()
for i in range(4458, 4472):
    print(f"  {i+1}: {all_lines[i].rstrip()}")
