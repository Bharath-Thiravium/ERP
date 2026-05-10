#!/bin/bash
export PGPASSWORD=mango
psql -h 127.0.0.1 -U postgres -d modernsap -f check_units.sql
