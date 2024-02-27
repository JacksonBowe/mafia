from datetime import datetime, timedelta, UTC
from enum import Enum, auto

import boto3
import os

from jose import jwt
from jose.exceptions import JWTError


SST_APP = os.getenv("SST_APP")
SST_STAGE = os.getenv("SST_STAGE")
ssm = boto3.client("ssm")

class AuthMethods(Enum):
    TOKEN = auto()

def _get_session_private_key():
    parameter = ssm.get_parameter(
        Name=f"/sst/{SST_APP}/{SST_STAGE}/Auth/auth/privateKey", WithDecryption=True
    )
    return parameter["Parameter"]["Value"]

def _get_session_public_key():
    parameter = ssm.get_parameter(
        Name=f"/sst/{SST_APP}/{SST_STAGE}/Auth/auth/publicKey", WithDecryption=True
    )
    return parameter["Parameter"]["Value"]

def generate_tokenset(claims: dict, access_expiry_days: int=7, refresh_expiry_days: int=28):
    '''
        Generate a JWT tokenset
    '''
    # Generate the tokens
    access_expiration_time = round((datetime.now(UTC) + timedelta(days=access_expiry_days)).timestamp() * 1000)
    claims['exp'] = access_expiration_time
    access_encoded = jwt.encode(claims, _get_session_private_key(), algorithm='RS256')
    
    refresh_expiration_time = round((datetime.now(UTC) + timedelta(days=refresh_expiry_days)).timestamp() * 1000)
    print(refresh_expiration_time)
    claims['exp'] = refresh_expiration_time
    refresh_encoded = jwt.encode(claims, _get_session_private_key(), algorithm='RS256')
    
    # Store them in the database
    # SessionTable.put_session(
    #     SessionTableEntities.Session(
    #         userId=claims['sub'],
    #         accessToken=access_encoded,
    #         refreshToken=refresh_encoded,
    #         expiresAt=refresh_expiration_time
    #     )
    # )
    
    return {
        'AccessToken': access_encoded,
        'RefreshToken': refresh_encoded
    }


def validate_token(token: str):
    '''
    Validate a JWT token
    '''
    try:
        decoded_token = jwt.decode(token, _get_session_public_key(), algorithms=['RS256'])
        
        # Check if 'exp' claim is present
        if 'exp' not in decoded_token or not isinstance(decoded_token['exp'], int):
            print("Token does not have a valid expiration time.")
            return None

        # Check the token's expiration time
        current_time = datetime.utcnow().timestamp()
        if current_time > decoded_token['exp']:
            print("Token has expired.")
            return None

        return decoded_token
    except JWTError as e:
        # Handle token validation error
        print(f"Token validation error: {e}")
        return None