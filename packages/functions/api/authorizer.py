import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
from typing import Mapping
from enum import Enum, auto
import json
from core.utils import Session
    
DENY_POLICY = {
    "principalId": "abc123",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "execute-api:Invoke",
                "Effect": "Deny",
                "Resource": "*"
            }
        ]
    },
    "context": {},
    "usageIdentifierKey": "{api-key}"
}

ALLOW_POLICY = {
    "principalId": "abc123",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "execute-api:Invoke",
                "Effect": "Allow",
                "Resource": "*"
            }
        ]
    },
    "context": {},
    "usageIdentifierKey": "{api-key}"
}

class AuthMethods(Enum):
    TOKEN = auto()

def parse_headers(headers:Mapping[str, str]):
    '''
    Ensure that the event contains valid Auth token
    '''
    for h, v in headers.items():
        if h == 'authorization' and v.split(' ')[0] == 'Bearer' and len(v.split(' ')) == 2:
            return AuthMethods.TOKEN
        
    return
    

def handler(event, context):
    # print(json.dumps(event, indent=4))
    
    auth_type = parse_headers(event['headers'])
    if not auth_type: return DENY_POLICY
    
    if auth_type == AuthMethods.TOKEN:
        print('yo')
    return ALLOW_POLICY