import os
from typing import Literal

from aws_lambda_powertools.event_handler.router import APIGatewayHttpRouter
from aws_lambda_powertools.utilities.parser import BaseModel
from core.controllers import ChatController, UserController

os.environ["POWERTOOLS_SERVICE_NAME"] = "messages"
router = APIGatewayHttpRouter()


class SendMessagePayload(BaseModel):
    content: str
    target: str
    type: Literal["GLOBAL", "LOBBY", "PRIVATE"]

    # @model_validator(mode="after")
    # def validate_target(self) -> Self:
    #     if self.type == "LOBBY" and not self.target:
    #         raise ValueError("Target is required for lobby messages")
    #     if self.type == "PRIVATE" and not self.target:
    #         raise ValueError("Target is required for private messages")

    #     return self


@router.post("/chat/message")
def send_message(payload: SendMessagePayload) -> None:
    user_id = router.context.get("caller_id")
    user = UserController.get_user_by_id(user_id)

    ChatController.send_message(
        content=payload.content, target=payload.target, type=payload.type, sender=user
    )
    return
