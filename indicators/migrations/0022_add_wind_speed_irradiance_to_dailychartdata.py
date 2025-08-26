# Generated manually for adding wind speed and irradiance fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('indicators', '0021_generatedreport'),
    ]

    operations = [
        migrations.AddField(
            model_name='dailychartdata',
            name='avg_wind_speed',
            field=models.FloatField(default=0.0, help_text='Velocidad del viento promedio diaria en km/h.'),
        ),
        migrations.AddField(
            model_name='dailychartdata',
            name='avg_irradiance',
            field=models.FloatField(default=0.0, help_text='Irradiancia solar promedio diaria en W/m².'),
        ),
    ]
