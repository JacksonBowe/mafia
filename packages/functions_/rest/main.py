import json
from aws_lambda_powertools.event_handler import (
    APIGatewayHttpResolver,
    Response,
    content_types,
)

from aws_lambda_powertools.event_handler.openapi.exceptions import (
    RequestValidationError,
)
from aws_lambda_powertools.logging import Logger

from . import users

logger = Logger()

app = APIGatewayHttpResolver(enable_validation=True)
app.include_router(users.router)


@app.exception_handler(RequestValidationError)
def handle_validation_error(ex: RequestValidationError):
    logger.error(
        "Request failed validation", path=app.current_event.path, errors=ex.errors()
    )

    return Response(
        status_code=422,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(
            {
                "statusCode": 422,
                "message": "Input validation error",
                "errors": [
                    {
                        "key": ".".join(error["loc"]),
                        "type": error["type"],
                        "input": error["input"],
                        "msg": error["msg"],
                    }
                    for error in ex.errors()
                ],
            }
        ),
    )


def handler(event: dict, context):
    return app.resolve(event, context)
