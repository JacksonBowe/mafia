import uuid
from datetime import datetime, UTC
from typing import Mapping
from enum import Enum

import boto3
from boto3.dynamodb.types import TypeSerializer

ddb = boto3.resource('dynamodb')

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
    '''
    Constructs the update expression for ddb update_item()
    Input of params = { 'att1': 'val1', 'att2.sub1': 'val2', 'att3': None }
    becomes ->
        update_expression = set #att1=#att1, #att2.#sub1=:att2sub1  remove #att3
        update_names = { '#att1': 'att1', '#att2': 'att2', '#sub1': 'sub1', '#att3': 'att3 }
        update_values = { ':att1': 'val1', ':att2sub1': 'val2}
        
    returned as (update_expression, update_names, update_values)
    '''
    set_expression = []
    remove_expression = []
    update_names = dict()
    update_values = dict()
    
    # For each key in the map, alias it
    for full_key, val in params.items():
        parts = full_key.split('.')
        for part in parts:
            key = part
            
            update_names[f'#{key}'] = key # To avoid 'reserved word' conflicts
            
        full_key_hash = '#' + full_key.replace('.', '.#') # convert 'attr1.sub1' to '#attr1.#sub1'
        full_key_val = ':' + full_key.replace('.', '') # convert 'attr1.sub1' to ':attr1.:sub1'
        
        if val is not None:
            # SET new values
            if not set_expression: set_expression.append('set ')
            set_expression.append(f" {full_key_hash}={full_key_val},")
            update_values[f"{full_key_val}"] = val # To avoid 'reserved word' conflicts
            
        elif val is None:
            # REMOVE values
            if not remove_expression: remove_expression.append('remove ')
            remove_expression.append(f" {full_key_hash},")
    
    update_expression =  "".join(set_expression)[:-1] + "  " + "".join(remove_expression)[:-1]
    return update_expression, update_names, update_values

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
    
