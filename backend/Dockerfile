# Use Python 3.10 slim base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Create cache directories with proper permissions
RUN mkdir -p /tmp/matplotlib \
    && mkdir -p /tmp/huggingface \
    && mkdir -p /app/.cache/torch/hub/checkpoints \
    && chmod -R 777 /tmp/matplotlib \
    && chmod -R 777 /tmp/huggingface \
    && chmod -R 777 /app/.cache \
    && mkdir -p /.cache/huggingface/hub \
    && chmod -R 777 /.cache \
    && mkdir -p /.config/matplotlib \
    && chmod -R 777 /.config

# Set environment variables
ENV TORCH_HOME=/app/.cache/torch
ENV PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV TRANSFORMERS_CACHE=/tmp/huggingface

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt --no-cache-dir

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]