#!/bin/bash

# Install GDAL for GPS-based attendance system
echo "Installing GDAL for Django GIS support..."

# For Ubuntu/Debian
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y gdal-bin libgdal-dev
    sudo apt-get install -y python3-gdal
    sudo apt-get install -y binutils libproj-dev
fi

# For CentOS/RHEL
if command -v yum &> /dev/null; then
    sudo yum install -y gdal gdal-devel
    sudo yum install -y proj proj-devel
fi

# For macOS
if command -v brew &> /dev/null; then
    brew install gdal
    brew install proj
fi

# Install Python GDAL bindings
pip install GDAL==$(gdal-config --version)

echo "GDAL installation complete!"
echo "Now run: python manage.py makemigrations hr && python manage.py migrate"