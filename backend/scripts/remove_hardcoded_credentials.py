#!/usr/bin/env python3
"""
Script to remove hardcoded credentials and replace with environment variables
"""
import os
import json
import secrets
import string


def generate_secure_password(length=32):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def remove_credentials_file():
    """Remove the hardcoded credentials file"""
    credentials_file = "master_admin_credentials.json"
    
    if os.path.exists(credentials_file):
        print(f"🗑️ Removing {credentials_file}...")
        os.remove(credentials_file)
        print("✅ Hardcoded credentials file removed")
    else:
        print("ℹ️ Credentials file not found")


def create_env_template():
    """Create environment template file"""
    env_template = """# Environment Variables Template
# Copy this to .env and fill in your actual values

# Database Configuration
DB_NAME=modernsap
DB_USER=postgres
DB_PASSWORD=your_secure_db_password_here
DB_HOST=localhost
DB_PORT=5432

# Django Configuration
SECRET_KEY=your_secret_key_here
DEBUG=False
ENVIRONMENT=production

# Master Admin Configuration
MASTER_ADMIN_EMAIL=admin@yourcompany.com
MASTER_ADMIN_PASSWORD=your_secure_admin_password_here
MASTER_ADMIN_COMPANY=Your Company Name

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password_here

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
"""
    
    with open('.env.template', 'w') as f:
        f.write(env_template)
    
    print("✅ Created .env.template file")
    print("📝 Please copy .env.template to .env and fill in your actual values")


def main():
    """Main function"""
    print("🔒 Removing hardcoded credentials...")
    
    # Remove hardcoded credentials file
    remove_credentials_file()
    
    # Create environment template
    create_env_template()
    
    print("\n🎉 Security cleanup completed!")
    print("\n⚠️ IMPORTANT NEXT STEPS:")
    print("1. Copy .env.template to .env")
    print("2. Fill in all environment variables with secure values")
    print("3. Never commit .env file to version control")
    print("4. Use environment variables in your code instead of hardcoded values")


if __name__ == "__main__":
    main()