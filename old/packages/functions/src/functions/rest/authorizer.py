import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Tuple
from fnmatch import fnmatch

from aws_lambda_powertools.utilities.data_classes import event_source
from aws_lambda_powertools.utilities.data_classes.api_gateway_authorizer_event import (
    APIGatewayAuthorizerRequestEvent,
    APIGatewayAuthorizerResponse,
)
from core.controllers import AuthController

DENY_POLICY = {
    "principalId": "abc123",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {"Action": "execute-api:Invoke", "Effect": "Deny", "Resource": "*"}
        ],
    },
    "context": {},
    "usageIdentifierKey": "{api-key}",
}

UNAUTHORIZED = "Unauthorized"

NOAUTH_ENDPOINTS = [
    ("GET", "/auth/authorize/discord"),
    ("POST", "/auth/token/discord"),
    ("POST", "/auth/token/refresh"),
]

AUTH_ENDPOINTS = [
    # UserController
    # ("ANY", "/"),
    ("GET", "/users"),
    ("GET", "/users/*"),
    # LobbyController
    ("POST", "/lobbies"),
    ("GET", "/lobbies"),
    ("GET", "/lobbies/*"),
    ("POST", "/lobbies/*/join"),
    ("POST", "/lobbies/leave"),
    # ('POST', 'lobbies/start'),
    # ('GET', 'games'),
    # ('GET', 'games/actor'),
    # ('POST', 'games/vote'),
    # ('POST', 'games/verdict'),
    # ('POST', 'games/targets'),
    # MessageController
    ("POST", "/chat/message"),
    # ('POST', 'games/chat')
    # ("POST", "lobbies/terminate"),
    # ("POST", "lobbies/*/terminate"),
]

ADMIN_AUTH_ENDPOINTS = [
    # UserController
    # LobbyController
    ("POST", "/lobbies/terminate"),
    ("POST", "/lobby/*/terminate"),
]


def extract_authentication_credentials(
    event: APIGatewayAuthorizerRequestEvent,
) -> Tuple[str, str]:
    """
    Ensure that the event contains valid Auth token or API key
    """
    authorization_header = event.headers.get("Authorization")
    if authorization_header:
        auth_parts = authorization_header.split(" ")
        if len(auth_parts) == 2 and auth_parts[0] == "Bearer":
            return AuthController.AuthMethods.TOKEN, auth_parts[1]

    api_key_header = event.headers.get("X-API-KEY")
    if api_key_header:
        # TODO: Add API Key method
        return AuthController.AuthMethods.API_KEY, api_key_header

    return None, None


# TODO: DEPRECATED - This is from when we were using ApiGateway. May need to revert in future
@event_source(data_class=APIGatewayAuthorizerRequestEvent)
def handler(event: APIGatewayAuthorizerRequestEvent, context):
    arn = event.parsed_arn
    # Determine the authentication method
    auth_type, auth_key = extract_authentication_credentials(event)
    if not auth_type:
        raise Exception("Unauthorized")

    if auth_type == AuthController.AuthMethods.TOKEN:
        # Token-based authentication
        claims = AuthController.validate_token(auth_key)
        if not claims:
            raise Exception("Unauthorized")

        # Ensure that user exists in database
        # user = UserController.get_user_by_id(claims['sub'])
        # if not user: raise InternalServerError("User no longer exists in database")

        policy = APIGatewayAuthorizerResponse(
            principal_id=claims["sub"],
            context={"CallerID": claims["sub"]},
            region=arn.region,
            aws_account_id=arn.aws_account_id,
            api_id=arn.api_id,
            stage=arn.stage,
        )

        # Construct the policy
        for method, resource in AUTH_ENDPOINTS:
            policy.allow_route(method, resource)

        return policy.asdict()

    raise Exception("Unauthorized")


def is_authorized(event: dict) -> Tuple[bool, dict]:
    # TODO: Implement some route protection
    event = APIGatewayAuthorizerRequestEvent(event)

    try:
        method, path = event["requestContext"]["http"]["method"], event["rawPath"]
    except KeyError:
        return False, None

    if (method, path) in NOAUTH_ENDPOINTS:
        return True, None

    # Determine the authentication method
    auth_type, auth_key = extract_authentication_credentials(event)
    if not auth_type:
        return False, None

    if auth_type == AuthController.AuthMethods.TOKEN:
        # Token-based authentication
        claims = AuthController.validate_token(auth_key)
        if not claims:
            return False, None

        return True, claims

    return False
