import boto3
import os

SST_APP = os.getenv("SST_APP")
SST_STAGE = os.getenv("SST_STAGE")
ssm = boto3.client("ssm")

def get_secret(name):
    print(f"/sst/{SST_APP}/{SST_STAGE}/Secret/{name}/value")
    parameter = ssm.get_parameter(
        Name=f"/sst/{SST_APP}/{SST_STAGE}/Secret/{name}/value", WithDecryption=True
    )
    return parameter["Parameter"]["Value"]