import { SSTConfig } from "sst";
import { LambdaLayers } from "./stacks/LambdaLayers";
import { Auth } from "./stacks/Auth";
import { API } from "./stacks/Api";
import { Site } from "./stacks/Site";
import { Storage } from "./stacks/Storage";
import { Events } from "./stacks/Events";
import { Spikes } from "./stacks/Spikes";


export default {
	config(_input) {
		return {
		name: "mafia",
		region: "ap-southeast-2",
		};
	},
  	stacks(app) {
		app.setDefaultFunctionProps({
		    runtime: "python3.12",
            copyFiles: [{ from: 'packages/functions/core', to: 'core'}]
		});

        
	
		app.stack(LambdaLayers).stack(Storage).stack(Events).stack(Auth).stack(API).stack(Site)

        app.stack(Spikes)
  },
} satisfies SSTConfig;
