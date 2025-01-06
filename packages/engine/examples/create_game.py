import engine

from _ import dummy_config, dummy_users


def create():
    users = dummy_users(3)
    config = dummy_config(roles=["Citizen", "Bodyguard", "Mafioso"])

    game = engine.new_game(users, config)

    print("Game created with the following actors:")
    for actor in game.actors:
        print(actor.dump_state())

    print()
    print("Game created with the following state:")
    print(game.dump_state())


if __name__ == "__main__":
    create()
