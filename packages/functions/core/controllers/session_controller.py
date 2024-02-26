import os
from enum import Enum, auto
from datetime import datetime, timedelta, UTC

import boto3

from jose import jwt
from jose.exceptions import JWTError
from aws_lambda_powertools.utilities import parameters

SST_APP = os.getenv("SST_APP")
SST_STAGE = os.getenv("SST_STAGE")

ssm = boto3.client("ssm")

class AuthMethods(Enum):
    TOKEN = auto()
    
