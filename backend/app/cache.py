from flask_caching import Cache

# Initialize cache with default config
cache = Cache(config={
    'CACHE_TYPE': 'simple',  # For development, use 'redis' in production
    'CACHE_DEFAULT_TIMEOUT': 300  # Default timeout in seconds
})

# Export the cache instance
__all__ = ['cache']

def init_cache(app):
    """Initialize the cache with the Flask application"""
    cache.init_app(app)
    return cache 