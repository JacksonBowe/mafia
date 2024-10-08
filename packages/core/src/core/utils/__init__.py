import uuid
from datetime import UTC, datetime

import core.utils.config as Config  # noqa: F401
import core.utils.dynamo as Dynamo  # noqa: F401


def new_id():
    return str(uuid.uuid4())


def timestamp():
    """
    Get the current UTC time as a timestamp in milliseconds.

    Returns:
        int: Current UTC time in milliseconds since the epoch.
    """
    return round(int(datetime.now(UTC).timestamp() * 1000))


def timestamp_iso():
    """
    Get the current UTC time as a timestamp in milliseconds.

    Returns:
        int: Current UTC time in milliseconds since the epoch.
    """
    return datetime.now(UTC).isoformat()


def collapse_dict(d, parent_key="", sep="."):
    """
    Collapse a nested dictionary into dot notation.

    Args:
        d (dict): The dictionary to be collapsed.
        parent_key (str): The key representing the parent level.
        sep (str): The separator to use between keys in the dot notation.

    Returns:
        dict: The collapsed dictionary.
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(collapse_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)
