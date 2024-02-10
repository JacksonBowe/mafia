import os
import json

from typing import Type, Callable

import boto3
def create_event_builder(bus, validator, metadata):
    eb = boto3.client('events')
    def event(name, schema) {
        
    }