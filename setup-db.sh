#!/bin/bash
# Script untuk setup database PostgreSQL

echo "🔧 Setting up database..."

# Baca config dari .env
DB_NAME=$(grep "^DB_NAME" .env | cut -d'=' -f2 | tr -d '"')
DB_USER=$(grep "^DB_USER" .env | cut -d'=' -f2 | tr -d '"')
DB_PASSWORD=$(grep "^DB_PASSWORD" .env | cut -d'=' -f2 | tr -d '"')

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: DB_NAME, DB_USER, atau DB_PASSWORD tidak ditemukan di .env"
  exit 1
fi

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check apakah PostgreSQL running
if ! pg_isready -h localhost > /dev/null 2>&1; then
  echo "⚠️  PostgreSQL tidak running. Mencoba start..."
  sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || {
    echo "❌ Tidak bisa start PostgreSQL. Silakan start manual:"
    echo "   sudo systemctl start postgresql"
    echo "   atau"
    echo "   sudo service postgresql start"
    exit 1
  }
  sleep 2
fi

if ! pg_isready -h localhost > /dev/null 2>&1; then
  echo "❌ PostgreSQL masih tidak running. Silakan cek instalasi PostgreSQL."
  exit 1
fi

echo "✅ PostgreSQL running"

# Buat database jika belum ada
echo "📦 Checking database..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "✅ Database $DB_NAME sudah ada"
else
  echo "📝 Creating database $DB_NAME..."
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || {
    echo "❌ Gagal membuat database"
    exit 1
  }
  echo "✅ Database $DB_NAME created"
fi

# Buat user jika belum ada
echo "👤 Checking user..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "✅ User $DB_USER sudah ada"
  # Update password
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1
else
  echo "📝 Creating user $DB_USER..."
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
    echo "❌ Gagal membuat user"
    exit 1
  }
  echo "✅ User $DB_USER created"
fi

# Grant privileges
echo "🔑 Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null 2>&1
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" > /dev/null 2>&1
echo "✅ Privileges granted"

echo ""
echo "✅ Database setup complete!"
echo ""

