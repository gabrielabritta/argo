FROM python:3.10

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create management commands directory
RUN mkdir -p api/management/commands

# Create setup_initial_data.py
RUN echo 'from django.core.management.base import BaseCommand\n\
from api.models import Rover, Substation\n\
\n\
class Command(BaseCommand):\n\
    help = "Setup initial data for the rover application"\n\
\n\
    def handle(self, *args, **kwargs):\n\
        # Criar Substation inicial\n\
        substation, created = Substation.objects.get_or_create(\n\
            identifier="SUB001",\n\
            defaults={\n\
                "name": "Subestação Principal",\n\
                "location": "Local Principal",\n\
                "is_active": True\n\
            }\n\
        )\n\
        \n\
        self.stdout.write(\n\
            self.style.SUCCESS(f"{"Created" if created else "Found"} substation: {substation.name}")\n\
        )\n\
\n\
        # Criar Rovers iniciais\n\
        rovers_data = [\n\
            {\n\
                "identifier": "Rover-Argo-N-0",\n\
                "name": "Rover Argo N0",\n\
                "model": "Argo-N",\n\
                "is_active": True\n\
            },\n\
            {\n\
                "identifier": "Rover-Argo-N-1",\n\
                "name": "Rover Argo N1",\n\
                "model": "Argo-N",\n\
                "is_active": True\n\
            }\n\
        ]\n\
\n\
        for rover_data in rovers_data:\n\
            rover, created = Rover.objects.get_or_create(\n\
                identifier=rover_data["identifier"],\n\
                defaults={\n\
                    **rover_data,\n\
                    "substation": substation\n\
                }\n\
            )\n\
            self.stdout.write(\n\
                self.style.SUCCESS(f"{"Created" if created else "Found"} rover: {rover.name}")\n\
            )' > api/management/commands/setup_initial_data.py

# Create the start script and set permissions in one layer
RUN echo '#!/bin/bash\n\
\n\
# Function to wait for the database\n\
wait_for_db() {\n\
    echo "Waiting for database..."\n\
    while ! pg_isready -h $POSTGRES_HOST -p 5432 -U $POSTGRES_USER\n\
    do\n\
        echo "Database is not ready - sleeping"\n\
        sleep 1\n\
    done\n\
    echo "Database is ready!"\n\
}\n\
\n\
# Wait for the database to be ready\n\
wait_for_db\n\
\n\
# Apply migrations\n\
echo "Applying database migrations..."\n\
python manage.py makemigrations api\n\
python manage.py migrate\n\
\n\
# Create initial data\n\
echo "Setting up initial data..."\n\
python manage.py setup_initial_data\n\
\n\
# Start Daphne server\n\
echo "Starting Daphne server..."\n\
exec daphne -b 0.0.0.0 -p 8000 myproject.asgi:application' > /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 8000

# Use bash to execute the script
ENTRYPOINT ["/bin/bash"]
CMD ["/app/start.sh"]
