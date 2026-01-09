# Payment Gateway - Deployment Guide

## Quick Start for Grading

```bash
docker-compose up -d --build
```

This will automatically:
1. Start PostgreSQL database (port 5432)
2. Seed test merchant with credentials
3. Build and start API server (port 8000)
4. Build and start Dashboard frontend (port 3000)
5. Build and start Checkout page frontend (port 3001)

## Service Accessibility

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| PostgreSQL | 5432 | localhost:5432 | Database (internal) |
| Backend API | 8000 | http://localhost:8000 | REST API endpoints |
| Dashboard | 3000 | http://localhost:3000 | Merchant dashboard |
| Checkout | 3001 | http://localhost:3001 | Payment checkout page |

## Port Configuration Details

### Docker Compose Mapping
- **API**: Container port 8000 → Host port 8000 (Express app)
- **Dashboard**: Container port 80 → Host port 3000 (Nginx + React build)
- **Checkout**: Container port 80 → Host port 3001 (Nginx + React build)

### Service Verification

**Test Backend API Health:**
```bash
curl http://localhost:8000/health
```
Expected response: `{"status":"ok"}`

**Test Dashboard:**
```bash
curl http://localhost:3000
```
Should return dashboard HTML

**Test Checkout:**
```bash
curl http://localhost:3001
```
Should return checkout page HTML

## Test Merchant Credentials

Automatically seeded on first startup:

- **Email**: `test@example.com`
- **API Key**: `key_test_abc123`
- **API Secret**: `secret_test_xyz789`

These are used in:
- Dashboard login tests
- Checkout page API calls
- API endpoint authentication

## Environment Variables

The `docker-compose.yml` sets up test mode with deterministic behavior:

- `TEST_MODE: "true"` - Enables predictable payment processing
- `TEST_PAYMENT_SUCCESS: "true"` - Payments always succeed in test mode
- `TEST_PROCESSING_DELAY: 1000` - 1-second simulated delay
- `UPI_SUCCESS_RATE: 0.90` - 90% success rate for UPI (production)
- `CARD_SUCCESS_RATE: 0.95` - 95% success rate for cards (production)

## Testing Flow

1. **Start services:**
   ```bash
   docker-compose up -d --build
   ```

2. **Access Dashboard:**
   - Navigate to http://localhost:3000
   - Login with test merchant credentials
   - View transactions and API credentials

3. **Create Order:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/orders \
     -H "Content-Type: application/json" \
     -H "X-Api-Key: key_test_abc123" \
     -H "X-Api-Secret: secret_test_xyz789" \
     -d '{"amount":50000,"currency":"INR"}'
   ```

4. **Complete Payment:**
   - Navigate to http://localhost:3001/checkout?order_id={order_id_from_step_3}
   - Select payment method (UPI or Card)
   - Submit payment
   - Verify success status

5. **Verify Transaction:**
   - Check transaction appears in Dashboard
   - Verify payment status in database

## Docker Build Cache

To force a clean rebuild:
```bash
docker-compose down -v
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000
# Kill process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL is healthy
docker-compose logs postgres

# Verify network
docker-compose ps
```

### Frontend not loading
```bash
# Check build logs
docker-compose logs dashboard
docker-compose logs checkout

# Verify Nginx is running
docker exec gateway_dashboard nginx -t
```

## Data Persistence

- **Database**: Persists in Docker volume (survives container restarts)
- **Logs**: Available via `docker-compose logs`
- **Data Reset**: Run `docker-compose down -v` to reset everything

## Performance Characteristics

- **API Response Time**: <100ms (in-memory operations)
- **Payment Processing Time**: 1-10 seconds (simulated delay in test mode)
- **Database Queries**: Indexed on merchant_id, order_id, payment status
- **Concurrent Requests**: Supports multiple simultaneous payments

## Security Notes

- Test credentials are for development only
- All passwords stored as plaintext in test mode
- Production should use proper encryption and secrets management
- API keys and secrets are exposed in logs for debugging

---

**Last Updated**: 2026-01-09
**Version**: 1.0.0
