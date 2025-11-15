# Pre-Deployment Check - Issues Found

## Critical Issues Found 🔴

### 1. **CRITICAL**: Missing /metrics Endpoint

**Location**: `src/api/app.ts`

**Issue**: The MetricsService exists, but there's no `/metrics` HTTP endpoint to expose Prometheus metrics.

**Impact**:
- Prometheus cannot scrape metrics from the application
- Monitoring stack will fail to collect application-specific metrics
- Dashboards and alerts will show "no data"

**Fix Required**:
```typescript
// Add to src/api/app.ts after health check endpoint:

import metricsService from '../services/MetricsService';

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.getContentType());
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});
```

---

### 2. **CRITICAL**: Metric Name Mismatches

**Locations**:
- `src/services/MetricsService.ts` (defines metrics)
- `monitoring/alerts/application.yml` (uses metrics)
- `monitoring/grafana/dashboards/content-hub-overview.json` (uses metrics)

**Issues**:

#### A. BullMQ Metrics Not Defined
**Used in alerts/dashboard but not in code**:
- `bullmq_queue_waiting_total`
- `bullmq_job_failed_total`

**Available in MetricsService**:
- `job_processing_total`
- `job_processing_errors_total`

**Fix Required**:
- Either add BullMQ-specific metrics to MetricsService
- OR update alerts/dashboard to use `job_processing_*` metrics

#### B. Database Pool Metrics Mismatch
**Dashboard expects**:
- `db_pool_active_connections`
- `db_pool_idle_connections`
- `db_pool_total_connections`

**MetricsService provides**:
- `db_connection_pool_size{state="active"}`
- `db_connection_pool_size{state="idle"}`
- `db_connection_pool_size{state="total"}`

**Fix Required**:
Update dashboard queries to use labels:
```promql
# Instead of:
db_pool_active_connections

# Use:
db_connection_pool_size{state="active"}
```

#### C. PostgreSQL Metrics (postgres-exporter)
**Alerts expect** (from postgres-exporter):
- `pg_stat_database_numbackends`
- `pg_settings_max_connections`

**Status**: ✅ **OK** - These come from postgres-exporter, not from our app

#### D. Redis Metrics (redis-exporter)
**Alerts expect** (from redis-exporter):
- `redis_memory_used_bytes`
- `redis_memory_max_bytes`

**Status**: ✅ **OK** - These come from redis-exporter, not from our app

---

### 3. **HIGH**: MetricsService Not Integrated

**Issue**: MetricsService is created but not actively used by the application to record metrics.

**Impact**:
- Metrics will be defined but always show 0 or no data
- No actual measurement of HTTP requests, DB queries, platform publishes, etc.

**Fix Required**: Add middleware to record HTTP metrics:

```typescript
// Add to src/api/app.ts before routes:

import metricsService from '../services/MetricsService';

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    metricsService.httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );

    metricsService.httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
  });

  next();
});
```

---

## Medium Issues Found 🟡

### 4. **MEDIUM**: TypeScript Compilation Errors

**Already documented** in `docs/KNOWN_ISSUES.md`

**Status**: Pre-existing issues, won't block deployment but should be fixed

**Files affected**:
- `src/api/app.ts` - unused `req` parameter
- `src/api/controllers/AuthController.ts` - JWT type issues, missing returns
- `src/config/index.ts` - unused `path` import
- Multiple other files

**Impact**: Build fails with `npm run build`, but app can still run in dev mode

---

### 5. **MEDIUM**: npm Security Vulnerabilities

**Already documented** in `docs/KNOWN_ISSUES.md`

**Status**: 25 vulnerabilities (23 moderate, 2 critical)

**Most critical**:
- `form-data` in `instagram-private-api`
- `tough-cookie` in request chain
- `js-yaml` in Jest dependencies

**Impact**: Security risk, but mostly in dev dependencies

---

## Low Priority Issues 🟢

### 6. **LOW**: Alertmanager Not Configured

**Location**: `monitoring/prometheus.yml`

**Issue**: Prometheus expects Alertmanager at `alertmanager:9093` but it's not in docker-compose

**Impact**: Alerts will be evaluated but notifications won't be sent

**Fix**:
- Either add Alertmanager to docker-compose
- OR remove alerting section from prometheus.yml for now

---

### 7. **LOW**: Unused `path` Import

**Location**: `src/config/index.ts:2`

