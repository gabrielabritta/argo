#!/bin/bash

# Função para esperar o banco de dados
wait_for_db() {
    echo "Waiting for database..."
    while ! pg_isready -h $POSTGRES_HOST -p 5432 -U $POSTGRES_USER
    do
        echo "Database is not ready - sleeping"
        sleep 1
    done
    echo "Database is ready!"
}

# Espera o banco de dados estar pronto
wait_for_db

# Aplicar migrações
echo "Applying database migrations..."
python manage.py migrate

# Criar dados iniciais
echo "Setting up initial data..."
python manage.py setup_initial_data

# Iniciar o servidor Daphne
echo "Starting Daphne server..."
exec daphne -b 0.0.0.0 -p 8000 myproject.asgi:application
