# Caddy Load Balancer Setup

This setup provides round-robin load balancing across 3 identical backend services using Caddy as a reverse proxy.

## Architecture

```
Internet → Caddy (Port 80/443) → Round Robin → app1:8000
                                              → app2:8000  
                                              → app3:8000
```

## Components

### Backend Services
- **app1**: First backend instance (cv-management-app1)
- **app2**: Second backend instance (cv-management-app2)  
- **app3**: Third backend instance (cv-management-app3)

All three services:
- Run the same Go application
- Listen on port 8000 internally
- Connect to the same PostgreSQL database
- Share the same upload volumes

### Caddy Reverse Proxy
- Listens on port 80 (HTTP) and 443 (HTTPS)
- Implements round-robin load balancing
- Performs health checks on `/health` endpoint
- Adds forwarding headers for client information
- Logs requests in JSON format

## Configuration Files

### Caddyfile
The main Caddy configuration that defines:
- Load balancing policy (round_robin)
- Health check settings (30s interval, 5s timeout)
- Request forwarding headers
- Access logging
- Optional HTTPS configuration

### docker-compose.yml
Updated to include:
- 3 backend service instances (app1, app2, app3)
- Caddy service with proper volume mounts
- Internal Docker networking
- Health check dependencies

## Usage

### Starting the Services
```bash
docker-compose up -d
```

### Testing Load Balancing
Run the provided test script:
```bash
./test-load-balancer.sh
```

This will make 12 requests to the health endpoint and show the distribution across backends.

### Accessing the Application
- **Load Balanced Backend**: http://localhost/api/
- **Health Check**: http://localhost/api/health
- **Frontend**: http://localhost:3000

### Monitoring

#### Check Caddy Logs
```bash
docker logs cv-management-caddy
```

#### Check Individual Backend Logs
```bash
docker logs cv-management-app1
docker logs cv-management-app2
docker logs cv-management-app3
```

#### View Load Balancer Status
Caddy automatically removes unhealthy backends from rotation and adds them back when they recover.

## Health Checks

Caddy performs health checks every 30 seconds on the `/api/health` endpoint of each backend. If a backend fails health checks, it's temporarily removed from the load balancing pool.

## HTTPS Configuration

To enable HTTPS, uncomment the HTTPS section in the Caddyfile and replace `your-domain.com` with your actual domain. Caddy will automatically obtain and manage SSL certificates.

## Scaling

To add more backend instances:
1. Add new service definitions in docker-compose.yml (app4, app5, etc.)
2. Update the Caddyfile to include the new backends in the reverse_proxy directive
3. Restart the services

## Troubleshooting

### Backend Not Responding
- Check if all backend services are running: `docker ps`
- Check backend logs for errors
- Verify database connectivity

### Load Balancing Not Working
- Check Caddy logs for health check failures
- Verify internal Docker networking
- Test individual backend health endpoints

### Performance Issues
- Monitor resource usage: `docker stats`
- Check database connection pool settings
- Review Caddy access logs for response times