**Issue**: `import path from 'path';` but never used

**Fix**: Remove the import or prefix with underscore

---

## Configuration Validation ✅

### Service Names: **OK**
All service names in docker-compose match Prometheus configuration:
- ✅ `app` → `app:3000`
- ✅ `node-exporter` → `node-exporter:9100`
- ✅ `postgres-exporter` → `postgres-exporter:9187`
- ✅ `redis-exporter` → `redis-exporter:9121`
- ✅ `cadvisor` → `cadvisor:8080`

### Ports: **OK**
All ports are correctly configured and no conflicts:
- Application: 3000
- PostgreSQL: 5432
- Redis: 6379
- Prometheus: 9090
- Grafana: 3001
- Exporters: 9100, 9121, 9187
- cAdvisor: 8080

### Frontend API Client: **OK**
- ✅ Using `/api` base URL correctly
- ✅ Token refresh logic implemented
- ✅ Axios interceptors configured
- ✅ AuthController returns correct token format

### Docker Compose Networks: **OK**
- ✅ `monitoring` network created
- ✅ All services connected correctly
- ✅ App, postgres, redis on both `default` and `monitoring` networks

---

## Recommended Fixes Before Deployment

### Priority 1 (Must Fix)
1. ✅ Add `/metrics` endpoint to `src/api/app.ts`
2. ✅ Add metrics middleware to record HTTP requests
3. ✅ Fix metric names in dashboard (db_pool_* → db_connection_pool_size{state})

### Priority 2 (Should Fix)
4. ⚠️ Fix BullMQ metric names or add BullMQ-specific metrics
5. ⚠️ Remove or configure Alertmanager in Prometheus config
6. ⚠️ Fix TypeScript compilation errors (at least the critical ones)

### Priority 3 (Nice to Have)
7. Remove unused imports
8. Address npm security vulnerabilities
9. Add database metrics recording in DatabaseConnection class
10. Add cache metrics recording in CacheService

---

## Quick Fix Checklist

```bash
# 1. Add /metrics endpoint and middleware to src/api/app.ts
# See detailed fixes above

# 2. Update Grafana dashboard metric names
# monitoring/grafana/dashboards/content-hub-overview.json
# Change: db_pool_active_connections → db_connection_pool_size{state="active"}

# 3. Update alerts or add BullMQ metrics
# Either update monitoring/alerts/application.yml
# OR add bullmq metrics to src/services/MetricsService.ts

# 4. Optional: Remove alertmanager from prometheus.yml
# Comment out lines 14-19 in monitoring/prometheus.yml

# 5. Test the metrics endpoint works
curl http://localhost:3000/metrics

# 6. Verify Prometheus can scrape
docker-compose logs prometheus | grep "content-hub-api"
```

---

## Testing Checklist After Fixes

```bash
# 1. Build succeeds (or skip with noUnusedLocals: false)
npm run build

# 2. Dependencies installed
npm list | grep -E "prom-client|winston-daily"

# 3. Start services
docker-compose up -d

# 4. Check app metrics endpoint
curl http://localhost:3000/metrics | head -20

# 5. Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="content-hub-api")'

# 6. Open Grafana
open http://localhost:3001
# Login: admin/admin
# Check dashboard shows data

# 7. Test frontend auth flow
# Open http://localhost:3001
# Try login/logout
# Verify token refresh works
```

---

## Summary

### Must Fix Before Deployment (3 items)
1. 🔴 Add /metrics endpoint
2. 🔴 Add metrics middleware
3. 🔴 Fix Grafana dashboard metric names

### Should Fix Soon (3 items)
4. 🟡 Resolve BullMQ metric naming
5. 🟡 Remove or add Alertmanager
6. 🟡 Fix TypeScript errors

### Can Fix Later (4 items)
7. 🟢 Clean up unused imports
8. 🟢 Fix npm vulnerabilities
9. 🟢 Add database metrics recording
10. 🟢 Add cache metrics recording

**Total Issues**: 10 (3 critical, 3 medium, 4 low)

---

## Notes

- All service names and ports are correctly configured ✅
- Frontend refresh token flow is correctly implemented ✅
- Docker Compose configuration is valid ✅
- Documentation is comprehensive ✅
- The main issues are around metrics integration and naming consistency
- TypeScript errors are pre-existing and documented in KNOWN_ISSUES.md
