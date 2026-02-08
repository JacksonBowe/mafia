import logging
import sys

logger = logging
logger.basicConfig(
    filename="log.log",
    level=logging.DEBUG,
    format="[%(filename)-20s][%(funcName)-20s][%(levelname)-8s] %(message)s",
    filemode="w",
)


def log_to_terminal():
    """Attach a console handler to the logger if not already present."""
    root_logger = logging.getLogger()

    # Add a new console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)  # Adjust level for console logging
    console_formatter = logging.Formatter(
        "[%(filename)-20s][%(funcName)-20s][%(levelname)-8s] %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
