import os

if os.getenv("IS_LOCAL"):
    import sys

    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.tables import UserTable
from core.utils import Dynamo


def handler(event, context):
    for i in range(1, 16):
        user = UserTable.Entities.User(
            id=f"seeded-user-{i}",
            createdAt=Dynamo.timestamp(),
            username=f"User {i}",
            provider="seed",
            avatar="https://cdn.quasar.dev/img/boy-avatar.png",
            lastLogin=Dynamo.timestamp(),
        )

        UserTable.table.put_item(Item=user.serialize())

        print("Seeded user", i)
    return event
