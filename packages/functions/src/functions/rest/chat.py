import os
from typing import Optional, Literal, Self
from typing_extensions import Annotated

from aws_lambda_powertools.event_handler.router import APIGatewayHttpRouter
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError,
)
from aws_lambda_powertools.event_handler.openapi.params import Query
from aws_lambda_powertools.utilities.parser import BaseModel, model_validator

from core.controllers import AuthController, UserController, ChatController

os.environ["POWERTOOLS_SERVICE_NAME"] = "messages"
router = APIGatewayHttpRouter()


class SendMessagePayload(BaseModel):
    content: str
    target: Optional[str] = None
    type: Literal["GLOBAL", "LOBBY", "PRIVATE"] = "GLOBAL"

    @model_validator(mode="after")
    def validate_target(self) -> Self:
        if self.type == "LOBBY" and not self.target:
            raise ValueError("Target is required for lobby messages")
        if self.type == "PRIVATE" and not self.target:
            raise ValueError("Target is required for private messages")

        return self


@router.post("/chat/message")
def send_message(payload: SendMessagePayload) -> None:
    print("Sending a message")
    print(payload)

    user_id = router.current_event.request_context.authorizer.get_lambda["CallerID"]
    user = UserController.get_user_by_id(user_id)

    ChatController.send_message(
        content=payload.content, target=payload.target, type=payload.type, sender=user
    )
    return
