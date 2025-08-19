# Configuración de Gunicorn para producción
# MTE Lumen App

import multiprocessing
import os

# Configuración del servidor
bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50

# Configuración de timeouts
timeout = 30
keepalive = 2
graceful_timeout = 30

# Configuración de logs
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Configuración de seguridad
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Configuración de workers
preload_app = True
reload = False

# Configuración de gevent
worker_tmp_dir = "/dev/shm"

# Configuración de SSL (descomentar si usas HTTPS)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

# Configuración de hooks
def on_starting(server):
    server.log.info("Iniciando servidor Gunicorn...")

def on_reload(server):
    server.log.info("Recargando servidor Gunicorn...")

def worker_int(worker):
    worker.log.info("Worker recibió INT o QUIT")

def pre_fork(server, worker):
    server.log.info("Worker %s será creado", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker %s ha sido creado", worker.pid)

def post_worker_init(worker):
    worker.log.info("Worker %s ha sido inicializado", worker.pid)

def worker_abort(worker):
    worker.log.info("Worker %s ha sido abortado", worker.pid)
