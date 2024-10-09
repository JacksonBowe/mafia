from typing import Optional, Literal, Self

from aws_lambda_powertools.utilities.parser import BaseModel, model_validator
from core.utils import new_id, timestamp

from core.tables import UserTable
from core.realtime import publish_iot, RealtimeEvent


class MessageSender(BaseModel):
    id: str
    username: str


class Message(BaseModel):
    id: str
    timestamp: int
    content: str
    target: Optional[str] = None
    type: Literal["GLOBAL", "LOBBY", "PRIVATE", "SYSTEM"] = "GLOBAL"
    sender: Optional[MessageSender] = None

    @model_validator(mode="after")
    def validate_target(self) -> Self:
        if self.type == "LOBBY" and not self.target:
            raise ValueError("Target is required for lobby messages")
        if self.type == "PRIVATE" and not self.target:
            raise ValueError("Target is required for private messages")

        if self.type in ["GLOBAL", "LOBBY", "PRIVATE"] and not self.sender:
            raise ValueError(
                "Sender is required for GLOBAL, LOBBY and PRIVATE messages"
            )

        return self


def send_message(
    content: str,
    target: Optional[str] = None,
    type: Literal["GLOBAL", "LOBBY", "PRIVATE", "SYSTEM"] = "GLOBAL",
    sender: Optional[UserTable.Entities.User] = None,
) -> None:
    msg = Message(
        id=new_id(),
        timestamp=timestamp(),
        content=content,
        target=target,
        type=type,
        sender={"id": sender.id, "username": sender.username} if sender else None,
    )

    publish_iot("chat", RealtimeEvent.CHAT_MESSAGE, msg.model_dump(exclude_none=True))
    return
