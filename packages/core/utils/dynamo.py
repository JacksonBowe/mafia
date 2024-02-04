import uuid
from datetime import datetime
from typing import Mapping

def new_id():
    return str(uuid.uuid4())

def timestamp():
    return round(int(datetime.utcnow().timestamp() * 1000))

# TODO: Add type hinting here
def build_update_expression(params: Mapping[str, str]):
    '''
    Constructs the update expression for ddb update_item()
    Input of params = { 'att1': 'val1', 'att2': 'val2' }
    becomes ->
        update_expression = set #att1=#att1, #att2=:att2
        update_names = { '#att1': 'att1', '#att2': 'att2' }
        update_values = { ':att1': 'val1', ':att2': 'val2}
        
    returned as (update_expression, update_names, update_values)
    '''
    set_expression = []
    remove_expression = []
    update_names = dict()
    update_values = dict()
    for key, val in params.items():
        update_names[f'#{key}'] = key # To avoid 'reserved word' conflicts
        
        if val is not None:
            # SET new values
            if not set_expression: set_expression.append('set ')
            set_expression.append(f' #{key}=:{key},')
            update_values[f':{key}'] = val # To avoid 'reserved word' conflicts
            
        elif val is None:
            # REMOVE values
            if not remove_expression: remove_expression.append('remove ')
            remove_expression.append(f' #{key},')
    
    update_expression =  "".join(set_expression)[:-1] + "  " + "".join(remove_expression)[:-1]
    return update_expression, update_names, update_values