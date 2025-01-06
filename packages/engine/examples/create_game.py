import engine

from _ import dummy_config, dummy_players


def create():
    players = dummy_players(3)
    config = dummy_config(
        roles=["Citizen", "Bodyguard", "Mafioso"]
    )  # If no roles provided it will use all roles

    game = engine.new_game(players, config)

    print("Game created with the following actors:")
    for actor in game.actors:
        print(actor.dump_state())

    print()
    print("Game created with the following state:")
    print(game.dump_state())


if __name__ == "__main__":
    create()
