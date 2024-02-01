import os
if os.getenv('IS_LOCAL'):
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
from core.utils import Session
    
DENY_POLICY = {
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

def handler(event, context):
    print(event)
    print(context)
    
    return DENY_POLICY