import { SSTConfig } from "sst";
import { MLambdaLayers } from "./stacks/LambdaLayers";
import { MApi } from "./stacks/Api";


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
	
		app.stack(MLambdaLayers).stack(MApi)


  },
} satisfies SSTConfig;
