from datetime import datetime, timedelta

import boto3
import os

from jose import jwt

SST_APP = os.getenv("SST_APP")
SST_STAGE = os.getenv("SST_STAGE")
ssm = boto3.client("ssm")

def _get_session_private_key():
    parameter = ssm.get_parameter(
        Name=f"/sst/{SST_APP}/{SST_STAGE}/Auth/privateKey", WithDecryption=True
    )
    return parameter["Parameter"]["Value"]

def _get_session_public_key():
    parameter = ssm.get_parameter(
        Name=f"/sst/{SST_APP}/{SST_STAGE}/Auth/publicKey", WithDecryption=True
    )
    return parameter["Parameter"]["Value"]

def generate_tokenset(claims: dict, expiry_days: int=7):
    '''
        Generate a JWT tokenset
    '''
    expiration_time = datetime.utcnow() + timedelta(days=7)
    claims['exp'] = expiration_time
    
    encoded = jwt.encode(claims, 'secret', algorithm='HS256')
    return {
        'access_token': encoded,
        # 'refresh_token': 'Unknown'
    }


def validate_token():
    pass