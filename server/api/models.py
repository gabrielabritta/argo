from django.db import models

class Substation(models.Model):
    name = models.CharField(max_length=200)
    identifier = models.CharField(max_length=100, unique=True)
    latitude = models.FloatField(default=-23.550520)  # São Paulo como padrão
    longitude = models.FloatField(default=-46.633308)  # São Paulo como padrão
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=200, blank=True, default="")
    voltage = models.CharField(max_length=20, default="500kV")

    def __str__(self):
        return f"{self.name} ({self.identifier})"

    @property
    def coordinates(self):
        return [self.latitude, self.longitude]

class Rover(models.Model):
    substation = models.ForeignKey(Substation, on_delete=models.CASCADE)
    identifier = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    model = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    battery_level = models.FloatField(default=100)
    sensors = models.JSONField(default=dict)
    alerts = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.identifier})"

class SensorReading(models.Model):
    rover = models.ForeignKey(Rover, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    sensor_type = models.CharField(max_length=50)
    value = models.FloatField()
    unit = models.CharField(max_length=20)

    class Meta:
        indexes = [
            models.Index(fields=['rover', 'timestamp']),
            models.Index(fields=['sensor_type', 'timestamp'])
        ]

class RoverTelemetry(models.Model):
    rover = models.ForeignKey(Rover, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    battery_level = models.FloatField()
    temperature = models.FloatField()
    latitude = models.FloatField(null=True)
    longitude = models.FloatField(null=True)
    speed = models.FloatField(null=True)
    status = models.CharField(max_length=50)

    class Meta:
        indexes = [
            models.Index(fields=['rover', 'timestamp'])
        ]
        get_latest_by = 'timestamp'
