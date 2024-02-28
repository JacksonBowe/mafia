import os
from enum import Enum, auto
from datetime import datetime, timedelta, UTC
from typing import Literal

import boto3

from jose import jwt
from jose.exceptions import JWTError
from aws_lambda_powertools.utilities import parameters

from core.tables import SessionTable

SST_APP = os.getenv("SST_APP")
SST_STAGE = os.getenv("SST_STAGE")

ssm = boto3.client("ssm")

class AuthMethods(Enum):
    TOKEN = auto()

def _auth_private_key():
    return parameters.get_parameter(f"/sst/{SST_APP}/{SST_STAGE}/Auth/auth/privateKey", decrypt=True)

def _auth_public_key():
    return parameters.get_parameter(f"/sst/{SST_APP}/{SST_STAGE}/Auth/auth/publicKey", decrypt=True)

def generate_tokenset(claims: dict, access_expiry_days: int=7, refresh_expiry_days: int=28):
    '''
        Generate a JWT tokenset
    '''
    # Generate the tokens
    access_expiration_time = round((datetime.now(UTC) + timedelta(days=access_expiry_days)).timestamp() * 1000)
    claims['exp'] = access_expiration_time
    access_encoded = jwt.encode(claims, _auth_private_key(), algorithm='RS256')

    refresh_expiration_time = round((datetime.now(UTC) + timedelta(days=refresh_expiry_days)).timestamp() * 1000)
    claims['exp'] = refresh_expiration_time
    refresh_encoded = jwt.encode(claims, _auth_private_key(), algorithm='RS256')

    # Store them in the database
    SessionTable().table.put_item(
        Item=SessionTable.Entities.Session(
            userId=claims['sub'],
            accessToken=access_encoded,
            refreshToken=refresh_encoded,
            expiresAt=refresh_expiration_time
        ).serialize()
    )

    return {
        'AccessToken': access_encoded,
        'RefreshToken': refresh_encoded
    }

def validate_token(token: str, token_type: Literal['accessToken', 'refreshToken'] = 'accessToken'):
    '''
    Validate a JWT token
    '''
    try:
        claims = jwt.decode(token, _auth_public_key(), algorithms=['RS256'])
        # Check if 'exp' claim is present
        if 'exp' not in claims or not isinstance(claims['exp'], int):
            # TODO: Raise an error here
            print("Token does not have a valid expiration time.")
            return None

        # Check the token's expiration time
        current_time = datetime.now(UTC).timestamp() * 1000
        print('Current time', current_time)
        print('Expiration time', claims['exp'])
        print('Difference', current_time - claims['exp'])
        if current_time > claims['exp']:
            # TODO: Raise an error here
            print("Token has expired.")
            return None

        # Ensure that session is active
        session = get_session(claims['sub'])
        if not session or session[token_type] != token:
            # TODO: Raise an error here
            print("Token is revoked")
            print('Session', session['accessToken'])
            print('Token', token)
            print('Token type', token_type)
            return None

        return claims
    except JWTError as e:
        # Handle token validation error
        # TODO: Raise an error here
        print(f"Token validation error: {e}")
        return None

# def validate_access_token(token: str):
#     '''
#     Validate an access token
#     '''
#     claims = validate_token(token)

#     # Ensure that session exists in database
#     session = get_session(claims['sub'])
#     if not session or session['accessToken'] != token:
#         # TODO: Raise an error here
#         print("Token is revoked")
#         return None

#     print(session)



def get_session(user_id: str):
    '''
    Get a session from the database
    '''
    return SessionTable().table.get_item(
        Key={
            'userId': user_id
        }
    ).get('Item')