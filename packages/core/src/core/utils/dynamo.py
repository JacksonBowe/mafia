import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Dict, List, Mapping, Optional

import boto3
from boto3.dynamodb.types import TypeSerializer

ddb = boto3.resource("dynamodb")


def new_id():
    return str(uuid.uuid4())


def timestamp():
    """
    Get the current UTC time as a timestamp in milliseconds.

    Returns:
        int: Current UTC time in milliseconds since the epoch.
    """
    return round(int(datetime.now(UTC).timestamp() * 1000))


def build_update_expression(params: Mapping[str, str]):
    """
    Constructs the update expression for ddb update_item()
    Input of params = { 'att1': 'val1', 'att2.sub1': 'val2', 'att3': None }
    becomes ->
        update_expression = set #att1=#att1, #att2.#sub1=:att2sub1  remove #att3
        update_names = { '#att1': 'att1', '#att2': 'att2', '#sub1': 'sub1', '#att3': 'att3 }
        update_values = { ':att1': 'val1', ':att2sub1': 'val2}

    returned as (update_expression, update_names, update_values)
    """
    set_expression = []
    remove_expression = []
    update_names = dict()
    update_values = dict()

    # For each key in the map, alias it
    for full_key, val in params.items():
        parts = full_key.split(".")
        for part in parts:
            key = part

            update_names[f"#{key}"] = key  # To avoid 'reserved word' conflicts

        full_key_hash = "#" + full_key.replace(
            ".", ".#"
        )  # convert 'attr1.sub1' to '#attr1.#sub1'
        full_key_val = ":" + full_key.replace(
            ".", ""
        )  # convert 'attr1.sub1' to ':attr1.:sub1'

        if val is not None:
            # SET new values
            if not set_expression:
                set_expression.append("set ")
            set_expression.append(f" {full_key_hash}={full_key_val},")
            update_values[f"{full_key_val}"] = val  # To avoid 'reserved word' conflicts

        elif val is None:
            # REMOVE values
            if not remove_expression:
                remove_expression.append("remove ")
            remove_expression.append(f" {full_key_hash},")

    update_expression = (
        "".join(set_expression)[:-1] + "  " + "".join(remove_expression)[:-1]
    )
    return update_expression, update_names, update_values


def remove_none_values(obj):
    """
    Recursively removes None values from a data structure that may include
    dictionaries, lists, strings, and integers. When a dictionary is encountered,
    it removes keys that have None values. When a list is encountered, it removes
    None values and processes its elements.

    Parameters:
    - obj: The data structure to process. Can be of any type.

    Returns:
    - The processed data structure with None values removed.
    """
    if isinstance(obj, dict):
        # For dictionaries, create a new dictionary without None values
        return {k: remove_none_values(v) for k, v in obj.items() if v is not None}
    elif isinstance(obj, list):
        # For lists, remove None values and process each element
        return [remove_none_values(item) for item in obj if item is not None]
    else:
        # For other types like strings and integers, return as is
        return obj


def _deep_merge_and_log_changes(
    base_dict: Mapping[str, any],
    update_dict: Mapping[str, any],
    path: Optional[List[str]] = None,
    changelog: Optional[Dict[str, any]] = None,
) -> Dict[str, any]:
    """
    Merges updates from update_dict into base_dict and logs the changes.

    Parameters:
    - base_dict (dict): Dictionary to update.
    - update_dict (dict): Dictionary with updates.
    - path (List[str], optional): Path to current attribute.
    - changelog (Dict[str, any], optional): Log of changes.

    Returns:
    - Dict[str, any]: Log of changes with paths as keys and updated values as values.
    """
    if path is None:
        path = []
    if changelog is None:
        changelog = {}

    for key, value in update_dict.items():
        current_path = path + [key]  # Build the path for the current key
        if key not in base_dict and value is not None:
            changelog.update(
                {
                    ".".join(current_path): value,
                }
            )

            base_dict[key] = value
        else:
            if (
                key in base_dict
                and isinstance(base_dict[key], dict)
                and isinstance(value, dict)
            ):
                # Recurse into nested dictionaries
                _deep_merge_and_log_changes(
                    base_dict[key], value, current_path, changelog
                )
            elif key in base_dict and base_dict[key] != value:
                changelog.update(
                    {
                        ".".join(current_path): value,
                    }
                )
                base_dict[key] = value

    return changelog


@dataclass
class UpdateOperation:
    """
    Represents a database update operation including the expression,
    attribute names, and values.
    """

    expression: str
    names: dict
    values: dict


def build_update_operation(
    base_dict: Dict[str, any], update_dict: Dict[str, any]
) -> UpdateOperation:
    """
    Creates an UpdateOperation from changes between base_dict and update_dict.

    Parameters:
    - base_dict (Dict[str, any]): Original dictionary.
    - update_dict (Dict[str, any]): Updates to apply.

    Returns:
    - UpdateOperation: Contains DynamoDB update expression, attribute names, and values.
    """
    # ---- Build the changelog
    changelog = _deep_merge_and_log_changes(base_dict, update_dict)
    # print('CHANGELOG', changelog)

    # ---- Build the update operation
    set_expression = []
    remove_expression = []
    update_names = dict()
    update_values = dict()

    # For each key in the map, alias it
    for full_key, val in changelog.items():
        parts = full_key.split(".")
        for part in parts:
            key = part

            update_names[f"#{key}"] = key  # To avoid 'reserved word' conflicts

        full_key_hash = "#" + full_key.replace(
            ".", ".#"
        )  # convert 'attr1.sub1' to '#attr1.#sub1'
        full_key_val = ":" + full_key.replace(
            ".", ""
        )  # convert 'attr1.sub1' to ':attr1.:sub1'

        if val is not None:
            # SET new values
            if not set_expression:
                set_expression.append("set")
            set_expression.append(f" {full_key_hash}={full_key_val},")
            update_values[f"{full_key_val}"] = val  # To avoid 'reserved word' conflicts

        elif val is None:
            # REMOVE values
            if not remove_expression:
                remove_expression.append("remove")
            remove_expression.append(f" {full_key_hash},")

    update_expression = (
        "".join(set_expression)[:-1] + "  " + "".join(remove_expression)[:-1]
    )

    return UpdateOperation(
        update_expression.strip(), update_names, remove_none_values(update_values)
    )


def serialize(input_dict: dict) -> dict:
    """
    Serialize a Python dictionary using Boto3's TypeSerializer.

    Parameters:
    - input_dict (dict): The input Python dictionary to be serialized.

    Returns:
    - dict: The serialized dictionary with DynamoDB AttributeValues.

    Raises:
    - TypeError: If the input is not a dictionary or if serialization fails.

    Example:
    >>> input_dict = {'example_key': 'example_value'}
    >>> serialize(input_dict)
    {'example_key': {'S': 'example_value'}}
    """
    try:
        # Create an instance of Boto3's TypeSerializer
        serializer = TypeSerializer()

        # Use TypeSerializer to serialize each key-value pair in the input dictionary
        serialized_dict = {k: serializer.serialize(v) for k, v in input_dict.items()}

        return serialized_dict

    except Exception as e:
        # Handle serialization errors
        raise TypeError(f"Failed to serialize dictionary: {str(e)}")
