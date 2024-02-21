import os

import pytest

from tests.conftest import infra, lambda_context

@pytest.fixture
def test_discord_post_auth_create_user(infra):
    from core.controllers import UserController
    from core.utils.auth import DiscordUser
    
    d_user = DiscordUser(
        id="1234-test-user",
        avatar="avatar",
        username="TestUser"
    )
    
    response = UserController.discord_post_auth_create_user(d_user)
    
    assert response['ResponseMetadata']['HTTPStatusCode'] == 200, response
    
@pytest.fixture
def test_get_user_by_id(test_discord_post_auth_create_user):
    from core.controllers import UserController
    
    user = UserController.get_user_by_id('1234-test-user')
    
    assert user is not None, 'Failed to get user by id'
    
    return user
    
def test_discord_post_auth_update_user(test_get_user_by_id):
    from core.controllers import UserController
    from core.utils.auth import DiscordUser
    
    user = UserController.get_user_by_id('1234-test-user')
    
    d_user = DiscordUser(
        id="1234-test-user",
        avatar="avatar",
        username="TestUser"
    )
    
    response = UserController.discord_post_auth_update_user(user, d_user)
    
    assert response['ResponseMetadata']['HTTPStatusCode'] == 200, response    

# def test_get_users(infra, seeded_user_table):
#     print('Here')