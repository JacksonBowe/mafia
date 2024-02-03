import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
from typing import Mapping
import json
from core.controllers import UserController
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

ENDPOINTS = [
    # UserController
    ('GET', 'user'),
    ('GET', 'user/*'),
    # LobbyController
    ('POST', 'lobby'),
    ('GET', 'lobby/list'),
    ('GET', 'lobby/*'),
    ('POST', 'lobby/*/join'),
    ('POST', 'lobby/leave'),
    ('POST', 'lobby/start'),
    ('GET', 'game'),
    ('GET', 'game/actor'),
    ('POST', 'game/vote'),
    ('POST', 'game/verdict'),
    ('POST', 'game/targets'),
    # ChatController
    ('POST', 'chat'),
    ('POST', 'game/chat')
]

ADMIN_ENDPOINTS = [
    # UserController
    # LobbyController
    ('POST', 'lobby/*/terminate')
]

def parse_headers(headers:Mapping[str, str]):
    '''
    Ensure that the event contains valid Auth token
    '''
    for h, v in headers.items():
        if h == 'authorization' and v.split(' ')[0] == 'Bearer' and len(v.split(' ')) == 2:
            return Session.AuthMethods.TOKEN, v.split(' ')[1] # Return the access token
        # elif API_KEY_METHOD
        
    return
    

def handler(event, context):
    # print(json.dumps(event, indent=4))
    
    auth_type, auth_key = parse_headers(event['headers'])
    if not auth_type: return DENY_POLICY
    
    if auth_type == Session.AuthMethods.TOKEN:
        print('yo')
        claims = Session.validate_token(auth_key)
        print(claims)
        
        user = UserController.get_user_by_id(claims['sub'])
        
        print(user)
        
        
    return ALLOW_POLICY