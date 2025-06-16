# 🐳 Chat API Dockerfile
# Multi-stage build for optimized production image

# ==========================================
# 🏗️ Build Stage
# ==========================================
FROM python:3.11-slim as builder

# Set build arguments
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Add metadata
LABEL maintainer="lonycn@qq.com" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="chat-api" \
      org.label-schema.description="Unified Chat API Service" \
      org.label-schema.url="https://github.com/your-org/chat-api" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/your-org/chat-api" \
      org.label-schema.vendor="Chat API Team" \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Build dependencies
    gcc \
    g++ \
    make \
    # MySQL client dependencies
    default-libmysqlclient-dev \
    pkg-config \
    # Other dependencies
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set work directory
WORKDIR /app

# Install Poetry
RUN pip install poetry==1.7.1

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Configure poetry and install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --only=main --no-dev \
    && rm -rf $POETRY_CACHE_DIR

# ==========================================
# 🚀 Production Stage
# ==========================================
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    # Runtime dependencies
    default-libmysqlclient-dev \
    # Health check utilities
    curl \
    # Process monitoring
    procps \
    # Timezone data
    tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app user and directories
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && mkdir -p /app/logs /app/uploads /app/static \
    && chown -R appuser:appuser /app

# Set work directory
WORKDIR /app

# Copy Python dependencies from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser scripts/ ./scripts/
COPY --chown=appuser:appuser alembic/ ./alembic/
COPY --chown=appuser:appuser alembic.ini ./

# Copy configuration files
COPY --chown=appuser:appuser pyproject.toml ./

# Create necessary directories and set permissions
RUN mkdir -p logs uploads static temp \
    && chown -R appuser:appuser /app \
    && chmod -R 755 /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ==========================================
# 🧪 Development Stage
# ==========================================
FROM builder as development

# Install development dependencies
RUN poetry install --with=dev

# Install additional development tools
RUN pip install \
    debugpy \
    ipython \
    jupyter

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose ports (app + debugger)
EXPOSE 8000 5678

# Development command with auto-reload
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ==========================================
# 🧪 Testing Stage
# ==========================================
FROM development as testing

# Install test dependencies
RUN poetry install --with=dev,test

# Copy test files
COPY --chown=appuser:appuser tests/ ./tests/

# Run tests
RUN python -m pytest tests/ -v --cov=src --cov-report=html --cov-report=term

# ==========================================
# 📊 Monitoring Stage (Optional)
# ==========================================
FROM production as monitoring

# Install monitoring dependencies
RUN pip install \
    prometheus-client \
    structlog \
    sentry-sdk

# Copy monitoring configuration
COPY --chown=appuser:appuser monitoring/ ./monitoring/

# Expose metrics port
EXPOSE 9090

# ==========================================
# 🔧 Build Arguments and Environment Variables
# ==========================================

# Build-time arguments
ARG APP_VERSION=1.0.0
ARG BUILD_DATE
ARG VCS_REF

# Runtime environment variables
ENV APP_VERSION=$APP_VERSION \
    BUILD_DATE=$BUILD_DATE \
    VCS_REF=$VCS_REF

# ==========================================
# 📝 Usage Examples
# ==========================================

# Build production image:
# docker build --target production -t chat-api:latest .

# Build development image:
# docker build --target development -t chat-api:dev .

# Build with build args:
# docker build \
#   --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
#   --build-arg VCS_REF=$(git rev-parse --short HEAD) \
#   --build-arg VERSION=1.0.0 \
#   --target production \
#   -t chat-api:1.0.0 .

# Run container:
# docker run -d \
#   --name chat-api \
#   -p 8000:8000 \
#   -e DATABASE_URL=mysql+asyncmy://user:pass@host:3306/db \
#   -e REDIS_URL=redis://host:6379/0 \
#   -v $(pwd)/logs:/app/logs \
#   -v $(pwd)/uploads:/app/uploads \
#   chat-api:latest

# Development with volume mount:
# docker run -d \
#   --name chat-api-dev \
#   -p 8000:8000 \
#   -p 5678:5678 \
#   -v $(pwd):/app \
#   -e DEBUG=true \
#   chat-api:dev

# ==========================================
# 🔒 Security Considerations
# ==========================================

# 1. Non-root user: Application runs as 'appuser'
# 2. Minimal base image: Using slim Python image
# 3. No sensitive data in image: Use environment variables
# 4. Regular updates: Keep base image and dependencies updated
# 5. Health checks: Monitor container health
# 6. Resource limits: Set appropriate CPU/memory limits

# ==========================================
# 🚀 Performance Optimizations
# ==========================================

# 1. Multi-stage build: Smaller production image
# 2. Layer caching: Optimize layer order for better caching
# 3. Dependency installation: Use poetry for better dependency management
# 4. Python optimizations: PYTHONUNBUFFERED, PYTHONDONTWRITEBYTECODE
# 5. System cleanup: Remove unnecessary packages and cache

# ==========================================
# 📊 Monitoring Integration
# ==========================================

# The image includes health checks and can be extended with:
# - Prometheus metrics endpoint
# - Structured logging
# - Error tracking (Sentry)
# - Performance monitoring
# - Custom health checks
