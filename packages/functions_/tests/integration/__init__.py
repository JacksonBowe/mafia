from dataclasses import dataclass

import pytest

def lambda_event(route, body: dict = None, path: dict = None, query: dict = None, authorizer_fields: dict=None):
    event = {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": route,
        "rawQueryString": "parameter1=value1&parameter1=value2&parameter2=value",
        "queryStringParameters": {
            "parameter1": "value1,value2",
            "parameter2": "value"
        },
        "requestContext": {
            "authorizer": {
                "lambda": authorizer_fields or {}
            },
            "http": {
                "method": "POST",
                "path": route,
                },
        },
        "body": body,
        "pathParameters": path or {}
        }
    return event


