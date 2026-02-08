import importlib


def class_for_name(module_name, class_name):
    """Imports a class based on a provided string
    i.e ->
            :module_name = roles
            :class_name = citizen
    Result: from roles.citizen import Citizen
    """
    m = importlib.import_module(module_name)
    c = getattr(m, class_name)
    return c
