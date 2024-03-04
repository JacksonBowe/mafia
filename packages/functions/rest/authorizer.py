import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
from typing import Mapping, Tuple
import json
from aws_lambda_powertools.utilities.data_classes import event_source
from aws_lambda_powertools.event_handler.exceptions import (
    InternalServerError
)
from aws_lambda_powertools.utilities.data_classes.api_gateway_authorizer_event import (
    DENY_ALL_RESPONSE,
    APIGatewayAuthorizerRequestEvent,
    APIGatewayAuthorizerResponse,
)
from core.controllers import AuthController, UserController
# from core.utils import Session
    
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

UNAUTHORIZED = "Unauthorized"

ENDPOINTS = [
    # UserController
    ('GET', 'users'),
    ('GET', 'users/*'),
    # LobbyController
    ('POST', 'lobbies'),
    ('GET', 'lobbies'),
    ('GET', 'lobbies/*'),
    # ('POST', 'lobbies/*/join'),
    ('POST', 'lobbies/leave'),
    # ('POST', 'lobbies/start'),
    # ('GET', 'games'),
    # ('GET', 'games/actor'),
    # ('POST', 'games/vote'),
    # ('POST', 'games/verdict'),
    # ('POST', 'games/targets'),
    # ChatController
    # ('POST', 'chat'),
    # ('POST', 'games/chat')
    ('POST', 'lobbies/*/terminate')
]

ADMIN_ENDPOINTS = [
    # UserController
    # LobbyController
    ('POST', 'lobby/*/terminate')
]

def extract_authentication_credentials(event: APIGatewayAuthorizerRequestEvent) -> Tuple[str, str]:
    '''
    Ensure that the event contains valid Auth token or API key
    '''
    authorization_header = event.get_header_value('Authorization')
    if authorization_header:
        auth_parts = authorization_header.split(' ')
        if len(auth_parts) == 2 and auth_parts[0] == 'Bearer':
            return AuthController.AuthMethods.TOKEN, auth_parts[1]

    api_key_header = event.get_header_value('X-API-KEY')
    if api_key_header:
        return AuthController.AuthMethods.API_KEY, api_key_header

    return None, None
    
@event_source(data_class=APIGatewayAuthorizerRequestEvent)
def handler(event: APIGatewayAuthorizerRequestEvent, context):
    arn = event.parsed_arn
    
    # Determine the authentication method
    auth_type, auth_key = extract_authentication_credentials(event)
    if not auth_type: raise Exception("Unauthorized")
    
    if auth_type == AuthController.AuthMethods.TOKEN:
        # Token-based authentication
        claims = AuthController.validate_token(auth_key)
        if not claims: raise Exception("Unauthorized")
        
        # Ensure that user exists in database
        # user = UserController.get_user_by_id(claims['sub'])
        # if not user: raise InternalServerError("User no longer exists in database")
        
        policy = APIGatewayAuthorizerResponse(
            principal_id=claims['sub'],
            context={ 'CallerID': claims['sub'] },
            region=arn.region,
            aws_account_id=arn.aws_account_id,
            api_id=arn.api_id,
            stage=arn.stage,
        )
        
        # Construct the policy
        for method, resource in ENDPOINTS:
            policy.allow_route(method, resource)
            
        return policy.asdict()
    
    raise Exception("Unauthorized")
        