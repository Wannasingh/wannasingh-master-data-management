FROM python:3.11-slim

# Create a non-root user and configure the working directory
RUN useradd -u 1001 -m appuser
WORKDIR /app
RUN chown -R appuser:appuser /app

# Copy requirements and install dependencies
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the application source code explicitly to avoid recursive COPY warnings
COPY --chown=appuser:appuser index.py .

# Switch to the non-root user
USER appuser

EXPOSE 5328

CMD ["uvicorn", "index:app", "--host", "0.0.0.0", "--port", "5328"]
