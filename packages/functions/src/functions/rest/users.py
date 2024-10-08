import os

from aws_lambda_powertools.event_handler.router import APIGatewayHttpRouter
from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from core.controllers import UserController
from core.tables import UserTable

os.environ["POWERTOOLS_SERVICE_NAME"] = "auth"
router = APIGatewayHttpRouter()


@router.get("/users/me")
def get_me() -> UserTable.Entities.User:
    try:
        user_id = router.current_event.request_context.authorizer.get_lambda["CallerID"]
    except KeyError:
        raise BadRequestError("Missing CallerID")

    user = UserController.get_user_by_id(user_id)
    return user


@router.get("/users/<user_id>")
def get_user(user_id: str) -> UserTable.Entities.User:
    user = UserController.get_user_by_id(user_id)
    return user
