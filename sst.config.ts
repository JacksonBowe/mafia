import { SSTConfig } from "sst";
import { MLambdaLayers } from "./stacks/LambdaLayers";
import { MApi } from "./stacks/Api";
import { MSite } from "./stacks/Site";
import { MStorage } from "./stacks/Storage";


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
	
		app.stack(MLambdaLayers).stack(MStorage).stack(MApi).stack(MSite)


  },
} satisfies SSTConfig;
