# import os

# if os.getenv("IS_LOCAL"):
#     import sys

#     sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aws_lambda_powertools.event_handler.router import APIGatewayHttpRouter
from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from core.controllers import UserController
from core.tables import UserTable

# app = APIGatewayHttpResolver(enable_validation=True)

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
