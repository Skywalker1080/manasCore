import logging
from datetime import datetime
from pathlib import Path

# Resolve paths relative to the project root (parent of logger/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Configure Logger
logger = logging.getLogger("PrismOps")
logger.setLevel(logging.DEBUG)

# Logging File Handler
log_directory = PROJECT_ROOT / "logs"
log_directory.mkdir(parents=True, exist_ok=True)
log_file = log_directory / f"pipeline_{datetime.now().strftime('%d_%m_%Y_%H_%M_%S')}.log"

#file handler
file_handler =logging.FileHandler(log_file)
file_handler.setLevel(logging.DEBUG)

#console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

#formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

#add handler to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)

"""
#log messages
logger.info("This is an info message")
logger.warning("This is a warning message")
logger.error("This is an error message")
logger.critical("This is a critical message")
"""

def get_logger():
    """Return the configured logger."""
    return logger
