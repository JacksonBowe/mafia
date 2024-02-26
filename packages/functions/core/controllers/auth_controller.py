import os
from enum import Enum, auto
from datetime import datetime, timedelta, UTC

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
        SessionTable.Entities.Session(
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