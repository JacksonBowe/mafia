import json
import os

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
from aws_lambda_powertools.event_handler.exceptions import UnauthorizedError
from aws_lambda_powertools.event_handler.middlewares import NextMiddleware
from aws_lambda_powertools.event_handler.openapi.exceptions import (
    RequestValidationError,
)
from aws_lambda_powertools.logging import Logger

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


def middleware_authorizer(
    app: APIGatewayHttpResolver, next_middleware: NextMiddleware
) -> Response:
    authorized, claims = authorizer.is_authorized(app.current_event)
    if authorized:
        if claims:
            app.append_context(caller_id=claims["sub"])
        return next_middleware(app)
    else:
        raise UnauthorizedError("Unauthorized")


app.use(middlewares=[middleware_authorizer])


def handler(event, context):
    return app.resolve(event, context)
