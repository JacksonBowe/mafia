import { SSTConfig } from "sst";
import { LambdaLayers } from "./stacks/LambdaLayers";
import { API } from "./stacks/Api";
import { Site } from "./stacks/Site";
import { Storage } from "./stacks/Storage";
import { Events } from "./stacks/Events";


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
		});
	
		app.stack(LambdaLayers).stack(Storage).stack(Events).stack(API).stack(Site)


  },
} satisfies SSTConfig;
