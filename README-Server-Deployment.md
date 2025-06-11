# CV Management System - Server Deployment Guide

## Server Information
- **IP Address**: 167.71.199.165
- **IPv6**: Available (Enable if needed)
- **Private IP**: 10.104.0.2

## Quick Deployment

### 1. Prerequisites
Ensure Docker and Docker Compose are installed on your server:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone and Configure
```bash
# Clone the repository
git clone <your-repo-url>
cd CV-Management

# Copy production environment file
cp .env.production .env

# Edit environment file with your Azure OpenAI credentials
nano .env
```

### 3. Deploy
```bash
# Run the deployment script
./deploy-server.sh
```

## Application URLs

After successful deployment, access your application at:

- **Frontend**: http://167.71.199.165:3000
- **Load Balanced API**: http://167.71.199.165/api
- **AI Service API**: http://167.71.199.165:8000
- **AI Service Documentation**: http://167.71.199.165:8000/docs

## Configuration Details

### Load Balancer (Caddy)
- Configured for IP: 167.71.199.165
- Round-robin load balancing across 3 backend instances
- Health checks every 30 seconds
- Automatic failover for unhealthy backends

### Backend Services
- 3 instances (app1, app2, app3) for high availability
- Production mode enabled
- Internal Docker networking

### Frontend
- Next.js application in production mode
- API URL configured for server IP
- Optimized build for production

### Database
- PostgreSQL 17 with persistent storage
- Automatic schema initialization
- Health checks enabled

## Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f [service-name]
# Service names: postgres, app1, app2, app3, caddy, ai-service, frontend
```

### Service Control
```bash
# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart [service-name]

# View running containers
docker ps
```

### Testing Load Balancer
```bash
# Test load balancing distribution
./test-load-balancer.sh
```

## Troubleshooting

### Services Not Starting
1. Check Docker logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure ports 80, 3000, 8000 are available
4. Check disk space and memory

### API Not Responding
1. Test health endpoint: `curl http://167.71.199.165/api/health`
2. Check backend logs: `docker-compose logs -f app1 app2 app3`
3. Verify Caddy configuration: `docker-compose logs -f caddy`

### Database Issues
1. Check database logs: `docker-compose logs -f postgres`
2. Verify database connectivity from backend
3. Check if schema was properly initialized

### Frontend Issues
1. Check frontend logs: `docker-compose logs -f frontend`
2. Verify API URL configuration
3. Check browser console for errors

## Security Considerations

### Firewall Configuration
Ensure these ports are open:
- Port 80: HTTP traffic (Caddy load balancer)
- Port 3000: Frontend application
- Port 8000: AI Service API

### Environment Variables
- Change default JWT_SECRET in production
- Secure your Azure OpenAI credentials
- Use strong database passwords

### SSL/HTTPS (Optional)
To enable HTTPS, update the Caddyfile with your domain name and Caddy will automatically obtain SSL certificates.

## Monitoring

### Health Checks
- Backend: http://167.71.199.165/api/health
- AI Service: http://167.71.199.165:8000/health

### Log Files
- Caddy access logs: Available in container at `/var/log/caddy/access.log`
- Application logs: Available via `docker-compose logs`

## Backup

### Database Backup
```bash
# Create backup
docker exec cv-management-db pg_dump -U root cv_management > backup.sql

# Restore backup
docker exec -i cv-management-db psql -U root cv_management < backup.sql
```

### File Uploads Backup
```bash
# Backup uploads directory
tar -czf uploads-backup.tar.gz uploads/
```

## Updates

### Application Updates
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### System Updates
```bash
# Update Docker images
docker-compose pull
docker-compose up -d
```
