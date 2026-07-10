#!/bin/bash
echo "ALTER TABLE students ADD COLUMN telefono VARCHAR;" | sqlite3 data/analytics.db
echo "ALTER TABLE students ADD COLUMN correo_personal VARCHAR;" | sqlite3 data/analytics.db
