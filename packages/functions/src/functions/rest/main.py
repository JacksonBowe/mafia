import json
import os
from typing import Callable

# This is because Python was created by people with brain rot
if os.getenv("PYTEST"):
    from . import (
        auth,
        authorizer,
        chat,
        lobbies,
        users,
    )  # When Python is running "normally"
else:
    # When Python is being invoked via SST
    import auth
    import authorizer
    import chat
    import lobbies
    import users

from aws_lambda_powertools.event_handler import (
    APIGatewayHttpResolver,
    Response,
    content_types,
)
from aws_lambda_powertools.event_handler.openapi.exceptions import (
    RequestValidationError,
)
from aws_lambda_powertools.event_handler.exceptions import UnauthorizedError
from aws_lambda_powertools.logging import Logger
from aws_lambda_powertools.middleware_factory import NextMiddleWare
from aws_lambda_powertools.middleware_factory import lambda_handler_decorator
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()

app = APIGatewayHttpResolver(enable_validation=True)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(lobbies.router)
app.include_router(chat.router)


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


@app.exception_handler(UnauthorizedError)
def handle_unauthorized_error(ex: UnauthorizedError):
    logger.error("Unauthorized", error=str(ex))

    return Response(
        status_code=401,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps({"statusCode": 401, "message": "Unauthorized"}),
    )


@lambda_handler_decorator
def middleware_handler(
    handler: Callable[[dict, LambdaContext], dict], event: dict, context: LambdaContext
) -> dict:
    if authorizer.is_authorized(event):
        print("Authorized")
        return handler(event, context)
    else:
        print("here")
        raise UnauthorizedError("Unauthorized")

    return handler(event, context)

def middleware_authorizer(app: APIGatewayHttpResolver, next_middleware: NextMiddleWare)


@middleware_handler
def handler(event, context):
    return app.resolve(event, context)
