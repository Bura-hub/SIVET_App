# Generated manually for adding irradiance fields to MonthlyConsumptionKPI

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('indicators', '0022_add_wind_speed_irradiance_to_dailychartdata'),
    ]

    operations = [
        migrations.AddField(
            model_name='monthlyconsumptionkpi',
            name='avg_irradiance_current_month',
            field=models.FloatField(default=0.0, help_text='Irradiancia solar promedio del mes actual en W/m².'),
        ),
        migrations.AddField(
            model_name='monthlyconsumptionkpi',
            name='avg_irradiance_previous_month',
            field=models.FloatField(default=0.0, help_text='Irradiancia solar promedio del mes anterior en W/m².'),
        ),
    ]
