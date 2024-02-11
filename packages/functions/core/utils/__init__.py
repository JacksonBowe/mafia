import core.utils.config as Config
import core.utils.session as Session
import core.utils.dynamo as Dynamo
import packages.core.utils.api as Events

def collapse_dict(d, parent_key='', sep='.'):
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