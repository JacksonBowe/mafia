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

ENDPOINTS = [
    # UserController
    ('GET', 'users'),
    ('GET', 'users/*'),
    # LobbyController
    ('POST', 'lobbies'),
    ('GET', 'lobbies'),
    # ('GET', 'lobbies/*'),
    # ('POST', 'lobbies/*/join'),
    # ('POST', 'lobbies/leave'),
    # ('POST', 'lobbies/start'),
    # ('GET', 'games'),
    # ('GET', 'games/actor'),
    # ('POST', 'games/vote'),
    # ('POST', 'games/verdict'),
    # ('POST', 'games/targets'),
    # ChatController
    # ('POST', 'chat'),
    # ('POST', 'games/chat')
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

def build_allow_policy(caller_id, resources):
    ALLOW_POLICY = {
        "principalId": "abc123",
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": "Allow",
                    "Resource": f"arn:aws:execute-api:*:*:*/*/{resource[0]}/{resource[1].replace('{userID}', caller_id)}"
                } for resource in resources
            ]

        },
        "context": {
            'CallerID': caller_id
        },
        # "usageIdentifierKey": "{api-key}"
    }
    return ALLOW_POLICY
    

def handler(event, context):
    
    auth_type, auth_key = parse_headers(event['headers'])
    if not auth_type: return DENY_POLICY
    
    if auth_type == Session.AuthMethods.TOKEN:
        claims = Session.validate_token(auth_key)
        
        # This is a wasted database call, but it ensures that the user is in the database
        user = UserController.get_user_by_id(claims['sub'])
        return build_allow_policy(user.id, ENDPOINTS)
    
    return DENY_POLICY
        