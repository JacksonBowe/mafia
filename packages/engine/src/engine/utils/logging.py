import logging

logger = logging
logger.basicConfig(
    filename="log.txt",
    level=logging.DEBUG,
    format="[%(filename)-20s][%(funcName)-20s][%(levelname)-8s] %(message)s",
    filemode="w",
)
